import json
from textwrap import dedent
from urllib import error, request
from zoneinfo import ZoneInfo

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.ai_secrets import get_ai_api_key
from accounts.models import SiteSettings
from daily_log.models import LogEntry
from knowledgebase.models import Behavior

from .models import AIChatUsage

EMERGENCY_KEYWORDS = (
    "not breathing",
    "can't breathe",
    "cannot breathe",
    "stopped breathing",
    "unconscious",
    "won't wake",
    "wont wake",
    "collapsed",
    "overdose",
    "od",
    "seizure",
    "stroke",
    "chest pain",
    "bleeding",
    "weapon",
    "violent",
    "violence",
    "kill",
    "suicide",
    "911",
)

SAFETY_FALLBACK_ANSWER = dedent(
    """
    What may be happening
    This sounds like a possible emergency or immediate safety risk.

    Try this next
    - **Call emergency services now** if there is danger, trouble breathing, collapse, severe bleeding, overdose, chest pain, stroke signs, or the person cannot be awakened.
    - If it feels urgent but not immediately life-threatening, contact the clinician or urgent care right away.

    Words to try
    - “I’m here with you. I’m getting help now.”

    Safety check
    - Stay with the person and remove immediate hazards only if you can do so safely.
    - For caregiver support when emergency services are not the main next step, call the Alzheimer’s Association 24/7 Helpline at 800-272-3900.
    """
).strip()

SYSTEM_PROMPT = dedent(
    """
    You are CalmCompass AI, a dementia caregiving fallback assistant.

    The caregiver has already seen a static decoder response. Your job is to extend that guidance with one calm, practical, low-risk answer for the current situation.

    Rules:
    - Stay tightly focused on dementia caregiving and the behavior described.
    - Build on the static decoder guidance already shown. Do not contradict it casually.
    - Do not diagnose disease, declare a medical cause with certainty, or recommend medication changes.
    - Do not suggest restraints, punishment, threats, deception that increases fear, or unsafe actions.
    - If the caregiver asks for non-dementia topics, say you can only help with dementia caregiving support.
    - If there are signs of immediate danger, sudden medical change, violence, injury, overdose, breathing trouble, chest pain, stroke symptoms, or loss of consciousness, clearly tell the caregiver to seek emergency help.
    - Keep the tone calm, direct, practical, and compassionate.
    - Keep the whole answer brief and TL;DR-style. Aim for about 70 to 140 words total.
    - Use plain markdown formatting only when helpful: short bullets and a little bold for key actions or warnings.
    - Use flat bullets only. No nested bullets, no long paragraphs, and no intro or closing note.
    - Use exactly these headings and no others:
      What may be happening
      Try this next
      Words to try
      Safety check
    """
).strip()


class AIChatUnavailableError(Exception):
    def __init__(self, message, *, status_code, status_payload):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.status_payload = status_payload


class AIChatProviderError(Exception):
    pass


class AIChatService:
    OPENAI_URL = "https://api.openai.com/v1/responses"
    ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

    @classmethod
    def get_site_settings(cls):
        settings_obj, _ = SiteSettings.objects.get_or_create(pk=1)
        return settings_obj

    @classmethod
    def get_provider_and_model(cls, settings_obj):
        provider = (settings_obj.ai_provider or "").strip().lower()
        model = ""
        if provider == SiteSettings.AIProvider.OPENAI:
            model = (settings_obj.ai_model_openai or "").strip()
        elif provider == SiteSettings.AIProvider.ANTHROPIC:
            model = (settings_obj.ai_model_anthropic or "").strip()
        return provider, model

    @classmethod
    def get_used_queries(cls, user):
        usage = AIChatUsage.objects.filter(user=user).only("used_queries").first()
        return usage.used_queries if usage else 0

    @classmethod
    def get_status(cls, user):
        settings_obj = cls.get_site_settings()
        provider, model = cls.get_provider_and_model(settings_obj)
        used_queries = cls.get_used_queries(user)
        lifetime_cap = max(int(settings_obj.ai_fallback_lifetime_cap or 0), 0)
        remaining_queries = max(lifetime_cap - used_queries, 0)

        unavailable_reason = None
        if lifetime_cap == 0:
            unavailable_reason = "AI fallback is disabled right now."
        elif remaining_queries <= 0:
            unavailable_reason = "You have used all available AI fallback queries."
        elif provider not in {
            SiteSettings.AIProvider.OPENAI,
            SiteSettings.AIProvider.ANTHROPIC,
        }:
            unavailable_reason = "The AI provider is not configured."
        elif not model:
            unavailable_reason = "The AI model is not configured."
        elif not get_ai_api_key(settings_obj, provider):
            unavailable_reason = "The AI provider key is not configured on the server."

        return {
            "available": unavailable_reason is None,
            "remaining_queries": remaining_queries,
            "used_queries": used_queries,
            "lifetime_cap": lifetime_cap,
            "provider": provider,
            "model": model,
            "unavailable_reason": unavailable_reason,
        }

    @classmethod
    def ensure_available(cls, user):
        status_payload = cls.get_status(user)
        if status_payload["available"]:
            return status_payload

        status_code = 403
        if status_payload["unavailable_reason"] == "The AI provider is not configured.":
            status_code = 503
        elif status_payload["unavailable_reason"] == "The AI model is not configured.":
            status_code = 503
        elif (
            status_payload["unavailable_reason"]
            == "The AI provider key is not configured on the server."
        ):
            status_code = 503

        raise AIChatUnavailableError(
            status_payload["unavailable_reason"] or "AI fallback is unavailable.",
            status_code=status_code,
            status_payload=status_payload,
        )

    @classmethod
    def ask(cls, *, user, behavior_slug, question):
        status_payload = cls.ensure_available(user)
        behavior = get_object_or_404(
            Behavior.objects.select_related("category").filter(
                is_published=True,
                category__is_active=True,
            ),
            slug=behavior_slug,
        )
        normalized_question = (question or "").strip()

        if cls.is_emergency_question(normalized_question):
            return {
                **status_payload,
                "answer": SAFETY_FALLBACK_ANSWER,
                "source": "safety_fallback",
            }

        answer = cls._request_ai_response(
            provider=status_payload["provider"],
            model=status_payload["model"],
            api_key=get_ai_api_key(cls.get_site_settings(), status_payload["provider"]),
            system_prompt=SYSTEM_PROMPT,
            user_prompt=cls.build_user_prompt(
                user=user,
                behavior=behavior,
                question=normalized_question,
            ),
        )

        usage = cls.increment_usage(user)
        used_queries = usage.used_queries
        lifetime_cap = status_payload["lifetime_cap"]

        return {
            "available": max(lifetime_cap - used_queries, 0) > 0,
            "remaining_queries": max(lifetime_cap - used_queries, 0),
            "used_queries": used_queries,
            "lifetime_cap": lifetime_cap,
            "provider": status_payload["provider"],
            "model": status_payload["model"],
            "unavailable_reason": None
            if max(lifetime_cap - used_queries, 0) > 0
            else "You have used all available AI fallback queries.",
            "answer": answer,
            "source": "ai",
        }

    @classmethod
    def increment_usage(cls, user):
        with transaction.atomic():
            usage, _ = AIChatUsage.objects.select_for_update().get_or_create(user=user)
            usage.used_queries += 1
            usage.last_used_at = timezone.now()
            usage.save(update_fields=["used_queries", "last_used_at", "updated_at"])
        return usage

    @classmethod
    def build_user_prompt(cls, *, user, behavior, question):
        sections = [
            f"Care recipient\n{cls.get_care_recipient_label(user)}",
            (
                "Current behavior\n"
                f"Title: {behavior.title}\n"
                f"Category: {behavior.category.name}\n"
                f"Tags: {', '.join(behavior.tags or []) or 'None provided'}"
            ),
            (
                "Static decoder guidance already shown\n"
                "What's happening:\n"
                f"{behavior.whats_happening}\n\n"
                "What not to do:\n"
                f"{cls.format_bullets(behavior.what_not_to_do)}\n\n"
                "What to say:\n"
                f"{cls.format_bullets(behavior.what_to_say)}\n\n"
                "Why it works:\n"
                f"{behavior.why_it_works}\n\n"
                "Common triggers:\n"
                f"{cls.format_bullets(behavior.common_triggers)}\n\n"
                "Bonus tips:\n"
                f"{cls.format_bullets(behavior.bonus_tips)}"
            ),
            f"Caregiver question\n{question}",
            (
                "Recent daily log context (last 15 entries)\n"
                f"{cls.build_recent_daily_log_context(user)}"
            ),
        ]
        return "\n\n".join(sections)

    @classmethod
    def get_care_recipient_label(cls, user):
        care_recipient_name = (getattr(user, "care_recipient_name", "") or "").strip()
        if care_recipient_name:
            return care_recipient_name
        return "Not provided"

    @classmethod
    def format_bullets(cls, items):
        if not items:
            return "- None provided"
        return "\n".join(f"- {item}" for item in items if str(item).strip())

    @classmethod
    def build_recent_daily_log_context(cls, user):
        zoneinfo = cls.get_user_zoneinfo(user)
        mood_labels = LogEntry.mood_label_map()
        entries = list(
            LogEntry.objects.filter(user=user)
            .select_related("linked_behavior__category")
            .order_by("-created_at")[:15]
        )
        if not entries:
            return "No recent daily log entries."

        lines = []
        for index, entry in enumerate(entries, start=1):
            timestamp = timezone.localtime(entry.created_at, zoneinfo).strftime(
                "%Y-%m-%d %H:%M %Z"
            )
            parts = [
                f"{index}. {timestamp}",
                "Moods: "
                + ", ".join(mood_labels.get(mood, mood) for mood in entry.moods or []),
            ]
            if entry.linked_behavior:
                category_name = entry.linked_behavior.category.name
                parts.append(
                    "Linked behavior: "
                    + f"{entry.linked_behavior.title} ({category_name})"
                )
            if entry.note:
                parts.append(f"Note: {entry.note}")
            lines.append(" | ".join(parts))

        return "\n".join(lines)

    @classmethod
    def get_user_zoneinfo(cls, user):
        timezone_name = (getattr(user, "timezone", "") or "").strip() or "UTC"
        try:
            return ZoneInfo(timezone_name)
        except Exception:  # pragma: no cover - defensive fallback
            return ZoneInfo("UTC")

    @classmethod
    def is_emergency_question(cls, question):
        normalized_question = (question or "").strip().lower()
        return any(keyword in normalized_question for keyword in EMERGENCY_KEYWORDS)

    @classmethod
    def _read_response(cls, response):
        try:
            return json.loads(response.read().decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise AIChatProviderError("The AI provider returned malformed JSON.") from exc

    @classmethod
    def _request(cls, http_request):
        try:
            with request.urlopen(http_request, timeout=40) as response:
                return cls._read_response(response)
        except error.HTTPError as exc:
            message = exc.reason
            try:
                payload = json.loads(exc.read().decode("utf-8"))
                message = payload.get("error", {}).get("message") or payload.get(
                    "message"
                ) or message
            except Exception:
                pass
            raise AIChatProviderError(str(message)) from exc
        except error.URLError as exc:
            raise AIChatProviderError("Could not reach the AI provider.") from exc

    @classmethod
    def _request_ai_response(cls, *, provider, model, api_key, system_prompt, user_prompt):
        if provider == SiteSettings.AIProvider.OPENAI:
            return cls._request_openai(
                model=model,
                api_key=api_key,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
        if provider == SiteSettings.AIProvider.ANTHROPIC:
            return cls._request_anthropic(
                model=model,
                api_key=api_key,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
        raise AIChatProviderError("Unsupported AI provider.")

    @classmethod
    def _request_openai(cls, *, model, api_key, system_prompt, user_prompt):
        payload = {
            "model": model,
            "instructions": system_prompt,
            "input": user_prompt,
            "max_output_tokens": 260,
        }
        if cls._should_use_openai_reasoning(model):
            payload["reasoning"] = {"effort": "low"}
        http_request = request.Request(
            cls.OPENAI_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        response_payload = cls._request(http_request)
        output_text = cls._extract_openai_text(response_payload)
        if output_text:
            return output_text
        raise AIChatProviderError("The OpenAI response did not contain text.")

    @classmethod
    def _request_anthropic(cls, *, model, api_key, system_prompt, user_prompt):
        payload = {
            "model": model,
            "max_tokens": 260,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        http_request = request.Request(
            cls.ANTHROPIC_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            method="POST",
        )
        response_payload = cls._request(http_request)
        output_text = cls._extract_anthropic_text(response_payload)
        if output_text:
            return output_text
        raise AIChatProviderError("The Anthropic response did not contain text.")

    @classmethod
    def _should_use_openai_reasoning(cls, model):
        normalized_model = (model or "").strip().lower()
        return normalized_model.startswith(("gpt-5", "o1", "o3", "o4"))

    @classmethod
    def _extract_openai_text(cls, response_payload):
        direct_output_text = (response_payload.get("output_text") or "").strip()
        if direct_output_text:
            return direct_output_text

        collected_parts = []
        for item in response_payload.get("output", []):
            if not isinstance(item, dict):
                continue
            for content_part in item.get("content", []):
                if not isinstance(content_part, dict):
                    continue
                part_type = (content_part.get("type") or "").strip().lower()
                if part_type in {"output_text", "text"} and content_part.get("text"):
                    collected_parts.append(content_part["text"])

        return "\n".join(
            part.strip() for part in collected_parts if part and part.strip()
        ).strip()

    @classmethod
    def _extract_anthropic_text(cls, response_payload):
        collected_parts = []
        for item in response_payload.get("content", []):
            if not isinstance(item, dict):
                continue
            if (item.get("type") or "").strip().lower() == "text" and item.get("text"):
                collected_parts.append(item["text"])

        return "\n".join(
            part.strip() for part in collected_parts if part and part.strip()
        ).strip()

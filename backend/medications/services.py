from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.utils import timezone


WEEKDAY_VALUES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
WEEKDAY_LABELS = {
    "mon": "Mon",
    "tue": "Tue",
    "wed": "Wed",
    "thu": "Thu",
    "fri": "Fri",
    "sat": "Sat",
    "sun": "Sun",
}


def normalize_days_of_week(days_of_week):
    normalized = []
    seen = set()

    for day in days_of_week or []:
        value = str(day).strip().lower()
        if value and value not in seen:
            normalized.append(value)
            seen.add(value)

    return normalized


def get_user_zoneinfo(user):
    timezone_name = (getattr(user, "timezone", "") or "").strip() or "UTC"

    try:
        return ZoneInfo(timezone_name)
    except Exception:  # pragma: no cover - defensive fallback
        return ZoneInfo("UTC")


def build_schedule_summary(schedules):
    schedule_list = list(schedules or [])
    if not schedule_list:
        return ""

    schedule_type = schedule_list[0].schedule_type
    if schedule_type == "interval":
        interval_schedule = schedule_list[0]
        anchor_label = interval_schedule.anchor_time.strftime("%H:%M")
        return (
            f"Every {interval_schedule.interval_hours} hours starting at "
            f"{anchor_label}"
        )

    parts = []
    for schedule in sorted(
        schedule_list,
        key=lambda item: (item.time_of_day or datetime.min.time(), item.pk),
    ):
        time_label = schedule.time_of_day.strftime("%H:%M")
        if schedule.days_of_week:
            day_label = ", ".join(
                WEEKDAY_LABELS.get(day, day.title()) for day in schedule.days_of_week
            )
        else:
            day_label = "Every day"
        parts.append(f"{day_label} at {time_label}")
    return " • ".join(parts)


def get_medication_schedule_type(medication):
    schedules = list(getattr(medication, "prefetched_schedules", medication.schedules.all()))
    if not schedules:
        return ""
    return schedules[0].schedule_type


def _build_local_datetime(date_value, time_value, zoneinfo):
    return datetime.combine(date_value, time_value).replace(tzinfo=zoneinfo)


def _generate_fixed_occurrences(schedule, zoneinfo, window_start, window_end):
    local_start = timezone.localtime(window_start, zoneinfo)
    local_end = timezone.localtime(window_end, zoneinfo)
    start_date = local_start.date() - timedelta(days=1)
    end_date = local_end.date() + timedelta(days=1)
    allowed_days = set(schedule.days_of_week or WEEKDAY_VALUES)
    occurrences = []

    current_date = start_date
    while current_date <= end_date:
        weekday_value = WEEKDAY_VALUES[current_date.weekday()]
        if weekday_value in allowed_days:
            occurrence_local = _build_local_datetime(
                current_date,
                schedule.time_of_day,
                zoneinfo,
            )
            occurrence_utc = occurrence_local.astimezone(dt_timezone.utc)
            if window_start <= occurrence_utc <= window_end:
                occurrences.append(occurrence_utc)
        current_date += timedelta(days=1)

    return occurrences


def _generate_interval_occurrences(schedule, zoneinfo, window_start, window_end):
    local_start = timezone.localtime(window_start, zoneinfo)
    local_end = timezone.localtime(window_end, zoneinfo)
    interval_delta = timedelta(hours=schedule.interval_hours)
    current_local = _build_local_datetime(local_start.date(), schedule.anchor_time, zoneinfo)

    while current_local > local_start:
        current_local -= interval_delta
    while current_local + interval_delta <= local_start:
        current_local += interval_delta

    occurrences = []
    while current_local <= local_end:
        if current_local >= local_start:
            occurrences.append(current_local.astimezone(dt_timezone.utc))
        current_local += interval_delta

    return occurrences


def generate_schedule_occurrences(schedule, zoneinfo, window_start, window_end):
    if schedule.schedule_type == "fixed":
        return _generate_fixed_occurrences(schedule, zoneinfo, window_start, window_end)
    return _generate_interval_occurrences(schedule, zoneinfo, window_start, window_end)


def generate_expected_doses(medication, window_start, window_end):
    zoneinfo = get_user_zoneinfo(medication.user)
    schedules = list(getattr(medication, "prefetched_schedules", medication.schedules.all()))
    occurrences = []
    seen = set()

    for schedule in schedules:
        for occurrence in generate_schedule_occurrences(
            schedule,
            zoneinfo,
            window_start,
            window_end,
        ):
            cache_key = occurrence.isoformat()
            if cache_key not in seen:
                occurrences.append(occurrence)
                seen.add(cache_key)

    return sorted(occurrences)

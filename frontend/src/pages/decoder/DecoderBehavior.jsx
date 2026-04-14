import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Brain,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { askAI, getAIStatus } from '@/services/aiChat'
import { getBehaviorDetail, recordBehaviorView } from '@/services/knowledgebase'

const AI_HELPLINE_LABEL = 'Alzheimer’s Association 24/7 Helpline: 800-272-3900'

function extractAIStatus(payload) {
  if (!payload) {
    return null
  }

  return {
    available: Boolean(payload.available),
    remaining_queries: Number(payload.remaining_queries ?? 0),
    used_queries: Number(payload.used_queries ?? 0),
    lifetime_cap: Number(payload.lifetime_cap ?? 0),
    provider: payload.provider || '',
    model: payload.model || '',
    unavailable_reason: payload.unavailable_reason || null,
  }
}

function AIAnswerCard({ answer, source }) {
  if (!answer) {
    return null
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          AI response
        </p>
        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
          {source === 'safety_fallback' ? 'Safety fallback' : 'AI'}
        </Badge>
      </div>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{answer}</div>
    </div>
  )
}

function DecoderSection({ icon: Icon, label, title, children, tone = 'slate' }) {
  const toneClasses = {
    slate: 'bg-slate-50 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
  }

  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <div className="flex items-start gap-4">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone] || toneClasses.slate}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-5 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  )
}

function ListBlock({ items, ordered = false }) {
  if (!items?.length) {
    return null
  }

  if (ordered) {
    return (
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-3">
          <span className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function BehaviorNotFound() {
  return (
    <div className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        Behavior not found
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        That decoder response is not available.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Return to the decoder to search again or browse another category.
      </p>
      <div className="mt-5">
        <Button asChild className="rounded-full px-6">
          <Link to="/decoder">Back to decoder</Link>
        </Button>
      </div>
    </div>
  )
}

export default function DecoderBehavior() {
  const { slug } = useParams()
  const [behavior, setBehavior] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [aiStatus, setAIStatus] = useState(null)
  const [aiStatusLoading, setAIStatusLoading] = useState(true)
  const [aiQuestion, setAIQuestion] = useState('')
  const [aiAnswer, setAIAnswer] = useState(null)
  const [aiRequestError, setAIRequestError] = useState('')
  const [aiSubmitting, setAISubmitting] = useState(false)
  const trackedSlugRef = useRef('')

  useEffect(() => {
    let cancelled = false

    const loadBehavior = async () => {
      setLoading(true)
      setErrorStatus(null)
      setErrorMessage('')
      trackedSlugRef.current = ''

      try {
        const response = await getBehaviorDetail(slug)
        if (!cancelled) {
          setBehavior(response)
        }
      } catch (error) {
        if (!cancelled) {
          setBehavior(null)
          setErrorStatus(error.response?.status || 500)
          setErrorMessage(
            error.response?.data?.detail || 'The decoder response could not be loaded.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadBehavior()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!behavior?.slug || trackedSlugRef.current === behavior.slug) {
      return
    }

    trackedSlugRef.current = behavior.slug
    void recordBehaviorView(behavior.slug).catch(() => {})
  }, [behavior])

  useEffect(() => {
    let cancelled = false

    const loadAIStatus = async () => {
      setAIStatusLoading(true)
      setAIRequestError('')
      setAIAnswer(null)
      setAIQuestion('')

      try {
        const response = await getAIStatus()
        if (!cancelled) {
          setAIStatus(extractAIStatus(response))
        }
      } catch (error) {
        if (!cancelled) {
          setAIStatus({
            available: false,
            remaining_queries: 0,
            used_queries: 0,
            lifetime_cap: 0,
            provider: '',
            model: '',
            unavailable_reason:
              error.response?.data?.detail || 'AI fallback could not be checked right now.',
          })
        }
      } finally {
        if (!cancelled) {
          setAIStatusLoading(false)
        }
      }
    }

    loadAIStatus()

    return () => {
      cancelled = true
    }
  }, [slug])

  const handleAskAI = async () => {
    const normalizedQuestion = aiQuestion.trim()
    if (!normalizedQuestion || !behavior?.slug || !aiStatus?.available) {
      return
    }

    setAISubmitting(true)
    setAIRequestError('')

    try {
      const response = await askAI({
        behavior_slug: behavior.slug,
        question: normalizedQuestion,
      })
      setAIAnswer({
        answer: response.answer,
        source: response.source,
      })
      setAIStatus(extractAIStatus(response))
    } catch (error) {
      const payload = error.response?.data
      setAIRequestError(
        payload?.detail || 'AI fallback could not respond right now. Please try again shortly.'
      )
      if (payload && typeof payload === 'object' && 'remaining_queries' in payload) {
        setAIStatus(extractAIStatus(payload))
      }
    } finally {
      setAISubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-[1.8rem] border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading decoder response...
        </div>
      </div>
    )
  }

  if (errorStatus === 404) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <BehaviorNotFound />
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[1.8rem] border border-amber-200 bg-amber-50 px-6 py-6 text-sm leading-7 text-amber-900">
          {errorMessage}
        </div>
      </div>
    )
  }

  const aiUnavailable = Boolean(aiStatus && !aiStatus.available)
  const aiCapReached =
    Boolean(aiStatus) &&
    aiStatus.lifetime_cap > 0 &&
    aiStatus.remaining_queries <= 0 &&
    aiStatus.unavailable_reason
  const showAIHelpline = aiUnavailable || aiAnswer?.source === 'safety_fallback'

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" className="rounded-full">
            <Link to={behavior?.category?.slug ? `/decoder/${behavior.category.slug}` : '/decoder'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {behavior?.category ? (
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
              {behavior.category.name}
            </Badge>
          ) : null}
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Decoder response
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {behavior.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Use the sections below in order: understand what may be driving the behavior, avoid escalation, use a simple script, and lean on the reason behind the approach.
          </p>
        </section>

        <div className="grid gap-5">
          <DecoderSection
            icon={Brain}
            label="Panel 1"
            title="What’s Happening"
            tone="sky"
          >
            <p>{behavior.whats_happening}</p>
          </DecoderSection>

          <DecoderSection
            icon={TriangleAlert}
            label="Panel 2"
            title="What NOT to Do"
            tone="amber"
          >
            <ListBlock items={behavior.what_not_to_do} ordered />
          </DecoderSection>

          <DecoderSection
            icon={MessageSquareText}
            label="Panel 3"
            title="What to Say Instead"
            tone="emerald"
          >
            <ListBlock items={behavior.what_to_say} />
          </DecoderSection>

          <DecoderSection
            icon={Lightbulb}
            label="Panel 4"
            title="Why This Works"
            tone="slate"
          >
            <p>{behavior.why_it_works}</p>
          </DecoderSection>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {behavior.common_triggers?.length ? (
            <details className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Optional
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      Common triggers
                    </h2>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                    Expand
                  </Badge>
                </div>
              </summary>
              <div className="mt-5 text-sm leading-7 text-slate-700">
                <ListBlock items={behavior.common_triggers} />
              </div>
            </details>
          ) : null}

          {behavior.bonus_tips?.length ? (
            <details className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Optional
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      Bonus tips
                    </h2>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                    Expand
                  </Badge>
                </div>
              </summary>
              <div className="mt-5 text-sm leading-7 text-slate-700">
                <ListBlock items={behavior.bonus_tips} />
              </div>
            </details>
          ) : null}
        </div>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    AI support
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    This didn’t help? Ask AI for one more layer of guidance.
                  </h2>
                </div>
                {aiStatusLoading ? (
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                    Checking availability...
                  </Badge>
                ) : aiStatus ? (
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                    {aiStatus.remaining_queries} of {aiStatus.lifetime_cap} left
                  </Badge>
                ) : null}
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                This is a secondary fallback, not the main product. Ask one focused follow-up and
                CalmCompass will answer inside this page without storing a chat history.
              </p>

              {aiStatus?.model ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  {aiStatus.provider} • {aiStatus.model}
                </p>
              ) : null}

              <div className="mt-5 space-y-4">
                {aiStatusLoading ? (
                  <div className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Checking AI fallback status...
                  </div>
                ) : null}

                {aiUnavailable ? (
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                    <p className="font-semibold">
                      {aiCapReached ? 'AI fallback limit reached' : 'AI fallback unavailable'}
                    </p>
                    <p className="mt-2">
                      {aiStatus?.unavailable_reason ||
                        'AI fallback could not be used right now.'}
                    </p>
                    <p className="mt-3">
                      Keep using the static decoder first. For urgent support, contact local
                      emergency services when safety is at risk or call the {AI_HELPLINE_LABEL}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="ai-follow-up-question"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Your follow-up
                      </label>
                      <Textarea
                        id="ai-follow-up-question"
                        value={aiQuestion}
                        onChange={(event) => setAIQuestion(event.target.value)}
                        className="mt-2 min-h-[132px] border-slate-200"
                        placeholder="Describe what is still not working, what changed, or what you need help saying next."
                        maxLength={1200}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        The AI prompt includes this behavior, the decoder guidance already shown,
                        your care recipient name, and the last 15 Daily Log entries.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        className="rounded-full px-6"
                        disabled={aiSubmitting || !aiQuestion.trim()}
                        onClick={handleAskAI}
                      >
                        {aiSubmitting ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Asking AI...
                          </>
                        ) : (
                          'Ask AI for more help'
                        )}
                      </Button>
                      <p className="text-xs text-slate-500">
                        Single-response only in this MVP.
                      </p>
                    </div>
                  </>
                )}

                {aiRequestError ? (
                  <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                    {aiRequestError}
                  </div>
                ) : null}

                <AIAnswerCard answer={aiAnswer?.answer} source={aiAnswer?.source} />

                {showAIHelpline ? (
                  <p className="text-xs leading-6 text-slate-500">
                    For immediate safety risk or acute medical concern, stop here and seek urgent
                    help first. {AI_HELPLINE_LABEL}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

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

const AI_HELPLINE_LABEL = "Alzheimer's Association 24/7 Helpline: 800-272-3900"

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
  if (!answer) return null

  return (
    <div className="soft-tile mt-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">AI response</p>
        <Badge variant="outline">{source === 'safety_fallback' ? 'Safety' : 'AI'}</Badge>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
        {answer}
      </div>
    </div>
  )
}

function DecoderSection({ icon: Icon, label, title, children, tone = 'slate' }) {
  const toneClasses = {
    slate: 'bg-[rgb(var(--theme-neutral-strong-rgb))] text-foreground',
    amber: 'bg-amber-50 text-amber-800',
    emerald: 'bg-[rgb(var(--theme-primary-soft-rgb))] text-[rgb(var(--theme-primary-ink-rgb))]',
    sky: 'bg-[rgb(var(--theme-secondary-soft-rgb))] text-[rgb(var(--theme-secondary-ink-rgb))]',
  }

  return (
    <section className="soft-card p-4">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone] || toneClasses.slate}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-4 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  )
}

function ListBlock({ items, ordered = false }) {
  if (!items?.length) return null

  const List = ordered ? 'ol' : 'ul'

  return (
    <List className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--theme-neutral-strong-rgb))] text-xs font-semibold text-foreground">
            {ordered ? index + 1 : ''}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </List>
  )
}

function BehaviorNotFound() {
  return (
    <div className="soft-card p-5">
      <h1 className="text-xl font-semibold text-foreground">Response unavailable</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Return to the decoder and search again.
      </p>
      <Button asChild className="mt-4">
        <Link to="/decoder">Back to decoder</Link>
      </Button>
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
            error.response?.data?.detail || 'This decoder response could not be loaded.'
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
              error.response?.data?.detail || 'AI support could not be checked right now.',
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
        payload?.detail || 'AI support could not respond right now.'
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
      <div className="page-shell screen-enter">
        <div className="page-stack max-w-3xl">
          <div className="soft-tile flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </div>
      </div>
    )
  }

  if (errorStatus === 404) {
    return (
      <div className="page-shell screen-enter">
        <div className="page-stack max-w-3xl">
          <BehaviorNotFound />
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="page-shell screen-enter">
        <div className="page-stack max-w-3xl">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {errorMessage}
          </div>
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
    <div className="page-shell screen-enter">
      <div className="page-stack max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={behavior?.category?.slug ? `/decoder/${behavior.category.slug}` : '/decoder'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {behavior?.category ? <Badge variant="outline">{behavior.category.name}</Badge> : null}
        </div>

        <section className="soft-card p-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {behavior.title}
          </h1>
        </section>

        <div className="grid gap-3">
          <DecoderSection icon={Brain} label="1" title="What's Happening" tone="sky">
            <p>{behavior.whats_happening}</p>
          </DecoderSection>

          <DecoderSection icon={TriangleAlert} label="2" title="What NOT to Do" tone="amber">
            <ListBlock items={behavior.what_not_to_do} ordered />
          </DecoderSection>

          <DecoderSection icon={MessageSquareText} label="3" title="What to Say Instead" tone="emerald">
            <ListBlock items={behavior.what_to_say} />
          </DecoderSection>

          <DecoderSection icon={Lightbulb} label="4" title="Why This Works">
            <p>{behavior.why_it_works}</p>
          </DecoderSection>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {behavior.common_triggers?.length ? (
            <details className="soft-card p-4">
              <summary className="cursor-pointer list-none text-base font-semibold text-foreground">
                Common triggers
              </summary>
              <div className="mt-4 text-sm leading-7 text-muted-foreground">
                <ListBlock items={behavior.common_triggers} />
              </div>
            </details>
          ) : null}

          {behavior.bonus_tips?.length ? (
            <details className="soft-card p-4">
              <summary className="cursor-pointer list-none text-base font-semibold text-foreground">
                Bonus tips
              </summary>
              <div className="mt-4 text-sm leading-7 text-muted-foreground">
                <ListBlock items={behavior.bonus_tips} />
              </div>
            </details>
          ) : null}
        </div>

        <section className="soft-card p-4">
          <div className="flex items-start gap-3">
            <span className="theme-icon-accent inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Still stuck?</h2>
                {aiStatusLoading ? (
                  <Badge variant="outline">Checking</Badge>
                ) : aiStatus ? (
                  <Badge variant="outline">
                    {aiStatus.remaining_queries}/{aiStatus.lifetime_cap} left
                  </Badge>
                ) : null}
              </div>

              {aiStatusLoading ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Checking AI support...
                </p>
              ) : aiUnavailable ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  <p className="font-semibold">
                    {aiCapReached ? 'AI limit reached' : 'AI unavailable'}
                  </p>
                  <p className="mt-1">
                    {aiStatus?.unavailable_reason || 'Keep using the static decoder first.'}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Textarea
                    id="ai-follow-up-question"
                    value={aiQuestion}
                    onChange={(event) => setAIQuestion(event.target.value)}
                    className="min-h-[112px] bg-white"
                    placeholder="What changed, or what do you need help saying?"
                    maxLength={1200}
                  />
                  <Button
                    type="button"
                    className="w-full"
                    disabled={aiSubmitting || !aiQuestion.trim()}
                    onClick={handleAskAI}
                  >
                    {aiSubmitting ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Asking...
                      </>
                    ) : (
                      'Ask AI'
                    )}
                  </Button>
                </div>
              )}

              {aiRequestError ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {aiRequestError}
                </div>
              ) : null}

              <AIAnswerCard answer={aiAnswer?.answer} source={aiAnswer?.source} />

              {showAIHelpline ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  For immediate danger or acute medical concern, seek urgent help first. {AI_HELPLINE_LABEL}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

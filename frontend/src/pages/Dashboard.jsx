import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  ClipboardPenLine,
  HeartHandshake,
  LoaderCircle,
  PillBottle,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getBehaviorCategories, getLastViewedBehavior } from '@/services/knowledgebase'
import { getTipOfDay } from '@/utils/caregiverTips'
import { getKnowledgebaseIcon } from '@/utils/knowledgebaseIcons'

const supportCards = [
  {
    icon: ClipboardPenLine,
    title: 'Daily Log',
    status: 'Live now',
    description: 'Track mood shifts, add short notes, and link a decoder behavior when it helps.',
    href: '/log',
    cta: 'Open Daily Log',
  },
  {
    icon: PillBottle,
    title: 'Medications',
    status: 'Live now',
    description: 'Track fixed or interval doses, log outcomes, and keep adherence visible in-app.',
    href: '/medications',
    cta: 'Open Medications',
  },
]

function QuickCategoryLink({ category }) {
  const Icon = getKnowledgebaseIcon(category.icon)

  return (
    <Link
      to={`/decoder/${category.slug}`}
      className="group flex items-center justify-between gap-4 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{category.name}</p>
          <p className="text-sm text-slate-500">{category.behavior_count} behaviors</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [lastViewed, setLastViewed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const tipOfTheDay = getTipOfDay()

  useEffect(() => {
    let cancelled = false

    const loadDashboardData = async () => {
      setLoading(true)
      setCategoriesError('')

      const [categoriesResult, lastViewedResult] = await Promise.allSettled([
        getBehaviorCategories(),
        getLastViewedBehavior(),
      ])

      if (cancelled) {
        return
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value)
      } else {
        setCategories([])
        setCategoriesError(
          categoriesResult.reason?.response?.data?.detail ||
            'The decoder categories could not be loaded right now.'
        )
      }

      if (lastViewedResult.status === 'fulfilled') {
        setLastViewed(lastViewedResult.value)
      } else {
        setLastViewed(null)
      }

      setLoading(false)
    }

    loadDashboardData()

    return () => {
      cancelled = true
    }
  }, [])

  const totalBehaviors = categories.reduce(
    (sum, category) => sum + Number(category.behavior_count || 0),
    0
  )

  const hasLastViewedBehavior = Boolean(lastViewed?.behavior?.slug)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-9">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Care Home
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                What’s happening right now?
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                CalmCompass is ready for {user?.care_recipient_name || 'your care recipient'}.
                Open the decoder for fast, structured guidance during difficult moments.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link to="/decoder">
                    Open Behavior Decoder
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                  <Link to="/profile">Profile settings</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Caregiver
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {user?.first_name || user?.username}
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Categories ready
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {loading ? '...' : categories.length}
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Behaviors ready
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {loading ? '...' : totalBehaviors}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Quick browse
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Decoder categories
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600 shadow-sm">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading decoder categories...
              </div>
            ) : categoriesError ? (
              <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
                {categoriesError}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {categories.map((category) => (
                  <QuickCategoryLink key={category.slug} category={category} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <BookOpenText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Last lookup
                      </p>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                        {hasLastViewedBehavior ? lastViewed.behavior.title : 'No recent decoder lookup'}
                      </h2>
                    </div>
                    {hasLastViewedBehavior ? (
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                        {lastViewed.behavior.category?.name}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {hasLastViewedBehavior
                      ? lastViewed.behavior.short_summary
                      : 'Your most recent decoder response will appear here for quick re-access.'}
                  </p>

                  <div className="mt-5">
                    <Button
                      asChild={hasLastViewedBehavior}
                      variant={hasLastViewedBehavior ? 'default' : 'outline'}
                      className="rounded-full px-6"
                      disabled={!hasLastViewedBehavior}
                    >
                      {hasLastViewedBehavior ? (
                        <Link to={`/decoder/behavior/${lastViewed.behavior.slug}`}>Open last lookup</Link>
                      ) : (
                        <span>Open last lookup</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <HeartHandshake className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Tip of the day
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    {tipOfTheDay.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{tipOfTheDay.body}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {supportCards.map(({ icon: Icon, title, status, description, href, cta }) => (
            <div
              key={title}
              className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                  {status}
                </Badge>
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              <div className="mt-5">
                {href ? (
                  <Button asChild className="rounded-full px-5">
                    <Link to={href}>{cta}</Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="rounded-full px-5" disabled>
                    {cta}
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-6 shadow-sm md:col-span-2">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Current focus
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Decoder, Daily Log, and Medications are all active in the MVP shell.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  Use the decoder for fast guidance, capture the moment in Daily Log, and keep medication timing and outcomes organized without relying on push reminders.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

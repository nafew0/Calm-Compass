import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  ClipboardPenLine,
  LoaderCircle,
  PillBottle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getLastViewedBehavior } from '@/services/knowledgebase'
import { getTipOfDay } from '@/utils/caregiverTips'

const utilityCards = [
  {
    icon: ClipboardPenLine,
    title: 'Daily Log',
    copy: 'Add a quick note or mood check.',
    href: '/log',
    surfaceClass:
      'border-[rgb(var(--theme-primary-strong-rgb)/0.8)] bg-[rgb(var(--theme-primary-soft-rgb)/0.72)]',
    iconSurfaceClass:
      'border border-[rgb(var(--theme-border-rgb)/0.9)] bg-[rgb(var(--theme-neutral-rgb))]',
    iconClass: 'text-[rgb(var(--theme-primary-ink-rgb))]',
    titleClass: 'text-[rgb(var(--theme-primary-ink-rgb))]',
    copyClass: 'text-[rgb(var(--theme-primary-ink-rgb)/0.78)]',
  },
  {
    icon: PillBottle,
    title: 'Meds',
    copy: 'Log the next dose in a tap.',
    href: '/medications',
    surfaceClass:
      'border-[rgb(var(--theme-secondary-strong-rgb)/0.8)] bg-[rgb(var(--theme-secondary-soft-rgb)/0.6)]',
    iconSurfaceClass:
      'border border-[rgb(var(--theme-border-rgb)/0.9)] bg-[rgb(var(--theme-neutral-rgb))]',
    iconClass: 'text-[rgb(var(--theme-secondary-ink-rgb))]',
    titleClass: 'text-[rgb(var(--theme-secondary-ink-rgb))]',
    copyClass: 'text-[rgb(var(--theme-secondary-ink-rgb)/0.78)]',
  },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [lastViewed, setLastViewed] = useState(null)
  const [loadingLastViewed, setLoadingLastViewed] = useState(true)
  const tipOfTheDay = getTipOfDay()

  useEffect(() => {
    let cancelled = false

    const loadLastViewed = async () => {
      setLoadingLastViewed(true)
      try {
        const response = await getLastViewedBehavior()
        if (!cancelled) {
          setLastViewed(response)
        }
      } catch {
        if (!cancelled) {
          setLastViewed(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingLastViewed(false)
        }
      }
    }

    loadLastViewed()

    return () => {
      cancelled = true
    }
  }, [])

  const hasLastLookup = Boolean(lastViewed?.behavior?.slug)

  return (
    <div className="page-shell screen-enter">
      <div className="page-stack max-w-2xl space-y-4">
        <section className="soft-card overflow-hidden">
          <div className="bg-[rgb(var(--theme-primary-soft-rgb)/0.66)] px-4 py-3">
            <p className="text-sm font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
              {user?.first_name ? `Hi, ${user.first_name}` : 'Care home'}
            </p>
          </div>
          <div className="space-y-5 px-4 py-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                What&apos;s happening right now?
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Fast guidance for {user?.care_recipient_name || 'your care recipient'}.
              </p>
            </div>
            <Button asChild size="lg" className="h-14 w-full justify-between px-4">
              <Link to="/decoder">
                Open Behavior Decoder
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          {utilityCards.map(
            ({
              icon: Icon,
              title,
              copy,
              href,
              surfaceClass,
              iconSurfaceClass,
              iconClass,
              titleClass,
              copyClass,
            }) => (
              <Link
                key={title}
                to={href}
                className={`soft-card pressable block p-4 ${surfaceClass}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] ${iconSurfaceClass} ${iconClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className={`text-xl font-semibold ${titleClass}`}>{title}</h2>
                </div>
                <p className={`mt-4 text-sm leading-6 ${copyClass}`}>{copy}</p>
              </Link>
            )
          )}
        </div>

        <section className="soft-card p-4">
          <div className="flex items-center gap-3">
            <span className="theme-icon-primary inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <BookOpenText className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
              Last lookup
            </h2>
            {hasLastLookup ? (
              <Badge variant="outline" className="ml-auto">
                {lastViewed.behavior.category?.name}
              </Badge>
            ) : null}
          </div>

          {loadingLastViewed ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </p>
          ) : hasLastLookup ? (
            <div className="mt-4">
              <p className="line-clamp-2 text-base leading-7 text-[rgb(var(--theme-primary-ink-rgb))]">
                {lastViewed.behavior.title}
              </p>
              <Button asChild variant="outline" className="mt-4 w-full justify-between">
                <Link to={`/decoder/behavior/${lastViewed.behavior.slug}`}>
                  Open again
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Your recent decoder lookup will stay here.
            </p>
          )}
        </section>

        <section className="soft-tile p-4">
          <p className="text-xs font-semibold text-muted-foreground">Care note</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">{tipOfTheDay.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{tipOfTheDay.body}</p>
        </section>
      </div>
    </div>
  )
}

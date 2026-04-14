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
  },
  {
    icon: PillBottle,
    title: 'Meds',
    copy: 'Log the next dose in a tap.',
    href: '/medications',
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
          {utilityCards.map(({ icon: Icon, title, copy, href }) => (
            <Link key={title} to={href} className="soft-card pressable block p-4">
              <span className="theme-icon-secondary inline-flex h-10 w-10 items-center justify-center">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{copy}</p>
            </Link>
          ))}
        </div>

        <section className="soft-card p-4">
          <div className="flex items-start gap-3">
            <span className="theme-icon-primary inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <BookOpenText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Last lookup</h2>
                {hasLastLookup ? (
                  <Badge variant="outline">{lastViewed.behavior.category?.name}</Badge>
                ) : null}
              </div>
              {loadingLastViewed ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading...
                </p>
              ) : hasLastLookup ? (
                <>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {lastViewed.behavior.title}
                  </p>
                  <Button asChild variant="outline" className="mt-4 w-full justify-between">
                    <Link to={`/decoder/behavior/${lastViewed.behavior.slug}`}>
                      Open again
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Your recent decoder lookup will stay here.
                </p>
              )}
            </div>
          </div>
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

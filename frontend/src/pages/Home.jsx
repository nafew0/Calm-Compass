import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenText, ClipboardPenLine, PillBottle } from 'lucide-react'

import BrandLogo from '@/components/branding/BrandLogo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { getAppHomePath } from '@/utils/appRoutes'

const tools = [
  { icon: BookOpenText, label: 'Behavior Decoder' },
  { icon: ClipboardPenLine, label: 'Daily Log' },
  { icon: PillBottle, label: 'Medication Tracker' },
]

export default function Home() {
  const { isAuthenticated, user } = useAuth()
  const primaryHref = isAuthenticated ? getAppHomePath(user) : '/register'

  return (
    <div className="theme-app-gradient min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="space-y-6">
          <BrandLogo />
          <div>
            <p className="text-sm font-semibold text-primary">Dementia care companion</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Calm help for hard moments.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Search a behavior, get a simple response, and keep notes close.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={primaryHref}>
                {isAuthenticated ? 'Open CalmCompass' : 'Get access'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!isAuthenticated ? (
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="theme-panel mx-auto w-full max-w-sm p-4">
          <div className="soft-tile p-3">
            <p className="text-sm font-semibold text-foreground">What&apos;s happening right now?</p>
            <div className="mt-3 rounded-lg border border-[rgb(var(--theme-border-rgb))] bg-white px-3 py-4 text-sm text-muted-foreground">
              Try: refusing shower, wandering, accusing
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {tools.map(({ icon: Icon, label }) => (
              <div key={label} className="soft-card flex items-center gap-3 p-3">
                <span className="theme-icon-primary inline-flex h-10 w-10 items-center justify-center">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

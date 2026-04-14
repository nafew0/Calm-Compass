import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenText,
  ClipboardPenLine,
  HeartHandshake,
  PillBottle,
  ShieldAlert,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { getAppHomePath } from '@/utils/appRoutes'

const featureCards = [
  {
    icon: BookOpenText,
    title: 'Behavior Decoder',
    description:
      'Search common dementia behaviors and surface calm, structured guidance fast.',
  },
  {
    icon: ClipboardPenLine,
    title: 'Daily Log',
    description:
      'Track mood changes, notes, and linked behaviors without adding friction to the day.',
  },
  {
    icon: PillBottle,
    title: 'Medication Tracker',
    description:
      'Keep medication schedules and adherence records in one quiet, caregiver-friendly place.',
  },
]

const principles = [
  'Behavior is communication, not defiance.',
  'Validation beats correction when the brain is overwhelmed.',
  'Fast, plain-language support matters most in stressful moments.',
]

export default function Home() {
  const { isAuthenticated, user } = useAuth()
  const primaryHref = isAuthenticated ? getAppHomePath(user) : '/register'

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f8fbfa_0%,#ffffff_34%,#eef6f4_100%)]">
      <section className="border-b border-[rgb(var(--theme-border-rgb)/0.72)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              <HeartHandshake className="h-3.5 w-3.5" />
              Dementia Care Companion
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Calm guidance for hard dementia moments.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              CalmCompass gives caregivers a structured behavior decoder, a simple daily log,
              and medication tracking designed for real life at home. The goal is speed,
              clarity, and less panic in the moment.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to={primaryHref}>
                  {isAuthenticated ? 'Open CalmCompass' : 'Create caregiver account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!isAuthenticated ? (
                <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                  <Link to="/login">Sign in</Link>
                </Button>
              ) : null}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {principles.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-white/85 px-4 py-4 text-sm leading-6 text-slate-600 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Core workflow
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  What&apos;s happening right now?
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {[
                'Search or browse a behavior',
                'Open a four-part response designed for quick action',
                'Use the log and medication tools to keep context close',
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl bg-emerald-950 px-5 py-5 text-emerald-50">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Built for the moment
              </p>
              <p className="mt-3 text-sm leading-7 text-emerald-100">
                Large touch targets, plain language, and a calm layout help caregivers act
                quickly without digging through long articles or generic chat.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            MVP Focus
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            A focused caregiver toolkit, not a sprawling platform.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="border-slate-200 bg-white/90 shadow-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="pt-4 text-xl">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-slate-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

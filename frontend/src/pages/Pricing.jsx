import { useEffect, useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import PlanBadge from '@/components/subscription/PlanBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import {
  createBkashCheckoutSession,
  createStripeCheckoutSession,
} from '@/services/payments'
import { getPlans } from '@/services/subscriptions'
import { cn } from '@/lib/utils'

function formatLimit(value, label) {
  if (!value) return `Unlimited ${label}`
  return `${value.toLocaleString()} ${label}`
}

function formatPrice(amount, currency) {
  const numericAmount = Number(amount || 0)
  if (numericAmount === 0) return 'Free'
  if (currency === 'BDT') return `BDT ${numericAmount.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
  if (currency === 'USD') return `$${numericAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return `${currency || 'USD'} ${numericAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function getPricingDetails(plan, { yearlyBilling, isBangladeshiBilling }) {
  if (isBangladeshiBilling) {
    const monthlyAmount = Number(plan.bkash_price_monthly || 0)
    const yearlyAmount = Number(plan.bkash_price_yearly || 0)
    const activeAmount = yearlyBilling ? yearlyAmount : monthlyAmount

    return {
      amount: activeAmount,
      currency: 'BDT',
      providerLabel: 'bKash',
      missingPrice: plan.slug !== 'free' && activeAmount === 0,
    }
  }

  return {
    amount: yearlyBilling ? Number(plan.price_yearly || 0) : Number(plan.price_monthly || 0),
    currency: 'USD',
    providerLabel: 'Stripe',
    missingPrice: false,
  }
}

export default function Pricing() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [yearlyBilling, setYearlyBilling] = useState(false)
  const [isBangladeshiBilling, setIsBangladeshiBilling] = useState(false)
  const [checkoutPlanId, setCheckoutPlanId] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadPlans = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await getPlans()
        if (!cancelled) {
          setPlans(response)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'Unable to load plans right now.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPlans()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('canceled') !== 'true') return

    toast({
      title: 'Checkout canceled',
      description: 'No payment was completed.',
      variant: 'warning',
    })

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('canceled')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams, toast])

  const currentPlanSlug = user?.current_plan?.slug || 'free'
  const selectedBillingCycle = yearlyBilling ? 'yearly' : 'monthly'

  const handleChangePlan = (plan) => {
    if (plan.slug === 'free') return

    const providerLabel = isBangladeshiBilling ? 'bKash' : 'Stripe'
    setCheckoutPlanId(plan.id)

    const createCheckout = isBangladeshiBilling
      ? createBkashCheckoutSession
      : createStripeCheckoutSession

    createCheckout({ planId: plan.id, billingCycle: selectedBillingCycle })
      .then((response) => {
        window.location.assign(response.bkash_url || response.checkout_url)
      })
      .catch((checkoutError) => {
        toast({
          title: 'Checkout unavailable',
          description:
            checkoutError.response?.data?.detail ||
            `${providerLabel} checkout could not be created.`,
          variant: 'error',
          duration: 5000,
        })
        setCheckoutPlanId('')
      })
  }

  return (
    <div className="theme-app-gradient min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="theme-panel p-5 md:p-6">
          <Badge variant="default">Access</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Choose your CalmCompass access.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Plans come from Django admin and checkout stays server-backed.
          </p>
          {isAuthenticated ? <div className="mt-4"><PlanBadge plan={user?.current_plan} /></div> : null}
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="theme-panel-soft flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Billing</p>
              <p className="text-xs text-muted-foreground">{yearlyBilling ? 'Yearly' : 'Monthly'}</p>
            </div>
            <Switch checked={yearlyBilling} onCheckedChange={setYearlyBilling} />
          </div>
          <div className="theme-panel-soft flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Provider</p>
              <p className="text-xs text-muted-foreground">
                {isBangladeshiBilling ? 'bKash / BDT' : 'Stripe / USD'}
              </p>
            </div>
            <Switch checked={isBangladeshiBilling} onCheckedChange={setIsBangladeshiBilling} />
          </div>
        </section>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="theme-panel h-64 animate-pulse" />
            ))}
          </div>
        ) : null}

        {error ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="text-rose-900">Unable to load plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-rose-700">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error ? (
          <div className="grid gap-3 md:grid-cols-3">
            {plans.map((plan) => {
              const pricing = getPricingDetails(plan, { yearlyBilling, isBangladeshiBilling })
              const isCurrentPlan = currentPlanSlug === plan.slug
              const isCheckoutPlan = checkoutPlanId === plan.id
              const actionLabel = !isAuthenticated
                ? plan.slug === 'free'
                  ? 'Start free'
                  : 'Choose plan'
                : isCurrentPlan
                  ? 'Current plan'
                  : (user?.current_plan?.tier ?? 0) < plan.tier
                    ? 'Upgrade'
                    : 'Change plan'

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'theme-panel border-0',
                    plan.slug === 'pro' ? 'ring-2 ring-primary/20' : ''
                  )}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <PlanBadge plan={plan} />
                      <Badge variant="outline">{pricing.providerLabel}</Badge>
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-4xl font-semibold tracking-tight text-foreground">
                          {pricing.missingPrice ? 'Set in admin' : formatPrice(pricing.amount, pricing.currency)}
                        </span>
                        {!pricing.missingPrice && Number(pricing.amount || 0) > 0 ? (
                          <span className="pb-1 text-sm text-muted-foreground">
                            /{yearlyBilling ? 'year' : 'month'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="theme-panel-soft px-3 py-3 text-sm font-medium text-foreground">
                      {formatLimit(plan.max_items, 'items')}
                    </div>

                    <div className="space-y-3">
                      {(plan.features || []).slice(0, 5).map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <span className="theme-icon-primary mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center">
                            <Check className="h-4 w-4" />
                          </span>
                          <p className="text-sm leading-6 text-muted-foreground">{feature}</p>
                        </div>
                      ))}
                    </div>

                    {!isAuthenticated ? (
                      <Button asChild className="w-full">
                        <Link to="/register">{actionLabel}</Link>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isCurrentPlan ? 'outline' : 'default'}
                        disabled={isCurrentPlan || isCheckoutPlan || pricing.missingPrice}
                        onClick={() => handleChangePlan(plan)}
                      >
                        {isCheckoutPlan ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          actionLabel
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : null}

        {!loading && !error && !plans.length ? (
          <Card className="theme-panel border-dashed text-center">
            <CardHeader>
              <CardTitle>No active plans</CardTitle>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

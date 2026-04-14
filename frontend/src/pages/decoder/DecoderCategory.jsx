import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, LoaderCircle, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getBehaviorCategory } from '@/services/knowledgebase'
import { getKnowledgebaseIcon } from '@/utils/knowledgebaseIcons'

function CategoryNotFound() {
  return (
    <div className="soft-card p-5">
      <h1 className="text-xl font-semibold text-foreground">Category unavailable</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Return to the decoder and choose another group.
      </p>
      <Button asChild className="mt-4">
        <Link to="/decoder">Back to decoder</Link>
      </Button>
    </div>
  )
}

export default function DecoderCategory() {
  const { categorySlug } = useParams()
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [filterValue, setFilterValue] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadCategory = async () => {
      setLoading(true)
      setErrorStatus(null)
      setErrorMessage('')

      try {
        const response = await getBehaviorCategory(categorySlug)
        if (!cancelled) {
          setCategory(response)
        }
      } catch (error) {
        if (!cancelled) {
          setCategory(null)
          setErrorStatus(error.response?.status || 500)
          setErrorMessage(
            error.response?.data?.detail || 'This category could not be loaded.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadCategory()

    return () => {
      cancelled = true
    }
  }, [categorySlug])

  const normalizedFilter = filterValue.trim().toLowerCase()
  const filteredBehaviors = category?.behaviors?.filter((behavior) => {
    if (!normalizedFilter) return true

    return (
      behavior.title.toLowerCase().includes(normalizedFilter) ||
      behavior.short_summary.toLowerCase().includes(normalizedFilter) ||
      (behavior.tags || []).some((tag) => tag.toLowerCase().includes(normalizedFilter))
    )
  }) || []

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
          <CategoryNotFound />
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

  const Icon = getKnowledgebaseIcon(category?.icon)

  return (
    <div className="page-shell screen-enter">
      <div className="page-stack max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/decoder">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Decoder
          </Link>
        </Button>

        <section className="soft-card p-4">
          <div className="flex items-start gap-3">
            <span className="theme-icon-primary inline-flex h-11 w-11 shrink-0 items-center justify-center">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Badge variant="outline">{category.behavior_count} behaviors</Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {category.name}
              </h1>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="category-filter"
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              placeholder="Filter this group"
              className="pl-11"
            />
          </div>
        </section>

        <section className="grid gap-3">
          {filteredBehaviors.length === 0 ? (
            <div className="soft-tile p-4 text-sm text-muted-foreground">
              No behavior matches this filter.
            </div>
          ) : (
            filteredBehaviors.map((behavior, index) => {
              const isTintedRow = index % 2 === 0

              return (
                <Link
                  key={behavior.slug}
                  to={`/decoder/behavior/${behavior.slug}`}
                  className={`soft-card pressable flex items-start justify-between gap-4 p-4 ${
                    isTintedRow
                      ? 'border-[rgb(var(--theme-secondary-strong-rgb)/0.7)] bg-[rgb(var(--theme-secondary-soft-rgb)/0.42)]'
                      : 'bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
                      {behavior.title}
                    </h2>
                    {behavior.short_summary ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {behavior.short_summary}
                      </p>
                    ) : null}
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--theme-primary-ink-rgb))]" />
                </Link>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}

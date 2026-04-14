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
    <div className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        Category not found
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        That category is not available.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Return to the decoder overview to browse available behavior groups.
      </p>
      <div className="mt-5">
        <Button asChild className="rounded-full px-6">
          <Link to="/decoder">Back to decoder</Link>
        </Button>
      </div>
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
            error.response?.data?.detail || 'The category could not be loaded right now.'
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
    if (!normalizedFilter) {
      return true
    }

    return (
      behavior.title.toLowerCase().includes(normalizedFilter) ||
      behavior.short_summary.toLowerCase().includes(normalizedFilter) ||
      behavior.tags.some((tag) => tag.toLowerCase().includes(normalizedFilter))
    )
  }) || []

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-[1.8rem] border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading category...
        </div>
      </div>
    )
  }

  if (errorStatus === 404) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <CategoryNotFound />
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

  const Icon = getKnowledgebaseIcon(category?.icon)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/decoder">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to decoder
            </Link>
          </Button>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Behavior category
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {category.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {category.behavior_count} behavior responses are available in this group.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label
                htmlFor="category-filter"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Filter this category
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="category-filter"
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  placeholder="Filter behaviors in this category"
                  className="h-12 rounded-[1.1rem] border-slate-200 pl-11"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Behaviors
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {normalizedFilter ? `${filteredBehaviors.length} matching behaviors` : 'All behaviors'}
              </h2>
            </div>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
              {category.behavior_count} total
            </Badge>
          </div>

          {filteredBehaviors.length === 0 ? (
            <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-600">
              No behaviors match this filter. Clear the filter or return to the full decoder.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBehaviors.map((behavior) => (
                <Link
                  key={behavior.slug}
                  to={`/decoder/behavior/${behavior.slug}`}
                  className="group rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                        {behavior.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {behavior.short_summary}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

import { useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LoaderCircle, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getBehaviorCategories, searchBehaviors } from '@/services/knowledgebase'
import { getKnowledgebaseIcon } from '@/utils/knowledgebaseIcons'

function BehaviorResultItem({ behavior }) {
  return (
    <Link
      to={`/decoder/behavior/${behavior.slug}`}
      className="group rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {behavior.category?.name}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            {behavior.title}
          </h3>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{behavior.short_summary}</p>
    </Link>
  )
}

function CategoryCard({ category }) {
  const Icon = getKnowledgebaseIcon(category.icon)

  return (
    <Link
      to={`/decoder/${category.slug}`}
      className="group rounded-[1.7rem] border border-slate-200 bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" />
        </span>
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
          {category.behavior_count} ready
        </Badge>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
        {category.name}
      </h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Browse decoder guidance for this behavior group.
      </p>
    </Link>
  )
}

export default function DecoderHome() {
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const deferredSearchInput = useDeferredValue(searchInput)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadCategories = async () => {
      setCategoriesLoading(true)
      setCategoriesError('')

      try {
        const response = await getBehaviorCategories()
        if (!cancelled) {
          setCategories(response)
        }
      } catch (error) {
        if (!cancelled) {
          setCategories([])
          setCategoriesError(
            error.response?.data?.detail ||
              'The behavior categories could not be loaded right now.'
          )
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(deferredSearchInput.trim())
    }, 250)

    return () => window.clearTimeout(timerId)
  }, [deferredSearchInput])

  useEffect(() => {
    let cancelled = false

    const loadResults = async () => {
      if (debouncedQuery.length < 2) {
        setResults([])
        setResultsError('')
        setResultsLoading(false)
        return
      }

      setResultsLoading(true)
      setResultsError('')

      try {
        const response = await searchBehaviors(debouncedQuery)
        if (!cancelled) {
          setResults(Array.isArray(response) ? response : [])
        }
      } catch (error) {
        if (!cancelled) {
          setResults([])
          setResultsError(
            error.response?.data?.detail || 'Search is unavailable at the moment.'
          )
        }
      } finally {
        if (!cancelled) {
          setResultsLoading(false)
        }
      }
    }

    loadResults()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const isSearching = searchInput.trim().length > 0

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-9">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Behavior Decoder
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                What’s happening right now?
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Search a behavior or browse a category to get calm, structured guidance fast.
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-emerald-100 bg-emerald-50/70 p-5">
              <label
                htmlFor="decoder-search"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800"
              >
                Search behaviors
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
                <Input
                  id="decoder-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Try: shower, wandering, paranoia..."
                  className="h-14 rounded-[1.1rem] border-emerald-200 bg-white pl-11 text-base"
                  autoComplete="off"
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                Search checks behavior titles and indexed content. Browse stays available below when you’re not searching.
              </p>
            </div>
          </div>
        </section>

        {isSearching ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Search results
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  {debouncedQuery.length >= 2 ? `Results for “${debouncedQuery}”` : 'Keep typing'}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => setSearchInput('')}
              >
                Clear search
              </Button>
            </div>

            {debouncedQuery.length < 2 ? (
              <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-600">
                Type at least 2 characters to search the decoder.
              </div>
            ) : resultsLoading ? (
              <div className="flex items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Searching behaviors...
              </div>
            ) : resultsError ? (
              <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
                {resultsError}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5">
                <p className="text-lg font-semibold tracking-tight text-slate-950">
                  No direct matches yet
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  Try a simpler word, or clear the search and browse the behavior categories below.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {results.map((behavior) => (
                  <BehaviorResultItem key={behavior.slug} behavior={behavior} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Browse categories
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Start with the closest behavior group
              </h2>
            </div>

            {categoriesLoading ? (
              <div className="flex items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : categoriesError ? (
              <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
                {categoriesError}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <CategoryCard key={category.slug} category={category} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

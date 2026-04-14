import { useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LoaderCircle, Search, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getBehaviorCategories, searchBehaviors } from '@/services/knowledgebase'
import { getKnowledgebaseIcon } from '@/utils/knowledgebaseIcons'

function BehaviorResultItem({ behavior }) {
  return (
    <Link
      to={`/decoder/behavior/${behavior.slug}`}
      className="soft-card pressable block p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge variant="outline">{behavior.category?.name}</Badge>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {behavior.title}
          </h3>
          {behavior.short_summary ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {behavior.short_summary}
            </p>
          ) : null}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  )
}

function CategoryCard({ category }) {
  const Icon = getKnowledgebaseIcon(category.icon)

  return (
    <Link
      to={`/decoder/${category.slug}`}
      className="soft-card pressable flex items-center justify-between gap-3 p-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="theme-icon-primary inline-flex h-11 w-11 shrink-0 items-center justify-center">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{category.name}</h3>
          <p className="text-sm text-muted-foreground">{category.behavior_count} behaviors</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
              'Categories could not be loaded right now.'
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
    }, 220)

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
            error.response?.data?.detail || 'Search is unavailable right now.'
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
    <div className="page-shell screen-enter">
      <div className="page-stack max-w-3xl space-y-4">
        <section className="soft-card p-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            What are you noticing?
          </h1>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="decoder-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Try: shower, wandering, anger"
              className="h-14 bg-white pl-12 pr-12 text-base"
              autoComplete="off"
            />
            {searchInput ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </section>

        {isSearching ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {debouncedQuery.length >= 2 ? 'Matches' : 'Keep typing'}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchInput('')}>
                Clear
              </Button>
            </div>

            {debouncedQuery.length < 2 ? (
              <div className="soft-tile p-4 text-sm text-muted-foreground">
                Type at least 2 characters.
              </div>
            ) : resultsLoading ? (
              <div className="soft-tile flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : resultsError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {resultsError}
              </div>
            ) : results.length === 0 ? (
              <div className="soft-card p-4">
                <p className="text-base font-semibold text-foreground">No direct match</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Try one simple word, or browse categories.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {results.map((behavior) => (
                  <BehaviorResultItem key={behavior.slug} behavior={behavior} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Browse by group</h2>
            {categoriesLoading ? (
              <div className="soft-tile flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : categoriesError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {categoriesError}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
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

import { useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpenText,
  LoaderCircle,
  PencilLine,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import {
  createLogEntry,
  deleteLogEntry,
  getLogEntries,
  getLogEntry,
  getLogSummary,
  updateLogEntry,
} from '@/services/dailyLog'
import { searchBehaviors } from '@/services/knowledgebase'
import {
  DAILY_LOG_MOODS,
  formatLogTimestamp,
  formatSummaryDateRange,
  getMoodLabel,
} from '@/utils/dailyLog'

const NOTE_LIMIT = 300
const BEHAVIOR_SEARCH_MIN_LENGTH = 2

function MoodToggle({ mood, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(mood.value)}
      className={[
        'inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition',
        selected
          ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50',
      ].join(' ')}
      aria-pressed={selected}
    >
      {mood.label}
    </button>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  )
}

function BehaviorSuggestion({ behavior, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(behavior)}
      className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
        {behavior.category?.name}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{behavior.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{behavior.short_summary}</p>
    </button>
  )
}

function LinkedBehaviorPill({ behavior, onRemove }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      <BookOpenText className="h-4 w-4" />
      <span className="font-medium">{behavior.title}</span>
      {behavior.category?.name ? <span className="text-emerald-800/70">• {behavior.category.name}</span> : null}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-emerald-800/80 transition hover:bg-emerald-100"
        aria-label="Remove linked behavior"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function EntryCard({ entry, editingId, deletingId, onEdit, onDelete }) {
  const linkedBehavior = entry.linked_behavior

  return (
    <article className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {formatLogTimestamp(entry.created_at)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(entry.mood_details?.length ? entry.mood_details : entry.moods.map((mood) => ({ mood, label: getMoodLabel(mood) }))).map(
              (item) => (
                <Badge
                  key={`${entry.id}-${item.mood}`}
                  variant="secondary"
                  className="border-slate-200 bg-slate-100 text-slate-700"
                >
                  {item.label}
                </Badge>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full px-4"
            disabled={editingId === entry.id}
            onClick={() => onEdit(entry.id)}
          >
            {editingId === entry.id ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </>
            ) : (
              <>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-4 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            disabled={deletingId === entry.id}
            onClick={() => onDelete(entry)}
          >
            {deletingId === entry.id ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Deleting
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      {linkedBehavior ? (
        <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50/70 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            Linked behavior
          </p>
          <Link
            to={`/decoder/behavior/${linkedBehavior.slug}`}
            className="mt-2 inline-flex text-sm font-semibold text-emerald-900 transition hover:text-emerald-700"
          >
            {linkedBehavior.title}
          </Link>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-7 text-slate-600">
        {entry.note || 'No note added for this entry.'}
      </p>
    </article>
  )
}

function DeleteEntryDialog({ entry, open, deleting, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete this log entry?</DialogTitle>
          <DialogDescription>
            This removes the selected Daily Log entry and updates the weekly summary.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          {entry?.note || 'This entry has no note attached.'}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Keep entry
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete entry'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Log() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')
  const [entries, setEntries] = useState([])
  const [entriesCount, setEntriesCount] = useState(0)
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entriesLoadingMore, setEntriesLoadingMore] = useState(false)
  const [entriesError, setEntriesError] = useState('')
  const [nextPage, setNextPage] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [moods, setMoods] = useState([])
  const [note, setNote] = useState('')
  const [selectedBehavior, setSelectedBehavior] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editingLoadId, setEditingLoadId] = useState('')
  const [behaviorSearchInput, setBehaviorSearchInput] = useState('')
  const deferredBehaviorSearch = useDeferredValue(behaviorSearchInput)
  const [debouncedBehaviorSearch, setDebouncedBehaviorSearch] = useState('')
  const [behaviorResults, setBehaviorResults] = useState([])
  const [behaviorResultsLoading, setBehaviorResultsLoading] = useState(false)
  const [behaviorResultsError, setBehaviorResultsError] = useState('')
  const [entryPendingDelete, setEntryPendingDelete] = useState(null)
  const [deletingEntryId, setDeletingEntryId] = useState('')

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedBehaviorSearch(deferredBehaviorSearch.trim())
    }, 250)

    return () => window.clearTimeout(timerId)
  }, [deferredBehaviorSearch])

  useEffect(() => {
    let cancelled = false

    const loadSummary = async () => {
      setSummaryLoading(true)
      setSummaryError('')

      try {
        const response = await getLogSummary('week')
        if (!cancelled) {
          setSummary(response)
        }
      } catch (error) {
        if (!cancelled) {
          setSummary(null)
          setSummaryError(
            error.response?.data?.detail || 'The weekly summary could not be loaded right now.'
          )
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false

    const loadEntries = async () => {
      setEntriesLoading(true)
      setEntriesError('')

      try {
        const response = await getLogEntries(1)
        if (!cancelled) {
          setEntries(response?.results ?? [])
          setEntriesCount(response?.count ?? 0)
          setNextPage(response?.next ? 2 : null)
        }
      } catch (error) {
        if (!cancelled) {
          setEntries([])
          setEntriesCount(0)
          setNextPage(null)
          setEntriesError(
            error.response?.data?.detail || 'Recent entries could not be loaded right now.'
          )
        }
      } finally {
        if (!cancelled) {
          setEntriesLoading(false)
        }
      }
    }

    loadEntries()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false

    const loadBehaviorResults = async () => {
      if (debouncedBehaviorSearch.length < BEHAVIOR_SEARCH_MIN_LENGTH) {
        setBehaviorResults([])
        setBehaviorResultsError('')
        setBehaviorResultsLoading(false)
        return
      }

      setBehaviorResultsLoading(true)
      setBehaviorResultsError('')

      try {
        const response = await searchBehaviors(debouncedBehaviorSearch)
        if (!cancelled) {
          setBehaviorResults(Array.isArray(response) ? response.slice(0, 6) : [])
        }
      } catch (error) {
        if (!cancelled) {
          setBehaviorResults([])
          setBehaviorResultsError(
            error.response?.data?.detail || 'Behavior search is unavailable right now.'
          )
        }
      } finally {
        if (!cancelled) {
          setBehaviorResultsLoading(false)
        }
      }
    }

    loadBehaviorResults()

    return () => {
      cancelled = true
    }
  }, [debouncedBehaviorSearch])

  const resetForm = () => {
    setMoods([])
    setNote('')
    setSelectedBehavior(null)
    setEditingEntryId(null)
    setBehaviorSearchInput('')
    setBehaviorResults([])
    setBehaviorResultsError('')
  }

  const refreshData = () => {
    setRefreshKey((current) => current + 1)
  }

  const handleToggleMood = (moodValue) => {
    setMoods((current) =>
      current.includes(moodValue)
        ? current.filter((mood) => mood !== moodValue)
        : [...current, moodValue]
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (moods.length === 0) {
      toast({
        title: 'Select at least one mood',
        description: 'Pick the mood chips that best fit the moment before saving.',
        variant: 'warning',
      })
      return
    }

    setSaving(true)

    const payload = {
      moods,
      note,
      linked_behavior_id: selectedBehavior?.id || null,
    }

    try {
      if (editingEntryId) {
        await updateLogEntry(editingEntryId, payload)
      } else {
        await createLogEntry(payload)
      }

      toast({
        title: editingEntryId ? 'Entry updated' : 'Entry saved',
        description: editingEntryId
          ? 'The Daily Log entry has been updated.'
          : 'The Daily Log entry has been added.',
        variant: 'success',
      })
      resetForm()
      refreshData()
    } catch (error) {
      toast({
        title: 'Could not save entry',
        description:
          error.response?.data?.detail ||
          'Please review the form and try again.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditEntry = async (entryId) => {
    setEditingLoadId(entryId)

    try {
      const entry = await getLogEntry(entryId)
      setEditingEntryId(entry.id)
      setMoods(entry.moods ?? [])
      setNote(entry.note ?? '')
      setSelectedBehavior(entry.linked_behavior ?? null)
      setBehaviorSearchInput('')
      setBehaviorResults([])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      toast({
        title: 'Could not load entry',
        description:
          error.response?.data?.detail || 'The selected entry is unavailable.',
        variant: 'error',
      })
    } finally {
      setEditingLoadId('')
    }
  }

  const handleDeleteEntry = async () => {
    if (!entryPendingDelete) {
      return
    }

    setDeletingEntryId(entryPendingDelete.id)

    try {
      await deleteLogEntry(entryPendingDelete.id)
      if (editingEntryId === entryPendingDelete.id) {
        resetForm()
      }
      toast({
        title: 'Entry deleted',
        description: 'The Daily Log entry has been removed.',
        variant: 'success',
      })
      setEntryPendingDelete(null)
      refreshData()
    } catch (error) {
      toast({
        title: 'Could not delete entry',
        description:
          error.response?.data?.detail || 'Please try again in a moment.',
        variant: 'error',
      })
    } finally {
      setDeletingEntryId('')
    }
  }

  const handleLoadMore = async () => {
    if (!nextPage || entriesLoadingMore) {
      return
    }

    setEntriesLoadingMore(true)

    try {
      const response = await getLogEntries(nextPage)
      setEntries((current) => [...current, ...(response?.results ?? [])])
      setEntriesCount(response?.count ?? entriesCount)
      setNextPage(response?.next ? nextPage + 1 : null)
    } catch (error) {
      toast({
        title: 'Could not load more entries',
        description:
          error.response?.data?.detail || 'Please try again in a moment.',
        variant: 'error',
      })
    } finally {
      setEntriesLoadingMore(false)
    }
  }

  const topMoodCounts =
    [...(summary?.mood_counts ?? [])]
      .filter((item) => item.count > 0)
      .sort((left, right) => right.count - left.count)
      .slice(0, 3)

  const selectedBehaviorResults = behaviorResults.filter(
    (behavior) => behavior.id !== selectedBehavior?.id
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-5 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:px-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to care home
          </Link>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Daily Log
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Keep the week visible.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Track mood shifts, attach a matching decoder behavior when useful, and keep a
                simple record for {user?.care_recipient_name || 'your care recipient'}.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-900">
              Weekly summary refreshes automatically from the last 7 days of entries.
            </div>
          </div>
        </header>

        <section className="rounded-[1.9rem] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Last 7 days
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Weekly summary
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {summary
                  ? formatSummaryDateRange(summary.start_date, summary.end_date)
                  : 'Recent Daily Log activity'}
              </p>
            </div>
            <Button type="button" variant="outline" className="rounded-full px-5" onClick={refreshData}>
              Refresh summary
            </Button>
          </div>

          {summaryLoading ? (
            <div className="mt-5 flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading weekly summary...
            </div>
          ) : summaryError ? (
            <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              {summaryError}
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryStat label="Entries" value={summary?.entry_count ?? 0} />
                <SummaryStat label="Linked behaviors" value={summary?.linked_behavior_count ?? 0} />
                <SummaryStat
                  label="Top mood"
                  value={topMoodCounts[0] ? topMoodCounts[0].label : 'None yet'}
                />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Mood counts
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {summary?.mood_counts?.map((item) => (
                    <Badge
                      key={item.mood}
                      variant={item.count > 0 ? 'secondary' : 'outline'}
                      className={
                        item.count > 0
                          ? 'border-slate-200 bg-white text-slate-700'
                          : 'border-slate-200 bg-transparent text-slate-500'
                      }
                    >
                      {item.label}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[1.9rem] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                {editingEntryId ? 'Edit entry' : 'Quick add'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {editingEntryId ? 'Update this log entry' : 'Add a Daily Log entry'}
              </h2>
            </div>
            {editingEntryId ? (
              <Button type="button" variant="ghost" className="rounded-full px-5" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Mood
              </label>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {DAILY_LOG_MOODS.map((mood) => (
                  <MoodToggle
                    key={mood.value}
                    mood={mood}
                    selected={moods.includes(mood.value)}
                    onToggle={handleToggleMood}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="daily-log-note"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  Note
                </label>
                <span className="text-xs font-medium text-slate-500">
                  {note.length}/{NOTE_LIMIT}
                </span>
              </div>
              <Textarea
                id="daily-log-note"
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, NOTE_LIMIT))}
                placeholder="Add a quick note about the moment, what helped, or what changed."
                className="mt-3 min-h-[120px] rounded-[1.4rem] border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="daily-log-behavior-search"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Link behavior (optional)
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="daily-log-behavior-search"
                  value={behaviorSearchInput}
                  onChange={(event) => setBehaviorSearchInput(event.target.value)}
                  placeholder={
                    selectedBehavior
                      ? 'Search to replace the linked behavior'
                      : 'Search decoder behaviors to attach one'
                  }
                  className="h-12 rounded-[1.1rem] border-slate-200 pl-11"
                  autoComplete="off"
                />
              </div>

              {selectedBehavior ? (
                <div className="mt-3">
                  <LinkedBehaviorPill
                    behavior={selectedBehavior}
                    onRemove={() => setSelectedBehavior(null)}
                  />
                </div>
              ) : null}

              {debouncedBehaviorSearch.length > 0 && debouncedBehaviorSearch.length < BEHAVIOR_SEARCH_MIN_LENGTH ? (
                <p className="mt-3 text-sm text-slate-500">
                  Type at least 2 characters to search behaviors.
                </p>
              ) : null}

              {behaviorResultsLoading ? (
                <div className="mt-3 flex items-center gap-3 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Searching behaviors...
                </div>
              ) : null}

              {behaviorResultsError ? (
                <div className="mt-3 rounded-[1.3rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                  {behaviorResultsError}
                </div>
              ) : null}

              {!behaviorResultsLoading &&
              debouncedBehaviorSearch.length >= BEHAVIOR_SEARCH_MIN_LENGTH &&
              !behaviorResultsError ? (
                selectedBehaviorResults.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {selectedBehaviorResults.map((behavior) => (
                      <BehaviorSuggestion
                        key={behavior.id}
                        behavior={behavior}
                        onSelect={(nextBehavior) => {
                          setSelectedBehavior(nextBehavior)
                          setBehaviorSearchInput('')
                          setBehaviorResults([])
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                    No behavior matches yet. Try a shorter keyword or browse the decoder first.
                  </div>
                )
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="rounded-full px-6" disabled={saving}>
                {saving ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingEntryId ? (
                  'Update entry'
                ) : (
                  'Save entry'
                )}
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link to="/decoder">Open decoder</Link>
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Recent entries
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Daily Log history
              </h2>
            </div>
            <p className="text-sm text-slate-500">{entriesCount} total entries</p>
          </div>

          {entriesLoading ? (
            <div className="flex items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600 shadow-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading recent entries...
            </div>
          ) : entriesError ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-5">
              <p className="text-sm leading-7 text-amber-900">{entriesError}</p>
              <Button type="button" variant="outline" className="mt-4 rounded-full px-5" onClick={refreshData}>
                Try again
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-6 shadow-sm">
              <p className="text-lg font-semibold tracking-tight text-slate-950">No entries yet</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Start with a quick mood check-in. Your recent notes and linked behaviors will stay here for easy review.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    editingId={editingLoadId}
                    deletingId={deletingEntryId}
                    onEdit={handleEditEntry}
                    onDelete={setEntryPendingDelete}
                  />
                ))}
              </div>

              {nextPage ? (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6"
                    disabled={entriesLoadingMore}
                    onClick={handleLoadMore}
                  >
                    {entriesLoadingMore ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      'Load more entries'
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <DeleteEntryDialog
        entry={entryPendingDelete}
        open={Boolean(entryPendingDelete)}
        deleting={Boolean(entryPendingDelete && deletingEntryId === entryPendingDelete.id)}
        onOpenChange={(open) => {
          if (!open && !deletingEntryId) {
            setEntryPendingDelete(null)
          }
        }}
        onConfirm={handleDeleteEntry}
      />
    </div>
  )
}

import { useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenText,
  LoaderCircle,
  PencilLine,
  Plus,
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
        'inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition active:scale-[0.985]',
        selected
          ? 'border-[rgb(var(--theme-primary-strong-rgb))] bg-[rgb(var(--theme-primary-soft-rgb))] text-[rgb(var(--theme-primary-ink-rgb))]'
          : 'border-[rgb(var(--theme-border-rgb))] bg-white text-foreground hover:border-primary/30',
      ].join(' ')}
      aria-pressed={selected}
    >
      {mood.label}
    </button>
  )
}

function SummaryChip({ label, value }) {
  return (
    <div className="soft-tile px-3 py-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function BehaviorSuggestion({ behavior, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(behavior)}
      className="soft-card pressable w-full p-3 text-left"
    >
      <Badge variant="outline">{behavior.category?.name}</Badge>
      <p className="mt-2 text-sm font-semibold text-foreground">{behavior.title}</p>
    </button>
  )
}

function LinkedBehaviorPill({ behavior, onRemove }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[rgb(var(--theme-primary-strong-rgb))] bg-[rgb(var(--theme-primary-soft-rgb))] px-3 py-2 text-sm text-[rgb(var(--theme-primary-ink-rgb))]">
      <BookOpenText className="h-4 w-4 shrink-0" />
      <span className="truncate font-medium">{behavior.title}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-1 transition hover:bg-white/60"
        aria-label="Remove linked behavior"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function EntryCard({ entry, editingId, deletingId, onEdit, onDelete }) {
  const linkedBehavior = entry.linked_behavior
  const moodDetails =
    entry.mood_details?.length
      ? entry.mood_details
      : entry.moods.map((mood) => ({ mood, label: getMoodLabel(mood) }))

  return (
    <article className="soft-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">
            {formatLogTimestamp(entry.created_at)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {moodDetails.map((item) => (
              <Badge key={`${entry.id}-${item.mood}`} variant="secondary">
                {item.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={editingId === entry.id}
            onClick={() => onEdit(entry.id)}
            aria-label="Edit entry"
          >
            {editingId === entry.id ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <PencilLine className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            disabled={deletingId === entry.id}
            onClick={() => onDelete(entry)}
            aria-label="Delete entry"
          >
            {deletingId === entry.id ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {linkedBehavior ? (
        <Link
          to={`/decoder/behavior/${linkedBehavior.slug}`}
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[rgb(var(--theme-primary-strong-rgb))] bg-[rgb(var(--theme-primary-soft-rgb)/0.72)] px-3 py-3 text-sm font-semibold text-[rgb(var(--theme-primary-ink-rgb))]"
        >
          <span className="truncate">{linkedBehavior.title}</span>
          <BookOpenText className="h-4 w-4 shrink-0" />
        </Link>
      ) : null}

      {entry.note ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{entry.note}</p>
      ) : null}
    </article>
  )
}

function DeleteEntryDialog({ entry, open, deleting, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete entry?</DialogTitle>
          <DialogDescription>This removes the selected Daily Log note.</DialogDescription>
        </DialogHeader>
        <div className="soft-tile p-4 text-sm leading-6 text-muted-foreground">
          {entry?.note || 'This entry has no note.'}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Keep
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Log() {
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
  const [formOpen, setFormOpen] = useState(false)
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
    }, 220)

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
            error.response?.data?.detail || 'Weekly summary could not be loaded.'
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
            error.response?.data?.detail || 'Recent entries could not be loaded.'
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
            error.response?.data?.detail || 'Behavior search is unavailable.'
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

  const openNewEntry = () => {
    resetForm()
    setFormOpen(true)
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
        title: 'Pick a mood',
        description: 'Choose at least one mood before saving.',
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
        variant: 'success',
      })
      resetForm()
      setFormOpen(false)
      refreshData()
    } catch (error) {
      toast({
        title: 'Could not save entry',
        description:
          error.response?.data?.detail || 'Review the form and try again.',
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
      setFormOpen(true)
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
    if (!entryPendingDelete) return

    setDeletingEntryId(entryPendingDelete.id)

    try {
      await deleteLogEntry(entryPendingDelete.id)
      if (editingEntryId === entryPendingDelete.id) {
        resetForm()
        setFormOpen(false)
      }
      toast({ title: 'Entry deleted', variant: 'success' })
      setEntryPendingDelete(null)
      refreshData()
    } catch (error) {
      toast({
        title: 'Could not delete entry',
        description: error.response?.data?.detail || 'Try again in a moment.',
        variant: 'error',
      })
    } finally {
      setDeletingEntryId('')
    }
  }

  const handleLoadMore = async () => {
    if (!nextPage || entriesLoadingMore) return

    setEntriesLoadingMore(true)

    try {
      const response = await getLogEntries(nextPage)
      setEntries((current) => [...current, ...(response?.results ?? [])])
      setEntriesCount(response?.count ?? entriesCount)
      setNextPage(response?.next ? nextPage + 1 : null)
    } catch (error) {
      toast({
        title: 'Could not load more entries',
        description: error.response?.data?.detail || 'Try again in a moment.',
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
    <div className="page-shell screen-enter">
      <div className="page-stack max-w-3xl space-y-4">
        <section className="soft-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Daily Log
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary
                  ? formatSummaryDateRange(summary.start_date, summary.end_date)
                  : 'Last 7 days'}
              </p>
            </div>
            <Button type="button" onClick={openNewEntry}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          {summaryLoading ? (
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : summaryError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {summaryError}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SummaryChip label="Entries" value={summary?.entry_count ?? 0} />
              <SummaryChip label="Linked" value={summary?.linked_behavior_count ?? 0} />
              <SummaryChip label="Top mood" value={topMoodCounts[0]?.label || 'None'} />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Recent</h2>
            <p className="text-sm text-muted-foreground">{entriesCount} total</p>
          </div>

          {entriesLoading ? (
            <div className="soft-tile flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : entriesError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {entriesError}
            </div>
          ) : entries.length === 0 ? (
            <div className="soft-card p-5 text-sm leading-6 text-muted-foreground">
              No entries yet. Add a quick mood check-in when something changes.
            </div>
          ) : (
            <div className="grid gap-3">
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
          )}

          {nextPage ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={entriesLoadingMore}
              onClick={handleLoadMore}
            >
              {entriesLoadingMore ? 'Loading...' : 'Load more'}
            </Button>
          ) : null}
        </section>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open && !saving) {
            resetForm()
          }
        }}
      >
        <DialogContent className="mobile-sheet max-h-[90vh] overflow-y-auto md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntryId ? 'Edit entry' : 'Add entry'}</DialogTitle>
            <DialogDescription>Pick a mood, add a short note, and link a behavior if useful.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Mood</p>
              <div className="mt-3 flex flex-wrap gap-2">
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
                <label htmlFor="daily-log-note" className="text-sm font-semibold text-foreground">
                  Note
                </label>
                <span className="text-xs font-medium text-muted-foreground">
                  {note.length}/{NOTE_LIMIT}
                </span>
              </div>
              <Textarea
                id="daily-log-note"
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, NOTE_LIMIT))}
                placeholder="What happened?"
                className="mt-2 min-h-[112px] bg-white"
              />
            </div>

            <div>
              <label htmlFor="daily-log-behavior-search" className="text-sm font-semibold text-foreground">
                Link behavior
              </label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="daily-log-behavior-search"
                  value={behaviorSearchInput}
                  onChange={(event) => setBehaviorSearchInput(event.target.value)}
                  placeholder={selectedBehavior ? 'Search to replace' : 'Search decoder'}
                  className="pl-11"
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

              {behaviorResultsLoading ? (
                <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : null}

              {behaviorResultsError ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
                  <p className="mt-3 text-sm text-muted-foreground">No behavior matches.</p>
                )
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingEntryId ? (
                  'Update'
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

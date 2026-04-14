import { useEffect, useState } from 'react'
import { Clock3, LoaderCircle, PencilLine, Plus, Trash2 } from 'lucide-react'

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
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import {
  archiveMedication,
  createMedication,
  getMedicationAdherence,
  getUpcomingDoses,
  listMedications,
  logMedicationDose,
  updateMedication,
} from '@/services/medications'
import {
  createEmptyFixedScheduleRow,
  formatMedicationDateRange,
  formatMedicationDateTime,
  getMedicationStatusLabel,
  MEDICATION_STATUSES,
  MEDICATION_WEEKDAYS,
} from '@/utils/medications'
import { getBrowserTimezone } from '@/utils/timezones'

const DEFAULT_INTERVAL_SCHEDULE = {
  interval_hours: '8',
  anchor_time: '06:00',
}

function buildInitialFormState() {
  return {
    name: '',
    dose: '',
    scheduleType: 'fixed',
    fixedSchedules: [createEmptyFixedScheduleRow()],
    intervalSchedule: { ...DEFAULT_INTERVAL_SCHEDULE },
  }
}

function normalizeTimeInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function SummaryChip({ label, value }) {
  return (
    <div className="soft-tile px-3 py-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function WeekdayChip({ day, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(day.value)}
      className={[
        'inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition active:scale-[0.985]',
        selected
          ? 'border-[rgb(var(--theme-primary-strong-rgb))] bg-[rgb(var(--theme-primary-soft-rgb))] text-[rgb(var(--theme-primary-ink-rgb))]'
          : 'border-[rgb(var(--theme-border-rgb))] bg-white text-foreground hover:border-primary/30',
      ].join(' ')}
      aria-pressed={selected}
    >
      {day.label}
    </button>
  )
}

function FixedScheduleEditor({ schedules, onChange, onRemoveRow }) {
  const updateScheduleRow = (rowId, patch) => {
    onChange((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    )
  }

  const toggleWeekday = (rowId, weekday) => {
    onChange((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row

        const days_of_week = row.days_of_week.includes(weekday)
          ? row.days_of_week.filter((value) => value !== weekday)
          : [...row.days_of_week, weekday]

        return { ...row, days_of_week }
      })
    )
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule, index) => (
        <div key={schedule.id} className="soft-tile p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Time {index + 1}</p>
            {schedules.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-rose-700 hover:bg-rose-50"
                onClick={() => onRemoveRow(schedule.id)}
              >
                Remove
              </Button>
            ) : null}
          </div>

          <Label
            htmlFor={`fixed-time-${schedule.id}`}
            className="mt-3 block text-sm font-semibold text-foreground"
          >
            Time
          </Label>
          <Input
            id={`fixed-time-${schedule.id}`}
            type="time"
            value={schedule.time_of_day}
            onChange={(event) =>
              updateScheduleRow(schedule.id, { time_of_day: event.target.value })
            }
            className="mt-2 bg-white"
          />

          <p className="mt-4 text-sm font-semibold text-foreground">Days</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MEDICATION_WEEKDAYS.map((day) => (
              <WeekdayChip
                key={`${schedule.id}-${day.value}`}
                day={day}
                selected={schedule.days_of_week.includes(day.value)}
                onToggle={(value) => toggleWeekday(schedule.id, value)}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Leave blank for every day.</p>
        </div>
      ))}
    </div>
  )
}

function UpcomingDoseCard({ dose, loggingKey, timeZone, onLogStatus }) {
  const rowKey = `${dose.medication.id}:${dose.scheduled_for}`

  return (
    <article className="soft-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
            {formatMedicationDateTime(dose.scheduled_for, timeZone)}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{dose.medication.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {dose.medication.dose} - {dose.medication.schedule_summary}
          </p>
        </div>
        <Badge variant={dose.status ? 'secondary' : 'outline'}>
          {dose.status ? getMedicationStatusLabel(dose.status) : 'Open'}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {MEDICATION_STATUSES.map((statusItem) => (
          <Button
            key={`${rowKey}-${statusItem.value}`}
            type="button"
            variant={dose.status === statusItem.value ? 'default' : 'outline'}
            size="sm"
            disabled={loggingKey === rowKey}
            onClick={() => onLogStatus(dose, statusItem.value)}
          >
            {loggingKey === rowKey && dose.status !== statusItem.value ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              statusItem.label
            )}
          </Button>
        ))}
      </div>
    </article>
  )
}

function MedicationCard({ medication, timeZone, onEdit, onArchive }) {
  const latestLog = medication.latest_log

  return (
    <article className="soft-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{medication.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{medication.dose}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {medication.schedule_summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(medication)} aria-label="Edit medication">
            <PencilLine className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => onArchive(medication)}
            aria-label="Archive medication"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {latestLog ? (
        <div className="mt-4 soft-tile p-3">
          <p className="text-xs font-semibold text-muted-foreground">Latest</p>
          <p className="mt-1 text-sm text-foreground">
            {getMedicationStatusLabel(latestLog.status)} at{' '}
            {formatMedicationDateTime(latestLog.scheduled_for, timeZone)}
          </p>
        </div>
      ) : null}
    </article>
  )
}

function ArchiveMedicationDialog({ medication, open, archiving, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Archive medication?</DialogTitle>
          <DialogDescription>Logged history stays intact.</DialogDescription>
        </DialogHeader>
        <div className="soft-tile p-4 text-sm text-muted-foreground">
          {medication ? `${medication.name} - ${medication.dose}` : 'Selected medication'}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={archiving}>
            Keep
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={archiving}>
            {archiving ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Medications() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [formState, setFormState] = useState(() => buildInitialFormState())
  const [editingMedicationId, setEditingMedicationId] = useState('')
  const [medications, setMedications] = useState([])
  const [upcomingDoses, setUpcomingDoses] = useState([])
  const [adherence, setAdherence] = useState(null)
  const [medicationsLoading, setMedicationsLoading] = useState(true)
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [adherenceLoading, setAdherenceLoading] = useState(true)
  const [medicationsError, setMedicationsError] = useState('')
  const [upcomingError, setUpcomingError] = useState('')
  const [adherenceError, setAdherenceError] = useState('')
  const [savingMedication, setSavingMedication] = useState(false)
  const [loggingKey, setLoggingKey] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archivingMedicationId, setArchivingMedicationId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [timezoneSyncAttempted, setTimezoneSyncAttempted] = useState(false)
  const [timezoneResolved, setTimezoneResolved] = useState(false)
  const [timezoneNotice, setTimezoneNotice] = useState('')

  const browserTimezone = getBrowserTimezone()
  const effectiveTimezone = user?.timezone || browserTimezone || 'UTC'

  useEffect(() => {
    if (!user) return

    if (user.timezone) {
      setTimezoneResolved(true)
      setTimezoneNotice('')
      return
    }

    if (timezoneSyncAttempted) {
      setTimezoneResolved(true)
      return
    }

    setTimezoneSyncAttempted(true)

    if (!browserTimezone) {
      setTimezoneNotice('Add your timezone in Profile so medication timing stays accurate.')
      setTimezoneResolved(true)
      return
    }

    const syncTimezone = async () => {
      const result = await updateUser({ timezone: browserTimezone })
      if (!result.success) {
        setTimezoneNotice(result.error || 'Timezone could not be saved automatically.')
      }
      setTimezoneResolved(true)
    }

    syncTimezone()
  }, [browserTimezone, timezoneSyncAttempted, updateUser, user])

  useEffect(() => {
    if (!user || (!user.timezone && !timezoneResolved)) return

    let cancelled = false

    const loadTracker = async () => {
      setMedicationsLoading(true)
      setUpcomingLoading(true)
      setAdherenceLoading(true)
      setMedicationsError('')
      setUpcomingError('')
      setAdherenceError('')

      const [medicationsResult, upcomingResult, adherenceResult] =
        await Promise.allSettled([
          listMedications(),
          getUpcomingDoses(),
          getMedicationAdherence('week'),
        ])

      if (cancelled) return

      if (medicationsResult.status === 'fulfilled') {
        setMedications(medicationsResult.value)
      } else {
        setMedications([])
        setMedicationsError(
          medicationsResult.reason?.response?.data?.detail ||
            'Active medications could not be loaded.'
        )
      }
      setMedicationsLoading(false)

      if (upcomingResult.status === 'fulfilled') {
        setUpcomingDoses(upcomingResult.value)
      } else {
        setUpcomingDoses([])
        setUpcomingError(
          upcomingResult.reason?.response?.data?.detail ||
            'Upcoming doses could not be loaded.'
        )
      }
      setUpcomingLoading(false)

      if (adherenceResult.status === 'fulfilled') {
        setAdherence(adherenceResult.value)
      } else {
        setAdherence(null)
        setAdherenceError(
          adherenceResult.reason?.response?.data?.detail ||
            'Adherence summary could not be loaded.'
        )
      }
      setAdherenceLoading(false)
    }

    loadTracker()

    return () => {
      cancelled = true
    }
  }, [refreshKey, timezoneResolved, user])

  const refreshTracker = () => {
    setRefreshKey((current) => current + 1)
  }

  const resetForm = () => {
    setFormState(buildInitialFormState())
    setEditingMedicationId('')
  }

  const openNewMedication = () => {
    resetForm()
    setFormOpen(true)
  }

  const handleScheduleTypeChange = (scheduleType) => {
    setFormState((current) => ({ ...current, scheduleType }))
  }

  const handleFixedScheduleChange = (updater) => {
    setFormState((current) => ({
      ...current,
      fixedSchedules:
        typeof updater === 'function' ? updater(current.fixedSchedules) : updater,
    }))
  }

  const handleAddFixedScheduleRow = () => {
    handleFixedScheduleChange((current) => [...current, createEmptyFixedScheduleRow()])
  }

  const handleRemoveFixedScheduleRow = (rowId) => {
    handleFixedScheduleChange((current) =>
      current.length > 1 ? current.filter((row) => row.id !== rowId) : current
    )
  }

  const buildMedicationPayload = () => {
    const name = formState.name.trim()
    const dose = formState.dose.trim()

    if (!name || !dose) {
      return { error: 'Medication name and dose are required.' }
    }

    if (formState.scheduleType === 'fixed') {
      const schedules = formState.fixedSchedules
        .filter((row) => row.time_of_day)
        .map((row) => ({
          schedule_type: 'fixed',
          time_of_day: row.time_of_day,
          days_of_week: row.days_of_week,
        }))

      if (schedules.length === 0) {
        return { error: 'Add at least one fixed time.' }
      }

      return { payload: { name, dose, schedules } }
    }

    if (!formState.intervalSchedule.interval_hours || !formState.intervalSchedule.anchor_time) {
      return { error: 'Interval meds need hours and an anchor time.' }
    }

    return {
      payload: {
        name,
        dose,
        schedules: [
          {
            schedule_type: 'interval',
            interval_hours: Number(formState.intervalSchedule.interval_hours),
            anchor_time: formState.intervalSchedule.anchor_time,
          },
        ],
      },
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const { payload, error } = buildMedicationPayload()

    if (error) {
      toast({ title: 'Could not save medication', description: error, variant: 'warning' })
      return
    }

    setSavingMedication(true)

    try {
      if (editingMedicationId) {
        await updateMedication(editingMedicationId, payload)
      } else {
        await createMedication(payload)
      }

      toast({ title: editingMedicationId ? 'Medication updated' : 'Medication added', variant: 'success' })
      resetForm()
      setFormOpen(false)
      refreshTracker()
    } catch (requestError) {
      toast({
        title: 'Could not save medication',
        description:
          requestError.response?.data?.detail || 'Review the schedule and try again.',
        variant: 'error',
        duration: 4500,
      })
    } finally {
      setSavingMedication(false)
    }
  }

  const handleEditMedication = (medication) => {
    const scheduleType = medication.schedules[0]?.schedule_type || 'fixed'

    setEditingMedicationId(medication.id)
    setFormState({
      name: medication.name,
      dose: medication.dose,
      scheduleType,
      fixedSchedules:
        scheduleType === 'fixed'
          ? medication.schedules.map((schedule) => ({
              id: schedule.id,
              time_of_day: normalizeTimeInputValue(schedule.time_of_day),
              days_of_week: schedule.days_of_week || [],
            }))
          : [createEmptyFixedScheduleRow()],
      intervalSchedule:
        scheduleType === 'interval'
          ? {
              interval_hours: String(medication.schedules[0]?.interval_hours || ''),
              anchor_time: normalizeTimeInputValue(medication.schedules[0]?.anchor_time),
            }
          : { ...DEFAULT_INTERVAL_SCHEDULE },
    })
    setFormOpen(true)
  }

  const handleArchiveMedication = async () => {
    if (!archiveTarget) return

    setArchivingMedicationId(archiveTarget.id)

    try {
      await archiveMedication(archiveTarget.id)
      if (editingMedicationId === archiveTarget.id) {
        resetForm()
        setFormOpen(false)
      }
      toast({ title: 'Medication archived', variant: 'success' })
      setArchiveTarget(null)
      refreshTracker()
    } catch (requestError) {
      toast({
        title: 'Could not archive medication',
        description: requestError.response?.data?.detail || 'Try again in a moment.',
        variant: 'error',
      })
    } finally {
      setArchivingMedicationId('')
    }
  }

  const handleLogStatus = async (dose, statusValue) => {
    const rowKey = `${dose.medication.id}:${dose.scheduled_for}`
    setLoggingKey(rowKey)

    setUpcomingDoses((current) =>
      current.map((item) =>
        item.medication.id === dose.medication.id && item.scheduled_for === dose.scheduled_for
          ? { ...item, status: statusValue, logged_at: new Date().toISOString() }
          : item
      )
    )

    try {
      await logMedicationDose({
        medication_id: dose.medication.id,
        scheduled_for: dose.scheduled_for,
        status: statusValue,
      })
      refreshTracker()
    } catch (requestError) {
      toast({
        title: 'Could not log dose',
        description: requestError.response?.data?.detail || 'Try again in a moment.',
        variant: 'error',
      })
      refreshTracker()
    } finally {
      setLoggingKey('')
    }
  }

  const topMedicationRow = adherence?.medications?.[0] || null

  return (
    <div className="page-shell screen-enter">
      <div className="page-stack max-w-3xl space-y-4">
        <section className="soft-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Medications
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {adherence
                  ? formatMedicationDateRange(adherence.start_date, adherence.end_date, effectiveTimezone)
                  : 'Next doses and weekly adherence'}
              </p>
            </div>
            <Button type="button" onClick={openNewMedication}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
          {timezoneNotice ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {timezoneNotice}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock3 className="h-5 w-5 text-primary" />
              Next doses
            </h2>
          </div>

          {upcomingLoading ? (
            <div className="soft-tile flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : upcomingError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {upcomingError}
            </div>
          ) : upcomingDoses.length === 0 ? (
            <div className="soft-card p-5 text-sm leading-6 text-muted-foreground">
              No upcoming doses in the next 24 hours.
            </div>
          ) : (
            <div className="grid gap-3">
              {upcomingDoses.map((dose) => (
                <UpcomingDoseCard
                  key={`${dose.medication.id}:${dose.scheduled_for}`}
                  dose={dose}
                  loggingKey={loggingKey}
                  timeZone={effectiveTimezone}
                  onLogStatus={handleLogStatus}
                />
              ))}
            </div>
          )}
        </section>

        <section className="soft-card p-4">
          <h2 className="text-lg font-semibold text-foreground">Week</h2>
          {adherenceLoading ? (
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : adherenceError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {adherenceError}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <SummaryChip label="Expected" value={adherence?.expected_count ?? 0} />
              <SummaryChip label="Logged" value={adherence?.logged_count ?? 0} />
              <SummaryChip label="Pending" value={adherence?.pending_count ?? 0} />
              <SummaryChip label="Top med" value={topMedicationRow ? topMedicationRow.medication.name : 'None'} />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Active meds</h2>
            <p className="text-sm text-muted-foreground">{medications.length} active</p>
          </div>

          {medicationsLoading ? (
            <div className="soft-tile flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : medicationsError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {medicationsError}
            </div>
          ) : medications.length === 0 ? (
            <div className="soft-card p-5 text-sm leading-6 text-muted-foreground">
              Add the first medication to start tracking.
            </div>
          ) : (
            <div className="grid gap-3">
              {medications.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  timeZone={effectiveTimezone}
                  onEdit={handleEditMedication}
                  onArchive={setArchiveTarget}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open && !savingMedication) {
            resetForm()
          }
        }}
      >
        <DialogContent className="mobile-sheet max-h-[90vh] overflow-y-auto md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMedicationId ? 'Edit medication' : 'Add medication'}</DialogTitle>
            <DialogDescription>Name, dose, and schedule.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="medication-name" className="text-sm font-semibold text-foreground">
                  Medication name
                </Label>
                <Input
                  id="medication-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-2"
                  placeholder="Donepezil"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="medication-dose" className="text-sm font-semibold text-foreground">
                  Dose
                </Label>
                <Input
                  id="medication-dose"
                  value={formState.dose}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, dose: event.target.value }))
                  }
                  className="mt-2"
                  placeholder="10 mg"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">Schedule type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formState.scheduleType === 'fixed' ? 'default' : 'outline'}
                  onClick={() => handleScheduleTypeChange('fixed')}
                >
                  Fixed
                </Button>
                <Button
                  type="button"
                  variant={formState.scheduleType === 'interval' ? 'default' : 'outline'}
                  onClick={() => handleScheduleTypeChange('interval')}
                >
                  Interval
                </Button>
              </div>
            </div>

            {formState.scheduleType === 'fixed' ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Times</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddFixedScheduleRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add time
                  </Button>
                </div>
                <div className="mt-3">
                  <FixedScheduleEditor
                    schedules={formState.fixedSchedules}
                    onChange={handleFixedScheduleChange}
                    onRemoveRow={handleRemoveFixedScheduleRow}
                  />
                </div>
              </div>
            ) : (
              <div className="soft-tile p-3">
                <p className="text-sm font-semibold text-foreground">Interval</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="interval-hours" className="text-sm font-semibold text-foreground">
                      Every N hours
                    </Label>
                    <Input
                      id="interval-hours"
                      type="number"
                      min="1"
                      max="24"
                      value={formState.intervalSchedule.interval_hours}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          intervalSchedule: {
                            ...current.intervalSchedule,
                            interval_hours: event.target.value,
                          },
                        }))
                      }
                      className="mt-2 bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="anchor-time" className="text-sm font-semibold text-foreground">
                      Anchor time
                    </Label>
                    <Input
                      id="anchor-time"
                      type="time"
                      value={formState.intervalSchedule.anchor_time}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          intervalSchedule: {
                            ...current.intervalSchedule,
                            anchor_time: event.target.value,
                          },
                        }))
                      }
                      className="mt-2 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={savingMedication}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingMedication}>
                {savingMedication ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingMedicationId ? (
                  'Update'
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ArchiveMedicationDialog
        medication={archiveTarget}
        open={Boolean(archiveTarget)}
        archiving={Boolean(archiveTarget && archivingMedicationId === archiveTarget.id)}
        onOpenChange={(open) => {
          if (!open && !archivingMedicationId) {
            setArchiveTarget(null)
          }
        }}
        onConfirm={handleArchiveMedication}
      />
    </div>
  )
}

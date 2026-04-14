import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock3,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
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
  if (!value) {
    return ''
  }

  return String(value).slice(0, 5)
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  )
}

function WeekdayChip({ day, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(day.value)}
      className={[
        'inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition',
        selected
          ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50',
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
        if (row.id !== rowId) {
          return row
        }

        const days_of_week = row.days_of_week.includes(weekday)
          ? row.days_of_week.filter((value) => value !== weekday)
          : [...row.days_of_week, weekday]

        return { ...row, days_of_week }
      })
    )
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule, index) => (
        <div
          key={schedule.id}
          className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">Time slot {index + 1}</p>
            {schedules.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-full px-3 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                onClick={() => onRemoveRow(schedule.id)}
              >
                Remove
              </Button>
            ) : null}
          </div>

          <div className="mt-4">
            <Label
              htmlFor={`fixed-time-${schedule.id}`}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
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
              className="mt-2 h-11 rounded-2xl border-slate-200 bg-white"
            />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Days
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MEDICATION_WEEKDAYS.map((day) => (
                <WeekdayChip
                  key={`${schedule.id}-${day.value}`}
                  day={day}
                  selected={schedule.days_of_week.includes(day.value)}
                  onToggle={(value) => toggleWeekday(schedule.id, value)}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Leave all weekdays unselected to repeat every day.
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function UpcomingDoseCard({
  dose,
  loggingKey,
  timeZone,
  onLogStatus,
}) {
  const rowKey = `${dose.medication.id}:${dose.scheduled_for}`

  return (
    <article className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {formatMedicationDateTime(dose.scheduled_for, timeZone)}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            {dose.medication.name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {dose.medication.dose} • {dose.medication.schedule_summary}
          </p>
        </div>
        <Badge
          variant={dose.status ? 'secondary' : 'outline'}
          className={
            dose.status
              ? 'border-slate-200 bg-slate-100 text-slate-700'
              : 'border-slate-200 bg-white text-slate-500'
          }
        >
          {dose.status ? getMedicationStatusLabel(dose.status) : 'Unlogged'}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {MEDICATION_STATUSES.map((statusItem) => (
          <Button
            key={`${rowKey}-${statusItem.value}`}
            type="button"
            variant={dose.status === statusItem.value ? 'default' : 'outline'}
            className="rounded-full px-4"
            disabled={loggingKey === rowKey}
            onClick={() => onLogStatus(dose, statusItem.value)}
          >
            {loggingKey === rowKey && dose.status !== statusItem.value ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
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
    <article className="rounded-[1.7rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            {medication.name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{medication.dose}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {medication.schedule_summary}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full px-4"
            onClick={() => onEdit(medication)}
          >
            <PencilLine className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-4 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => onArchive(medication)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      {latestLog ? (
        <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Latest logged dose
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {latestLog.medication_name_snapshot} • {latestLog.dose_snapshot}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {getMedicationStatusLabel(latestLog.status)} at{' '}
            {formatMedicationDateTime(latestLog.scheduled_for, timeZone)}
          </p>
        </div>
      ) : null}
    </article>
  )
}

function ArchiveMedicationDialog({
  medication,
  open,
  archiving,
  onOpenChange,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Archive this medication?</DialogTitle>
          <DialogDescription>
            The medication will leave the active tracker, but logged history stays intact.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          {medication ? `${medication.name} • ${medication.dose}` : 'Selected medication'}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiving}
          >
            Keep active
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={archiving}
          >
            {archiving ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Archiving...
              </>
            ) : (
              'Archive medication'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Medications() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
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
    if (!user) {
      return
    }

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
        setTimezoneNotice(
          result.error || 'Timezone could not be saved automatically. Update it in Profile.'
        )
      }
      setTimezoneResolved(true)
    }

    syncTimezone()
  }, [browserTimezone, timezoneSyncAttempted, updateUser, user])

  useEffect(() => {
    if (!user || (!user.timezone && !timezoneResolved)) {
      return
    }

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

      if (cancelled) {
        return
      }

      if (medicationsResult.status === 'fulfilled') {
        setMedications(medicationsResult.value)
      } else {
        setMedications([])
        setMedicationsError(
          medicationsResult.reason?.response?.data?.detail ||
            'Active medications could not be loaded right now.'
        )
      }
      setMedicationsLoading(false)

      if (upcomingResult.status === 'fulfilled') {
        setUpcomingDoses(upcomingResult.value)
      } else {
        setUpcomingDoses([])
        setUpcomingError(
          upcomingResult.reason?.response?.data?.detail ||
            'Upcoming doses could not be loaded right now.'
        )
      }
      setUpcomingLoading(false)

      if (adherenceResult.status === 'fulfilled') {
        setAdherence(adherenceResult.value)
      } else {
        setAdherence(null)
        setAdherenceError(
          adherenceResult.reason?.response?.data?.detail ||
            'Adherence summary could not be loaded right now.'
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

  const handleScheduleTypeChange = (scheduleType) => {
    setFormState((current) => ({
      ...current,
      scheduleType,
    }))
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
        return { error: 'Add at least one fixed time before saving.' }
      }

      return { payload: { name, dose, schedules } }
    }

    if (!formState.intervalSchedule.interval_hours || !formState.intervalSchedule.anchor_time) {
      return { error: 'Interval medications need hours and an anchor time.' }
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
      toast({
        title: 'Could not save medication',
        description: error,
        variant: 'warning',
      })
      return
    }

    setSavingMedication(true)

    try {
      if (editingMedicationId) {
        await updateMedication(editingMedicationId, payload)
      } else {
        await createMedication(payload)
      }

      toast({
        title: editingMedicationId ? 'Medication updated' : 'Medication added',
        description: editingMedicationId
          ? 'The medication schedule has been updated.'
          : 'The medication has been added to the tracker.',
        variant: 'success',
      })
      resetForm()
      refreshTracker()
    } catch (requestError) {
      toast({
        title: 'Could not save medication',
        description:
          requestError.response?.data?.detail || 'Please review the schedule and try again.',
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

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleArchiveMedication = async () => {
    if (!archiveTarget) {
      return
    }

    setArchivingMedicationId(archiveTarget.id)

    try {
      await archiveMedication(archiveTarget.id)
      if (editingMedicationId === archiveTarget.id) {
        resetForm()
      }
      toast({
        title: 'Medication archived',
        description: 'The medication left the active tracker and kept its history.',
        variant: 'success',
      })
      setArchiveTarget(null)
      refreshTracker()
    } catch (requestError) {
      toast({
        title: 'Could not archive medication',
        description:
          requestError.response?.data?.detail || 'Please try again in a moment.',
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
          ? {
              ...item,
              status: statusValue,
              logged_at: new Date().toISOString(),
            }
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
        description:
          requestError.response?.data?.detail || 'Please try again in a moment.',
        variant: 'error',
      })
      refreshTracker()
    } finally {
      setLoggingKey('')
    }
  }

  const topMedicationRow = adherence?.medications?.[0] || null

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f4faf7_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
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
                Medication Tracker
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Keep doses organized without extra noise.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Add fixed or interval schedules, log doses in-app, and keep adherence visible for{' '}
                {user?.care_recipient_name || 'your care recipient'}.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-900">
              Reminder delivery is still intentionally deferred. This MVP stays focused on in-app tracking.
            </div>
          </div>
          {timezoneNotice ? (
            <div className="rounded-[1.3rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              {timezoneNotice}
            </div>
          ) : null}
        </header>

        <section className="rounded-[1.9rem] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Last 7 days
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Adherence summary
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {adherence
                  ? formatMedicationDateRange(
                      adherence.start_date,
                      adherence.end_date,
                      effectiveTimezone
                    )
                  : 'Rolling weekly adherence'}
              </p>
            </div>
            <Button type="button" variant="outline" className="rounded-full px-5" onClick={refreshTracker}>
              Refresh tracker
            </Button>
          </div>

          {adherenceLoading ? (
            <div className="mt-5 flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading adherence summary...
            </div>
          ) : adherenceError ? (
            <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              {adherenceError}
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryStat label="Expected doses" value={adherence?.expected_count ?? 0} />
                <SummaryStat label="Logged doses" value={adherence?.logged_count ?? 0} />
                <SummaryStat label="Pending" value={adherence?.pending_count ?? 0} />
                <SummaryStat
                  label="Top medication"
                  value={topMedicationRow ? topMedicationRow.medication.name : 'None yet'}
                />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Dose status counts
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {adherence?.status_counts?.map((item) => (
                    <Badge
                      key={item.status}
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

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[1.9rem] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Next 24 hours
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Upcoming doses
                </h2>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Clock3 className="h-5 w-5" />
              </span>
            </div>

            {upcomingLoading ? (
              <div className="mt-5 flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading upcoming doses...
              </div>
            ) : upcomingError ? (
              <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                {upcomingError}
              </div>
            ) : upcomingDoses.length === 0 ? (
              <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                No upcoming doses are scheduled in the next 24 hours.
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
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
          </div>

          <div className="rounded-[1.9rem] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {editingMedicationId ? 'Edit medication' : 'Add medication'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {editingMedicationId ? 'Update the medication schedule' : 'Create a medication'}
                </h2>
              </div>
              {editingMedicationId ? (
                <Button type="button" variant="ghost" className="rounded-full px-5" onClick={resetForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="medication-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Medication name
                  </Label>
                  <Input
                    id="medication-name"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, name: event.target.value }))
                    }
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="Donepezil"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="medication-dose" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Dose
                  </Label>
                  <Input
                    id="medication-dose"
                    value={formState.dose}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, dose: event.target.value }))
                    }
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="10 mg"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Schedule type
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={formState.scheduleType === 'fixed' ? 'default' : 'outline'}
                    className="rounded-full px-5"
                    onClick={() => handleScheduleTypeChange('fixed')}
                  >
                    Fixed times
                  </Button>
                  <Button
                    type="button"
                    variant={formState.scheduleType === 'interval' ? 'default' : 'outline'}
                    className="rounded-full px-5"
                    onClick={() => handleScheduleTypeChange('interval')}
                  >
                    Interval dosing
                  </Button>
                </div>
              </div>

              {formState.scheduleType === 'fixed' ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Fixed time schedule</p>
                      <p className="text-sm text-slate-500">
                        Add one or more daily times, and optionally limit them to certain weekdays.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4"
                      onClick={handleAddFixedScheduleRow}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add time
                    </Button>
                  </div>
                  <div className="mt-4">
                    <FixedScheduleEditor
                      schedules={formState.fixedSchedules}
                      onChange={handleFixedScheduleChange}
                      onRemoveRow={handleRemoveFixedScheduleRow}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">Interval schedule</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Use this for doses that repeat every set number of hours from a starting time.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="interval-hours" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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
                        className="mt-2 h-12 rounded-2xl border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="anchor-time" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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
                        className="mt-2 h-12 rounded-2xl border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="rounded-full px-6" disabled={savingMedication}>
                  {savingMedication ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingMedicationId ? (
                    'Update medication'
                  ) : (
                    'Save medication'
                  )}
                </Button>
                <Button asChild variant="outline" className="rounded-full px-6">
                  <Link to="/profile">Edit timezone in profile</Link>
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Active medications
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Medication list
              </h2>
            </div>
            <p className="text-sm text-slate-500">{medications.length} active medications</p>
          </div>

          {medicationsLoading ? (
            <div className="flex items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600 shadow-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading medications...
            </div>
          ) : medicationsError ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
              {medicationsError}
            </div>
          ) : medications.length === 0 ? (
            <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-6 shadow-sm">
              <p className="text-lg font-semibold tracking-tight text-slate-950">
                No medications added yet
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Add the first medication above to start seeing upcoming doses and adherence.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
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

      <ArchiveMedicationDialog
        medication={archiveTarget}
        open={Boolean(archiveTarget)}
        archiving={Boolean(
          archiveTarget && archivingMedicationId === archiveTarget.id
        )}
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

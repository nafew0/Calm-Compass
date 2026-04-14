export const MEDICATION_WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

export const MEDICATION_STATUSES = [
  { value: 'taken', label: 'Taken' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'refused', label: 'Refused' },
]

const MEDICATION_STATUS_LABELS = Object.fromEntries(
  MEDICATION_STATUSES.map((status) => [status.value, status.label])
)

const DATE_TIME_FORMATTER_CACHE = new Map()
const TIME_FORMATTER_CACHE = new Map()
const DATE_FORMATTER_CACHE = new Map()

function getFormatter(cache, timeZone, options) {
  const cacheKey = `${timeZone}:${JSON.stringify(options)}`
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || undefined,
        ...options,
      })
    )
  }
  return cache.get(cacheKey)
}

export function getMedicationStatusLabel(status) {
  return MEDICATION_STATUS_LABELS[status] || status
}

export function formatMedicationDateTime(value, timeZone) {
  if (!value) {
    return ''
  }

  try {
    const formatter = getFormatter(DATE_TIME_FORMATTER_CACHE, timeZone, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    return formatter.format(new Date(value))
  } catch (error) {
    return value
  }
}

export function formatMedicationTime(value, timeZone) {
  if (!value) {
    return ''
  }

  try {
    const formatter = getFormatter(TIME_FORMATTER_CACHE, timeZone, {
      timeStyle: 'short',
    })
    return formatter.format(new Date(value))
  } catch (error) {
    return value
  }
}

export function formatMedicationDateRange(startDate, endDate, timeZone) {
  if (!startDate || !endDate) {
    return 'Last 7 days'
  }

  try {
    const formatter = getFormatter(DATE_FORMATTER_CACHE, timeZone, {
      month: 'short',
      day: 'numeric',
    })
    return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`
  } catch (error) {
    return 'Last 7 days'
  }
}

export function createEmptyFixedScheduleRow() {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    time_of_day: '',
    days_of_week: [],
  }
}

export const DAILY_LOG_MOODS = [
  { value: 'calm', label: 'Calm' },
  { value: 'confused', label: 'Confused' },
  { value: 'agitated', label: 'Agitated' },
  { value: 'happy', label: 'Happy' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'aggressive', label: 'Aggressive' },
]

const MOOD_LABELS = Object.fromEntries(
  DAILY_LOG_MOODS.map((mood) => [mood.value, mood.label])
)

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

export function getMoodLabel(mood) {
  return MOOD_LABELS[mood] || mood
}

export function formatLogTimestamp(value) {
  if (!value) {
    return ''
  }

  try {
    return TIMESTAMP_FORMATTER.format(new Date(value))
  } catch (error) {
    return value
  }
}

export function formatSummaryDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return 'Last 7 days'
  }

  try {
    const start = DATE_FORMATTER.format(new Date(startDate))
    const end = DATE_FORMATTER.format(new Date(endDate))
    return `${start} - ${end}`
  } catch (error) {
    return 'Last 7 days'
  }
}

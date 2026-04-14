const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]

let cachedTimezones = null

export function getSupportedTimezones() {
  if (cachedTimezones) {
    return cachedTimezones
  }

  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    cachedTimezones = Intl.supportedValuesOf('timeZone')
    return cachedTimezones
  }

  cachedTimezones = FALLBACK_TIMEZONES
  return cachedTimezones
}

export function getBrowserTimezone() {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') {
    return ''
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
}

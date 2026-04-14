const WHITE_RGB = { r: 255, g: 255, b: 255 }
const FOREGROUND_RGB = { r: 16, g: 28, b: 58 }
const DEFAULT_SITE_COLORS = {
  primary: '#002055',
  secondary: '#d9002b',
  accent: '#a70d30',
}

export const SITE_THEME_STORAGE_KEY = 'calm_compass-site-theme-v2'

export const DEFAULT_SITE_THEME_ID = 'compass-brand'

export const SITE_THEME_PRESETS = [
  {
    id: 'compass-brand',
    name: 'Compass Brand',
    description: 'Deep navy foundations with signal red highlights.',
    colors: DEFAULT_SITE_COLORS,
  },
  {
    id: 'garden-light',
    name: 'Garden Light',
    description: 'Leaf green, quiet blue, and warm rose.',
    colors: {
      primary: '#2f7d4f',
      secondary: '#4c7c95',
      accent: '#b8666b',
    },
  },
  {
    id: 'clear-water',
    name: 'Clear Water',
    description: 'Teal, mist blue, and gentle berry.',
    colors: {
      primary: '#17766f',
      secondary: '#5e8fa8',
      accent: '#aa5f7a',
    },
  },
  {
    id: 'soft-clinic',
    name: 'Soft Clinic',
    description: 'Clinical teal, slate-green, and muted rose.',
    colors: {
      primary: '#247b73',
      secondary: '#5d7c73',
      accent: '#bd6a68',
    },
  },
  {
    id: 'fresh-air',
    name: 'Fresh Air',
    description: 'Sage, cool blue, and berry.',
    colors: {
      primary: '#3d7d5a',
      secondary: '#477b9d',
      accent: '#a95e75',
    },
  },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits))
}

export function normalizeHex(value, fallback = DEFAULT_SITE_COLORS.primary) {
  if (!value) {
    return fallback
  }

  const trimmed = value.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`

  if (/^#[0-9a-f]{3}$/i.test(withHash)) {
    return `#${withHash
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')
      .toLowerCase()}`
  }

  if (/^#[0-9a-f]{6}$/i.test(withHash)) {
    return withHash.toLowerCase()
  }

  return fallback
}

function hexToRgb(value) {
  const hex = normalizeHex(value)

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToCssValue({ r, g, b }) {
  return `${r} ${g} ${b}`
}

function mixRgb(base, mixWith, mixWeight) {
  return {
    r: Math.round(base.r * (1 - mixWeight) + mixWith.r * mixWeight),
    g: Math.round(base.g * (1 - mixWeight) + mixWith.g * mixWeight),
    b: Math.round(base.b * (1 - mixWeight) + mixWith.b * mixWeight),
  }
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6
    } else if (max === green) {
      hue = (blue - red) / delta + 2
    } else {
      hue = (red - green) / delta + 4
    }
  }

  hue = Math.round(hue * 60)
  if (hue < 0) {
    hue += 360
  }

  const lightness = (max + min) / 2
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  return {
    h: clamp(hue, 0, 360),
    s: clamp(round(saturation * 100), 0, 100),
    l: clamp(round(lightness * 100), 0, 100),
  }
}

function hslToCssValue(rgb) {
  const { h, s, l } = rgbToHsl(rgb)
  return `${h} ${s}% ${l}%`
}

function getRelativeLuminance({ r, g, b }) {
  const channel = [r, g, b].map((value) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return channel[0] * 0.2126 + channel[1] * 0.7152 + channel[2] * 0.0722
}

function getReadableForeground(background) {
  return getRelativeLuminance(background) > 0.43 ? FOREGROUND_RGB : WHITE_RGB
}

function getPresetById(presetId) {
  return (
    SITE_THEME_PRESETS.find((preset) => preset.id === presetId) ??
    SITE_THEME_PRESETS[0]
  )
}

export function resolveThemeColors(themeState = {}) {
  const preset = getPresetById(themeState.presetId)
  const baseColors =
    themeState.mode === 'custom'
      ? {
          primary: normalizeHex(
            themeState.customColors?.primary,
            preset.colors.primary
          ),
          secondary: normalizeHex(
            themeState.customColors?.secondary,
            preset.colors.secondary
          ),
          accent: normalizeHex(
            themeState.customColors?.accent,
            preset.colors.accent
          ),
        }
      : preset.colors

  return {
    primary: normalizeHex(baseColors.primary, SITE_THEME_PRESETS[0].colors.primary),
    secondary: normalizeHex(
      baseColors.secondary,
      SITE_THEME_PRESETS[0].colors.secondary
    ),
    accent: normalizeHex(baseColors.accent, SITE_THEME_PRESETS[0].colors.accent),
  }
}

export function buildSiteThemeVariables(colors) {
  const primary = hexToRgb(colors.primary)
  const secondary = hexToRgb(colors.secondary)
  const accent = hexToRgb(colors.accent)

  const primarySoft = mixRgb(primary, WHITE_RGB, 0.93)
  const primaryStrong = mixRgb(primary, WHITE_RGB, 0.84)
  const primaryInk = mixRgb(primary, FOREGROUND_RGB, 0.08)

  const secondarySoft = mixRgb(secondary, WHITE_RGB, 0.94)
  const secondaryStrong = mixRgb(secondary, WHITE_RGB, 0.84)
  const secondaryInk = mixRgb(secondary, FOREGROUND_RGB, 0.1)

  const accentSoft = mixRgb(accent, WHITE_RGB, 0.93)
  const accentStrong = mixRgb(accent, WHITE_RGB, 0.82)
  const accentInk = mixRgb(accent, FOREGROUND_RGB, 0.12)

  const mixedBase = mixRgb(primary, secondary, 0.18)
  const mixedAccent = mixRgb(mixedBase, accent, 0.14)
  const mixedSoft = mixRgb(mixedAccent, WHITE_RGB, 0.94)
  const mixedStrong = mixRgb(mixedAccent, WHITE_RGB, 0.84)
  const neutral = mixRgb(primary, WHITE_RGB, 0.97)
  const neutralStrong = mixRgb(primary, WHITE_RGB, 0.93)

  const border = mixRgb(primary, WHITE_RGB, 0.86)
  const input = mixRgb(primary, WHITE_RGB, 0.9)
  const muted = mixRgb(primary, WHITE_RGB, 0.95)
  const mutedForeground = mixRgb(primary, WHITE_RGB, 0.44)
  const shadow = mixRgb(primary, FOREGROUND_RGB, 0.35)
  const heroSpot = mixRgb(secondary, WHITE_RGB, 0.78)

  return {
    '--background': hslToCssValue(WHITE_RGB),
    '--foreground': hslToCssValue(FOREGROUND_RGB),
    '--card': hslToCssValue(WHITE_RGB),
    '--card-foreground': hslToCssValue(FOREGROUND_RGB),
    '--popover': hslToCssValue(WHITE_RGB),
    '--popover-foreground': hslToCssValue(FOREGROUND_RGB),
    '--primary': hslToCssValue(primary),
    '--primary-foreground': hslToCssValue(getReadableForeground(primary)),
    '--secondary': hslToCssValue(secondarySoft),
    '--secondary-foreground': hslToCssValue(secondaryInk),
    '--muted': hslToCssValue(muted),
    '--muted-foreground': hslToCssValue(mutedForeground),
    '--accent': hslToCssValue(accentSoft),
    '--accent-foreground': hslToCssValue(accentInk),
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '210 40% 98%',
    '--border': hslToCssValue(border),
    '--input': hslToCssValue(input),
    '--ring': hslToCssValue(primary),
    '--theme-foreground-rgb': rgbToCssValue(FOREGROUND_RGB),
    '--theme-primary-rgb': rgbToCssValue(primary),
    '--theme-secondary-rgb': rgbToCssValue(secondary),
    '--theme-accent-rgb': rgbToCssValue(accent),
    '--theme-primary-soft-rgb': rgbToCssValue(primarySoft),
    '--theme-primary-strong-rgb': rgbToCssValue(primaryStrong),
    '--theme-primary-ink-rgb': rgbToCssValue(primaryInk),
    '--theme-secondary-soft-rgb': rgbToCssValue(secondarySoft),
    '--theme-secondary-strong-rgb': rgbToCssValue(secondaryStrong),
    '--theme-secondary-ink-rgb': rgbToCssValue(secondaryInk),
    '--theme-accent-soft-rgb': rgbToCssValue(accentSoft),
    '--theme-accent-strong-rgb': rgbToCssValue(accentStrong),
    '--theme-accent-ink-rgb': rgbToCssValue(accentInk),
    '--theme-mix-soft-rgb': rgbToCssValue(mixedSoft),
    '--theme-mix-strong-rgb': rgbToCssValue(mixedStrong),
    '--theme-neutral-rgb': rgbToCssValue(neutral),
    '--theme-neutral-strong-rgb': rgbToCssValue(neutralStrong),
    '--theme-border-rgb': rgbToCssValue(border),
    '--theme-input-rgb': rgbToCssValue(input),
    '--theme-muted-rgb': rgbToCssValue(muted),
    '--theme-muted-foreground-rgb': rgbToCssValue(mutedForeground),
    '--theme-shadow-rgb': rgbToCssValue(shadow),
    '--theme-hero-start-rgb': rgbToCssValue(primarySoft),
    '--theme-hero-end-rgb': rgbToCssValue(mixedSoft),
    '--theme-hero-spot-rgb': rgbToCssValue(heroSpot),
  }
}

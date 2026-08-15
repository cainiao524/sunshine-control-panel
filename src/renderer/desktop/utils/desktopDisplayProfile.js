export const DESKTOP_DISPLAY_MODES = Object.freeze({
  ADAPT_CLIENT: 'adapt-client',
  PHYSICAL: 'physical',
  VIRTUAL: 'virtual',
  CUSTOM: 'custom',
})

export const DEFAULT_DESKTOP_DISPLAY_PROFILE = Object.freeze({
  mode: DESKTOP_DISPLAY_MODES.ADAPT_CLIENT,
  devicePrep: 'ensure_active',
  resolutionMode: '',
  resolution: '',
  refreshRateMode: '',
  refreshRate: '',
  outputName: '',
  disconnectAction: 'keep',
})

const DESKTOP_APP_NAMES = new Set(['Desktop', '桌面'])
const RESOLUTION_PATTERN = /^[1-9]\d{1,4}x[1-9]\d{1,4}$/
const REFRESH_RATE_PATTERN = /^[1-9]\d{0,3}(?:\.\d+)?$/

export function findDesktopAppIndex(apps) {
  if (!Array.isArray(apps)) return -1
  return apps.findIndex((app) => DESKTOP_APP_NAMES.has(app?.name))
}

export function readDesktopDisplayProfile(app) {
  const target = String(app?.['display-target'] || '')
  let mode = DESKTOP_DISPLAY_MODES.CUSTOM
  if (!target) mode = DESKTOP_DISPLAY_MODES.ADAPT_CLIENT
  else if (target === 'physical') mode = DESKTOP_DISPLAY_MODES.PHYSICAL
  else if (target === 'virtual') mode = DESKTOP_DISPLAY_MODES.VIRTUAL

  return {
    mode,
    devicePrep: String(app?.['display-device-prep'] || DEFAULT_DESKTOP_DISPLAY_PROFILE.devicePrep),
    resolutionMode: String(app?.['display-resolution-mode'] || ''),
    resolution: String(app?.['display-resolution'] || ''),
    refreshRateMode: String(app?.['display-refresh-rate-mode'] || ''),
    refreshRate: String(app?.['display-refresh-rate'] || ''),
    outputName: String(app?.['display-output-name'] || ''),
    disconnectAction: String(app?.['display-disconnect-action'] || DEFAULT_DESKTOP_DISPLAY_PROFILE.disconnectAction),
  }
}

export function validateDesktopDisplayProfile(profile) {
  if (profile?.mode === DESKTOP_DISPLAY_MODES.CUSTOM) return true
  if (profile?.resolutionMode === 'fixed' && !RESOLUTION_PATTERN.test(String(profile.resolution || ''))) {
    return false
  }
  if (profile?.refreshRateMode === 'fixed' && !REFRESH_RATE_PATTERN.test(String(profile.refreshRate || ''))) {
    return false
  }
  return true
}

export function applyDesktopDisplayProfile(app, profile) {
  if (profile?.mode === DESKTOP_DISPLAY_MODES.CUSTOM) return { ...app }

  const updated = Object.fromEntries(
    Object.entries(app).filter(([key]) => !key.startsWith('display-')),
  )
  if (profile?.mode === DESKTOP_DISPLAY_MODES.ADAPT_CLIENT) return updated

  if (![DESKTOP_DISPLAY_MODES.PHYSICAL, DESKTOP_DISPLAY_MODES.VIRTUAL].includes(profile?.mode)) {
    throw new Error(`Unsupported Desktop display mode: ${profile?.mode}`)
  }

  updated['display-target'] = profile.mode
  updated['display-device-prep'] = String(profile.devicePrep || DEFAULT_DESKTOP_DISPLAY_PROFILE.devicePrep)

  if (profile.resolutionMode) {
    updated['display-resolution-mode'] = String(profile.resolutionMode)
    if (profile.resolutionMode === 'fixed') {
      updated['display-resolution'] = String(profile.resolution || '').trim()
    }
  }

  if (profile.refreshRateMode) {
    updated['display-refresh-rate-mode'] = String(profile.refreshRateMode)
    if (profile.refreshRateMode === 'fixed') {
      updated['display-refresh-rate'] = String(profile.refreshRate || '').trim()
    }
  }

  if (profile.mode === DESKTOP_DISPLAY_MODES.PHYSICAL) {
    const outputName = String(profile.outputName || '').trim()
    if (outputName) updated['display-output-name'] = outputName
  }

  updated['display-disconnect-action'] = String(
    profile.disconnectAction || DEFAULT_DESKTOP_DISPLAY_PROFILE.disconnectAction,
  )
  return updated
}

export function updateDesktopApplication(app, options) {
  const {
    autoLaunchDesktop,
    displayProfile,
    guiDesktopCommand,
  } = options

  let updated = applyDesktopDisplayProfile(app, displayProfile)
  const detached = [...(updated.detached || [])].filter((command) =>
    !(command.includes('sunshine-gui') && (command.includes('--desktop') || command.includes('-d')))
  )

  if (autoLaunchDesktop) detached.push(guiDesktopCommand)
  updated = { ...updated, detached }
  return updated
}

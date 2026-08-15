import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_DESKTOP_DISPLAY_PROFILE,
  DESKTOP_DISPLAY_MODES,
  applyDesktopDisplayProfile,
  findDesktopAppIndex,
  readDesktopDisplayProfile,
  updateDesktopApplication,
  validateDesktopDisplayProfile,
} from './desktopDisplayProfile.js'

test('默认 Desktop 开放基地版 Moonlight 显示参数并保留原应用功能', () => {
  const app = {
    name: 'Desktop',
    detached: ['keep-me.exe'],
    'menu-cmd': [{ name: '触摸键盘' }],
    'display-target': 'virtual',
    'display-device-prep': 'ensure_only_display',
  }

  const updated = applyDesktopDisplayProfile(app, DEFAULT_DESKTOP_DISPLAY_PROFILE)

  assert.equal(updated['display-target'], undefined)
  assert.equal(updated['display-device-prep'], undefined)
  assert.deepEqual(updated.detached, ['keep-me.exe'])
  assert.deepEqual(updated['menu-cmd'], [{ name: '触摸键盘' }])
})

test('完整虚拟显示方案能够往返读取和保存', () => {
  const profile = {
    ...DEFAULT_DESKTOP_DISPLAY_PROFILE,
    mode: DESKTOP_DISPLAY_MODES.VIRTUAL,
    devicePrep: 'ensure_only_display',
    resolutionMode: 'fixed',
    resolution: '2560x1600',
    refreshRateMode: 'fixed',
    refreshRate: '120',
    disconnectAction: 'restore',
  }
  const updated = applyDesktopDisplayProfile({ name: 'Desktop' }, profile)

  assert.deepEqual(readDesktopDisplayProfile(updated), profile)
})

test('完整物理显示方案保存指定显示器', () => {
  const updated = applyDesktopDisplayProfile(
    { name: 'Desktop' },
    {
      ...DEFAULT_DESKTOP_DISPLAY_PROFILE,
      mode: DESKTOP_DISPLAY_MODES.PHYSICAL,
      devicePrep: 'ensure_primary',
      resolutionMode: 'client',
      refreshRateMode: 'client',
      outputName: '\\\\.\\DISPLAY1',
    },
  )

  assert.equal(updated['display-target'], 'physical')
  assert.equal(updated['display-output-name'], '\\\\.\\DISPLAY1')
})


test('无操作布局能够保存并往返读取', () => {
  const profile = {
    ...DEFAULT_DESKTOP_DISPLAY_PROFILE,
    mode: DESKTOP_DISPLAY_MODES.VIRTUAL,
    devicePrep: 'no_operation',
  }

  const updated = applyDesktopDisplayProfile({ name: 'Desktop' }, profile)

  assert.equal(updated['display-device-prep'], 'no_operation')
  assert.deepEqual(readDesktopDisplayProfile(updated), profile)
})

test('固定分辨率和刷新率必须使用有效格式', () => {
  assert.equal(validateDesktopDisplayProfile({
    ...DEFAULT_DESKTOP_DISPLAY_PROFILE,
    resolutionMode: 'fixed',
    resolution: '2560x1600',
    refreshRateMode: 'fixed',
    refreshRate: '119.88',
  }), true)
  assert.equal(validateDesktopDisplayProfile({
    ...DEFAULT_DESKTOP_DISPLAY_PROFILE,
    resolutionMode: 'fixed',
    resolution: '2560*1600',
  }), false)
  assert.equal(validateDesktopDisplayProfile({
    ...DEFAULT_DESKTOP_DISPLAY_PROFILE,
    refreshRateMode: 'fixed',
    refreshRate: 'fast',
  }), false)
})

test('未知的新方案会作为自定义配置原样保留', () => {
  const app = { name: 'Desktop', 'display-target': 'future-target', future: true }
  const profile = readDesktopDisplayProfile(app)
  assert.equal(profile.mode, DESKTOP_DISPLAY_MODES.CUSTOM)
  assert.deepEqual(applyDesktopDisplayProfile(app, profile), app)
})

test('保存 Desktop 设置只更新显示字段和控制面板启动命令', () => {
  const updated = updateDesktopApplication(
    {
      name: 'Desktop',
      detached: ['helper.exe', '.\\assets\\gui\\sunshine-gui.exe --desktop'],
      'menu-cmd': [{ name: '桌宠' }],
    },
    {
      autoLaunchDesktop: true,
      displayProfile: {
        ...DEFAULT_DESKTOP_DISPLAY_PROFILE,
        mode: DESKTOP_DISPLAY_MODES.VIRTUAL,
        devicePrep: 'ensure_secondary',
        resolutionMode: 'client',
        refreshRateMode: 'client',
      },
      guiDesktopCommand: '.\\assets\\gui\\sunshine-gui.exe --desktop',
    },
  )

  assert.deepEqual(updated.detached, [
    'helper.exe',
    '.\\assets\\gui\\sunshine-gui.exe --desktop',
  ])
  assert.deepEqual(updated['menu-cmd'], [{ name: '桌宠' }])
  assert.equal(updated['display-target'], 'virtual')
  assert.equal(updated['display-device-prep'], 'ensure_secondary')
})

test('按名称定位内置 Desktop 应用', () => {
  assert.equal(findDesktopAppIndex([{ name: 'Steam' }, { name: 'Desktop' }]), 1)
  assert.equal(findDesktopAppIndex([{ name: '桌面' }]), 0)
  assert.equal(findDesktopAppIndex([{ name: 'Other' }]), -1)
})

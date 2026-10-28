import type { DeviceStatus, DeviceTarget, DeviceType } from '../types/ping'

const hostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/i

function isIPv4(value: string): boolean {
  const parts = value.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function looksLikeBrokenIPv4(value: string): boolean {
  return /^\d+(?:\.\d+){1,3}$/.test(value) && !isIPv4(value)
}

function isIPv6(value: string): boolean {
  if (!value.includes(':') || !/^[0-9a-f:]+$/i.test(value)) return false
  if ((value.match(/::/g) ?? []).length > 1) return false
  const groups = value.split(':')
  const emptyGroups = groups.filter((group) => group === '').length
  return groups.every((group) => group === '' || /^[0-9a-f]{1,4}$/i.test(group)) &&
    (value.includes('::') ? groups.length - emptyGroups < 8 : groups.length === 8)
}

export function classifyDevice(value: string): { type: DeviceType; status: DeviceStatus } {
  if (isIPv4(value)) return { type: 'IPv4', status: 'valid' }
  if (isIPv6(value)) return { type: 'IPv6', status: 'valid' }
  if (looksLikeBrokenIPv4(value)) return { type: 'IPv4', status: 'invalid' }
  if (hostnamePattern.test(value)) {
    return { type: 'Hostname', status: value.includes('.') ? 'valid' : 'warning' }
  }
  return { type: 'Unknown', status: 'invalid' }
}

export function parseDeviceText(text: string, source: string): DeviceTarget[] {
  const values = text
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)

  return values.map((value) => {
    const classification = classifyDevice(value)
    return {
      id: crypto.randomUUID(),
      value,
      type: classification.type,
      status: classification.status,
      source,
    }
  })
}

export function markDuplicates(devices: DeviceTarget[]): DeviceTarget[] {
  const firstByValue = new Map<string, string>()
  return devices.map((device) => {
    const classification = classifyDevice(device.value)
    const key = device.value.toLocaleLowerCase()
    const firstId = firstByValue.get(key)
    if (firstId) return { ...device, ...classification, status: 'duplicate', duplicateOf: firstId }
    firstByValue.set(key, device.id)
    return { ...device, ...classification, duplicateOf: undefined }
  })
}

export function deviceCounts(devices: DeviceTarget[]) {
  return {
    total: devices.length,
    valid: devices.filter((device) => device.status === 'valid' || device.status === 'warning').length,
    duplicates: devices.filter((device) => device.status === 'duplicate').length,
    invalid: devices.filter((device) => device.status === 'invalid').length,
  }
}

export function recommendedColumn(columns: string[]): number {
  const candidates = ['ip', 'ip address', 'hostname', 'host', 'device', 'device name', 'server', 'address', 'device ip']
  const index = columns.findIndex((column) => candidates.includes(column.trim().toLocaleLowerCase()))
  return index >= 0 ? index : 0
}
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function getDeviceId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('roast_device_id')
  if (!id) {
    id = generateId()
    localStorage.setItem('roast_device_id', id)
  }
  return id
}

export const DEFAULT_GROUPS = {
  g1: { id: 'g1', name: '第一組', problem: '', solution: '' },
  g2: { id: 'g2', name: '第二組', problem: '', solution: '' },
  g3: { id: 'g3', name: '第三組', problem: '', solution: '' },
  g4: { id: 'g4', name: '第四組', problem: '', solution: '' },
  g5: { id: 'g5', name: '第五組', problem: '', solution: '' },
  g6: { id: 'g6', name: '第六組', problem: '', solution: '' },
  g7: { id: 'g7', name: '第七組', problem: '', solution: '' },
  g8: { id: 'g8', name: '第八組', problem: '', solution: '' },
  g9: { id: 'g9', name: '第九組', problem: '', solution: '' },
}

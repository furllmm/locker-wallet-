import type { LockerMode } from '../rules/modes.js';

export interface Locker {
  id: string;
  name: string;
  tag?: string;
  mode: LockerMode;
  accountIndex: number;
  createdAt: string;
  updatedAt: string;
}

export function createLocker(name: string, mode: LockerMode = 'normal', tag?: string, accountIndex = 0): Locker {
  if (!name.trim()) throw new Error('Locker name cannot be empty');
  if (!Number.isInteger(accountIndex) || accountIndex < 0) throw new Error('Invalid account index');
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: name.trim(), mode, accountIndex, ...(tag ? { tag: tag.trim() } : {}), createdAt: now, updatedAt: now };
}

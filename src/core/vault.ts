import { createLocker, type Locker } from './locker.js';
import { encryptVault, decryptVault, type EncryptedVault, type VaultPayload } from '../storage/encrypted-vault.js';
import type { LockerMode } from '../rules/modes.js';

export interface VaultDocument {
  version: 1;
  encrypted: EncryptedVault;
  lockers: Locker[];
}

export function createVault(mnemonic: string, password: string, lockerName = 'Main Vault', mode: LockerMode = 'normal'): VaultDocument {
  if (!mnemonic.trim()) throw new Error('Mnemonic cannot be empty');
  const payload: VaultPayload = { version: 1, mnemonic: mnemonic.trim(), createdAt: new Date().toISOString() };
  return { version: 1, encrypted: encryptVault(payload, password), lockers: [createLocker(lockerName, mode)] };
}

export function unlockVault(vault: VaultDocument, password: string): VaultPayload {
  return decryptVault(vault.encrypted, password);
}

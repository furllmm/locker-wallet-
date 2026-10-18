import { createLocker, type Locker } from './locker.js';
import { encryptVault, decryptVault, type EncryptedVault, type VaultPayload } from '../storage/encrypted-vault.js';
import {
  createDefaultWalletSettings,
  validateWalletSettings,
  type WalletSettings,
} from '../settings/wallet-settings.js';
import type { LockerMode } from '../rules/modes.js';

export interface VaultDocument {
  version: 1;
  encrypted: EncryptedVault;
  lockers: Locker[];
}

export function createVault(mnemonic: string, password: string, lockerName = 'Main Vault', mode: LockerMode = 'normal'): VaultDocument {
  if (!mnemonic.trim()) throw new Error('Mnemonic cannot be empty');
  const locker = createLocker(lockerName, mode);
  const payload: VaultPayload = {
    version: 1,
    mnemonic: mnemonic.trim(),
    createdAt: new Date().toISOString(),
    walletSettings: createDefaultWalletSettings(),
  };
  return { version: 1, encrypted: encryptVault(payload, password), lockers: [locker] };
}

export function unlockVault(vault: VaultDocument, password: string): VaultPayload {
  if (vault.version !== 1 || !Array.isArray(vault.lockers)) throw new Error('Invalid vault document');
  return decryptVault(vault.encrypted, password);
}

/**
 * Returns settings from the encrypted payload. Older vaults without settings
 * are treated as having defaults; reading does not mutate the vault.
 */
export function getWalletSettings(vault: VaultDocument, password: string): WalletSettings {
  const payload = unlockVault(vault, password);
  const settings = payload.walletSettings ?? createDefaultWalletSettings();
  return validateWalletSettings(settings, vault.lockers.map(locker => locker.id));
}

/**
 * Re-encrypts settings with a fresh salt and IV. The mnemonic and vault metadata
 * remain unchanged. This function never writes to disk; persist the returned
 * VaultDocument through the application's existing storage layer.
 */
export function saveWalletSettings(
  vault: VaultDocument,
  password: string,
  settings: WalletSettings,
): VaultDocument {
  const payload = unlockVault(vault, password);
  const validatedSettings = validateWalletSettings(settings, vault.lockers.map(locker => locker.id));
  // Preserve all existing payload metadata when extending the encrypted schema.
  const nextPayload: VaultPayload = {
    ...payload,
    walletSettings: validatedSettings,
  };
  return { ...vault, encrypted: encryptVault(nextPayload, password) };
}

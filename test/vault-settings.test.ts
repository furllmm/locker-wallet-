import { describe, expect, it } from 'vitest';
import { createVault, getWalletSettings, saveWalletSettings, unlockVault } from '../src/core/vault.js';
import { createDefaultWalletSettings, type WalletSettings } from '../src/settings/wallet-settings.js';

describe('encrypted wallet settings persistence', () => {
  it('creates a vault with settings available after unlock', () => {
    const vault = createVault('alpha beta gamma', 'strong-test-password');
    expect(getWalletSettings(vault, 'strong-test-password')).toEqual(createDefaultWalletSettings());
  });

  it('round-trips settings through encrypted payload without changing locker IDs', () => {
    const vault = createVault('alpha beta gamma', 'strong-test-password');
    const [main] = vault.lockers;
    if (!main) throw new Error('Expected initial locker');
    const [savings] = [ { ...main, id: 'savings-test-id', name: 'Savings' } ];
    const settings: WalletSettings = {
      version: 1,
      defaultWalletId: savings.id,
      maxTransactionUsd: null,
      savingRules: [{
        id: 'minimum-main-to-savings',
        enabled: true,
        sourceWalletId: main.id,
        targetWalletId: savings.id,
        minimumTransferUsd: 5,
        behavior: 'block',
      }],
    };
    const expandedVault = { ...vault, lockers: [...vault.lockers, savings] };
    const updated = saveWalletSettings(expandedVault, 'strong-test-password', settings);
    expect(updated.lockers.map(locker => locker.id)).toEqual(expandedVault.lockers.map(locker => locker.id));
    expect(getWalletSettings(updated, 'strong-test-password')).toEqual(settings);
    expect(unlockVault(updated, 'strong-test-password').mnemonic).toBe('alpha beta gamma');
  });

  it('rejects settings that reference a missing wallet', () => {
    const vault = createVault('alpha beta gamma', 'strong-test-password');
    expect(() => saveWalletSettings(vault, 'strong-test-password', {
      version: 1,
      defaultWalletId: 'missing',
      savingRules: [],
    })).toThrow('Default wallet does not exist');
  });

  it('does not reveal whether a password or ciphertext was invalid', () => {
    const vault = createVault('alpha beta gamma', 'strong-test-password');
    expect(() => getWalletSettings(vault, 'wrong-password')).toThrow('Invalid password or corrupted vault');
  });
});

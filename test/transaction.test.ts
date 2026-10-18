import { describe, expect, it } from 'vitest';
import { createSend, createSendUsingDefaultWallet, createTransfer } from '../src/transaction/service.js';
import { createDefaultWalletSettings } from '../src/settings/wallet-settings.js';
import { assertSigningAllowed, assertSigningAllowedWithWalletSettings } from '../src/transaction/signing-guard.js';

const asset = { networkId: 'ethereum', symbol: 'ETH', decimals: 18 };
const from = { lockerId: 'main', accountId: 'main-0', networkId: 'ethereum', address: '0x111' };
const to = { lockerId: 'savings', accountId: 'savings-0', networkId: 'ethereum', address: '0x222' };

describe('v0.4 transactions', () => {
  it('creates a Send draft', () => {
    const d = createSend({ fromLockerId: 'main', fromAccountId: 'main-0', networkId: 'ethereum', asset, amountBaseUnits: '100', to: { address: '0xabc' } });
    expect(d.intent.kind).toBe('send');
  });
  it('creates a Send draft from the configured default wallet', () => {
    const settings = { ...createDefaultWalletSettings(), defaultWalletId: 'savings' };
    const draft = createSendUsingDefaultWallet({
      settings,
      availableAccounts: [
        { lockerId: 'main', accountId: 'main-0' },
        { lockerId: 'savings', accountId: 'savings-1' },
      ],
      networkId: 'ethereum',
      asset,
      amountBaseUnits: '100',
      to: { address: '0xabc' },
    });
    expect(draft.intent.fromLockerId).toBe('savings');
    expect(draft.intent.fromAccountId).toBe('savings-1');
  });

  it('falls back to the first available account if the preferred wallet is missing', () => {
    const settings = { ...createDefaultWalletSettings(), defaultWalletId: 'deleted-wallet' };
    const draft = createSendUsingDefaultWallet({
      settings,
      availableAccounts: [{ lockerId: 'main', accountId: 'main-0' }],
      networkId: 'ethereum',
      asset,
      amountBaseUnits: '100',
      to: { address: '0xabc' },
    });
    expect(draft.intent.fromLockerId).toBe('main');
  });

  it('refuses to create a send when no wallet accounts are available', () => {
    expect(() => createSendUsingDefaultWallet({
      settings: createDefaultWalletSettings(),
      availableAccounts: [],
      networkId: 'ethereum',
      asset,
      amountBaseUnits: '100',
      to: { address: '0xabc' },
    })).toThrow('No available wallet account');
  });

  it('creates an internal Transfer draft', () => {
    const d = createTransfer({ from, to, asset, amountBaseUnits: '100' });
    expect(d.intent.kind).toBe('transfer');
    expect(d.intent.to.lockerId).toBe('savings');
  });
  it('rejects cross-network transfer', () => {
    expect(() => createTransfer({ from, to: { ...to, networkId: 'bitcoin' }, asset, amountBaseUnits: '1' })).toThrow('same network');
  });
  it('blocks transactions above the configured USD cap', () => {
    const d = createSend({ fromLockerId: 'main', fromAccountId: 'main-0', networkId: 'ethereum', asset, amountBaseUnits: '100', to: { address: '0xabc' } });
    expect(() => assertSigningAllowed(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
      maxTransactionUsd: 10, transactionValueUsd: 10.01,
    })).toThrow('exceeds the configured spending limit');
  });
  it('fails closed if a spending cap is configured but USD valuation is missing', () => {
    const d = createSend({ fromLockerId: 'main', fromAccountId: 'main-0', networkId: 'ethereum', asset, amountBaseUnits: '100', to: { address: '0xabc' } });
    expect(() => assertSigningAllowed(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
      maxTransactionUsd: 10,
    })).toThrow('USD valuation is required');
  });
  it('allows a transaction exactly at the configured USD cap', () => {
    const d = createSend({ fromLockerId: 'main', fromAccountId: 'main-0', networkId: 'ethereum', asset, amountBaseUnits: '100', to: { address: '0xabc' } });
    expect(() => assertSigningAllowed(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
      maxTransactionUsd: 10, transactionValueUsd: 10,
    })).not.toThrow();
  });
  it('automatically applies the persisted wallet spending cap', () => {
    const d = createSend({ fromLockerId: 'main', fromAccountId: 'main-0', networkId: 'ethereum', asset, amountBaseUnits: '100', to: { address: '0xabc' } });
    const settings = { ...createDefaultWalletSettings(), maxTransactionUsd: 5 };
    expect(() => assertSigningAllowedWithWalletSettings(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
      transactionValueUsd: 6,
    }, settings)).toThrow('exceeds the configured spending limit');
  });

  it('enforces a matching blocking Saving Rule at the signing guard', () => {
    const d = createTransfer({ from, to, asset, amountBaseUnits: '100' });
    const settings = {
      ...createDefaultWalletSettings(),
      savingRules: [{
        id: 'main-to-savings-minimum',
        enabled: true,
        sourceWalletId: 'main',
        targetWalletId: 'savings',
        minimumTransferUsd: 5,
        behavior: 'block' as const,
      }],
    };
    expect(() => assertSigningAllowedWithWalletSettings(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
      transactionValueUsd: 4.99,
    }, settings)).toThrow('Transfer blocked by saving rule');
  });

  it('fails closed when a matching blocking Saving Rule has no USD valuation', () => {
    const d = createTransfer({ from, to, asset, amountBaseUnits: '100' });
    const settings = {
      ...createDefaultWalletSettings(),
      savingRules: [{
        id: 'main-to-savings-minimum',
        enabled: true,
        sourceWalletId: 'main',
        targetWalletId: 'savings',
        minimumTransferUsd: 5,
        behavior: 'block' as const,
      }],
    };
    expect(() => assertSigningAllowedWithWalletSettings(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
    }, settings)).toThrow('USD valuation is required by the matching saving rule');
  });


  it('returns warnings for matching warn-only Saving Rules', () => {
    const d = createTransfer({ from, to, asset, amountBaseUnits: '100' });
    const settings = {
      ...createDefaultWalletSettings(),
      savingRules: [{
        id: 'warn-small-transfer',
        enabled: true,
        sourceWalletId: 'main',
        targetWalletId: 'savings',
        minimumTransferUsd: 5,
        behavior: 'warn' as const,
      }],
    };
    const warnings = assertSigningAllowedWithWalletSettings(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
      transactionValueUsd: 2,
    }, settings);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('below the configured minimum');
  });

  it('does not require USD valuation for unrelated Saving Rules', () => {
    const d = createTransfer({ from, to, asset, amountBaseUnits: '100' });
    const settings = {
      ...createDefaultWalletSettings(),
      savingRules: [{
        id: 'other-route',
        enabled: true,
        sourceWalletId: 'main',
        targetWalletId: 'other-wallet',
        minimumTransferUsd: 5,
        behavior: 'block' as const,
      }],
    };
    expect(() => assertSigningAllowedWithWalletSettings(d, {
      mode: 'normal', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
    }, settings)).not.toThrow();
  });

  it('enforces configured cooldown before signing', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const d = createSend({
      fromLockerId: 'main', fromAccountId: 'main-0', networkId: 'ethereum',
      asset, amountBaseUnits: '100', to: { address: '0xabc' },
    }, createdAt);
    const settings = { ...createDefaultWalletSettings(), cooldownSeconds: 60 };
    const context = {
      mode: 'normal' as const, balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0',
    };
    expect(() => assertSigningAllowedWithWalletSettings(d, {
      ...context, nowEpochMs: createdAt.getTime() + 59_000,
    }, settings)).toThrow('Signing cooldown active');
    expect(() => assertSigningAllowedWithWalletSettings(d, {
      ...context, nowEpochMs: createdAt.getTime() + 60_000,
    }, settings)).not.toThrow();
  });

  it('blocks Ghost signing', () => {
    const d = createTransfer({ from, to, asset, amountBaseUnits: '1' });
    expect(() => assertSigningAllowed(d, { mode: 'ghost', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0' })).toThrow('Ghost Vault');
  });
});

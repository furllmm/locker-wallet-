import { describe, expect, it } from 'vitest';
import { createSend, createTransfer } from '../src/transaction/service.js';
import { assertSigningAllowed } from '../src/transaction/signing-guard.js';

const asset = { networkId: 'ethereum', symbol: 'ETH', decimals: 18 };
const from = { lockerId: 'main', accountId: 'main-0', networkId: 'ethereum', address: '0x111' };
const to = { lockerId: 'savings', accountId: 'savings-0', networkId: 'ethereum', address: '0x222' };

describe('v0.4 transactions', () => {
  it('creates a Send draft', () => {
    const d = createSend({ fromLockerId: 'main', fromAccountId: 'main-0', networkId: 'ethereum', asset, amountBaseUnits: '100', to: { address: '0xabc' } });
    expect(d.intent.kind).toBe('send');
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
  it('blocks Ghost signing', () => {
    const d = createTransfer({ from, to, asset, amountBaseUnits: '1' });
    expect(() => assertSigningAllowed(d, { mode: 'ghost', balanceUsd: 100, fromLockerId: 'main', fromAccountId: 'main-0' })).toThrow('Ghost Vault');
  });
});

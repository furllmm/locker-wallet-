import { describe, expect, it } from 'vitest';
import { createWallet, restoreWallet, deriveDefaultAddress, deriveAddress, isValidMnemonic } from '../src/core/wallet-core.js';

describe('Wallet Core adapter', () => {
  it('creates a 12-word wallet', async () => {
    const result = await createWallet(128);
    expect(result.mnemonic.trim().split(/\s+/)).toHaveLength(12);
    expect(await isValidMnemonic(result.mnemonic)).toBe(true);
  }, 30000);

  it('restores a deterministic BIP39 wallet', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const a = await deriveDefaultAddress(mnemonic, 'Ethereum');
    const b = await deriveDefaultAddress(mnemonic, 'Ethereum');
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-fA-F]{40}$/);
  }, 30000);

  it('supports explicit derivation paths', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const address = await deriveAddress(mnemonic, 'Ethereum', "m/44'/60'/0'/0/0");
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  }, 30000);

  it('rejects an invalid mnemonic', async () => {
    await expect(restoreWallet('not a real mnemonic')).rejects.toThrow();
  }, 30000);
});

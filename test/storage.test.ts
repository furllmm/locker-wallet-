import { describe, expect, it } from 'vitest';
import { encryptVault, decryptVault } from '../src/storage/encrypted-vault.js';

describe('encrypted vault', () => {
  it('round-trips without storing plaintext in ciphertext', () => {
    const payload = { version: 1 as const, mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', createdAt: new Date().toISOString() };
    const encrypted = encryptVault(payload, 'correct horse battery staple');
    expect(encrypted.ciphertext).not.toContain('abandon');
    expect(decryptVault(encrypted, 'correct horse battery staple')).toEqual(payload);
  });
  it('rejects a wrong password', () => {
    const encrypted = encryptVault({ version: 1, mnemonic: 'secret words', createdAt: 'now' }, 'right');
    expect(() => decryptVault(encrypted, 'wrong')).toThrow('Invalid password or corrupted vault');
  });
  it('detects tampering', () => {
    const encrypted = encryptVault({ version: 1, mnemonic: 'secret words', createdAt: 'now' }, 'right');
    encrypted.ciphertext = encrypted.ciphertext.slice(0, -2) + 'AA';
    expect(() => decryptVault(encrypted, 'right')).toThrow('Invalid password or corrupted vault');
  });
});

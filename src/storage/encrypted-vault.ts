import { randomBytes, scryptSync, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';

const FORMAT = 'FCLW1';
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const TAG_BYTES = 16;
const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export interface VaultPayload {
  version: 1;
  mnemonic: string;
  createdAt: string;
}

export interface EncryptedVault {
  format: typeof FORMAT;
  kdf: 'scrypt';
  n: number;
  r: number;
  p: number;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  if (!password) throw new Error('Vault password cannot be empty');
  return scryptSync(password, salt, KEY_BYTES, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024 });
}

export function encryptVault(payload: VaultPayload, password: string): EncryptedVault {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey(password, salt);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    plaintext.fill(0);
    return {
      format: FORMAT, kdf: 'scrypt', n: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
      salt: salt.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64'), ciphertext: ciphertext.toString('base64')
    };
  } finally { key.fill(0); }
}

export function decryptVault(encrypted: EncryptedVault, password: string): VaultPayload {
  if (encrypted.format !== FORMAT || encrypted.kdf !== 'scrypt') throw new Error('Unsupported vault format');
  if (encrypted.n !== SCRYPT_N || encrypted.r !== SCRYPT_R || encrypted.p !== SCRYPT_P) throw new Error('Unsupported KDF parameters');
  const salt = Buffer.from(encrypted.salt, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ciphertext.length === 0) throw new Error('Invalid vault data');
  const key = deriveKey(password, salt);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(plaintext.toString('utf8')) as VaultPayload;
    plaintext.fill(0);
    if (payload.version !== 1 || typeof payload.mnemonic !== 'string' || typeof payload.createdAt !== 'string') throw new Error('Invalid vault payload');
    return payload;
  } catch {
    throw new Error('Invalid password or corrupted vault');
  } finally { key.fill(0); }
}

export function verifyVaultPassword(encrypted: EncryptedVault, password: string): boolean {
  try { decryptVault(encrypted, password); return true; } catch { return false; }
}

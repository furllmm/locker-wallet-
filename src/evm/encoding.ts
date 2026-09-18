import { assertUint, bigintToFixedHex, normalizeHex } from './quantity.js';

export function normalizeAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Invalid EVM address');
  return address.toLowerCase();
}

export function hexData(bytes: Uint8Array): string {
  return `0x${Buffer.from(bytes).toString('hex')}`;
}

export function encodeUint256(value: bigint): string {
  return bigintToFixedHex(value, 32);
}

/** ABI encoding for ERC-20 transfer(address,uint256). */
export function encodeErc20Transfer(to: string, amount: bigint): string {
  const address = normalizeAddress(to).slice(2).padStart(64, '0');
  return `0xa9059cbb${address}${encodeUint256(amount)}`;
}

function stripZero(hex: string): string {
  const normalized = normalizeHex(hex);
  const body = normalized.slice(2).replace(/^0+/, '');
  return body ? `0x${body}` : '0x';
}

function rlpLength(length: number, offset: number): string {
  if (length < offset) return (offset + length).toString(16).padStart(2, '0');
  const hex = length.toString(16).padStart(2, '0');
  return (offset + 55 + hex.length / 2).toString(16).padStart(2, '0') + hex;
}

export function rlpEncode(value: string | Array<string | unknown>): string {
  if (Array.isArray(value)) {
    const encoded = value.map(rlpEncode).join('').replace(/^0x/, '');
    const length = encoded.length / 2;
    const prefix = length < 56 ? (0xc0 + length).toString(16) : rlpLength(length, 0xf7);
    return `0x${prefix}${encoded}`;
  }
  const item = stripZero(value);
  if (item === '0x') return '0x80';
  const body = item.slice(2);
  if (body.length === 2 && parseInt(body, 16) < 0x80) return item;
  const length = body.length / 2;
  const prefix = length < 56 ? (0x80 + length).toString(16) : rlpLength(length, 0xb7);
  return `0x${prefix}${body}`;
}

export interface LegacyEvmTransaction {
  nonce: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  to?: string;
  value: bigint;
  data?: string;
  chainId: bigint;
}

/** EIP-155 signing payload. Signature fields are intentionally absent. */
export function encodeLegacySigningPayload(tx: LegacyEvmTransaction): string {
  assertUint(tx.nonce, 'nonce');
  assertUint(tx.gasPrice, 'gasPrice');
  assertUint(tx.gasLimit, 'gasLimit');
  assertUint(tx.value, 'value');
  assertUint(tx.chainId, 'chainId');
  const to = tx.to ? normalizeAddress(tx.to) : '0x';
  const data = tx.data ? normalizeHex(tx.data, 'data') : '0x';
  return rlpEncode([
    `0x${tx.nonce.toString(16)}`,
    `0x${tx.gasPrice.toString(16)}`,
    `0x${tx.gasLimit.toString(16)}`,
    to,
    `0x${tx.value.toString(16)}`,
    data,
    `0x${tx.chainId.toString(16)}`,
    '0x',
    '0x',
  ]);
}

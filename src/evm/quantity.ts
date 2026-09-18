export function assertUint(value: bigint, label = 'value'): bigint {
  if (value < 0n) throw new Error(`${label} cannot be negative`);
  return value;
}

export function hexQuantity(value: bigint, label = 'value'): string {
  assertUint(value, label);
  return `0x${value.toString(16)}`;
}

export function parseHexQuantity(value: string, label = 'quantity'): bigint {
  if (!/^0x[0-9a-f]+$/i.test(value)) throw new Error(`Invalid ${label}`);
  return BigInt(value);
}

export function bigintToFixedHex(value: bigint, bytes: number, label = 'value'): string {
  assertUint(value, label);
  const hex = value.toString(16);
  if (hex.length > bytes * 2) throw new Error(`${label} does not fit in ${bytes} bytes`);
  return hex.padStart(bytes * 2, '0');
}

export function normalizeHex(value: string, label = 'hex'): string {
  if (!/^0x[0-9a-f]*$/i.test(value) || value.length % 2 !== 0) throw new Error(`Invalid ${label}`);
  return value.toLowerCase();
}

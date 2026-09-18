import { initWasm } from '@trustwallet/wallet-core';

export type WalletCoreRuntime = Awaited<ReturnType<typeof initWasm>>;
export type WalletCoreHdWallet = Awaited<ReturnType<WalletCoreRuntime['HDWallet']['create']>>;

let runtimePromise: Promise<WalletCoreRuntime> | undefined;

export function getWalletCore(): Promise<WalletCoreRuntime> {
  runtimePromise ??= initWasm();
  return runtimePromise;
}

export async function createWallet(strength: 128 | 256 = 128, passphrase = '') {
  const core = await getWalletCore();
  const wallet = core.HDWallet.create(strength, passphrase);
  const mnemonic = wallet.mnemonic();
  if (!mnemonic) throw new Error('Wallet Core failed to create a mnemonic');
  return { core, wallet, mnemonic };
}

export async function restoreWallet(mnemonic: string, passphrase = '') {
  if (!mnemonic.trim()) throw new Error('Mnemonic cannot be empty');
  const core = await getWalletCore();
  const wallet = core.HDWallet.createWithMnemonic(mnemonic.trim(), passphrase);
  if (!wallet) throw new Error('Wallet Core rejected the mnemonic');
  return { core, wallet };
}

function getCoinType(core: WalletCoreRuntime, coinName: string) {
  const key = core.CoinType[coinName as keyof typeof core.CoinType];
  if (!key) throw new Error(`Wallet Core coin is not available: ${coinName}`);
  return key;
}

/** Derive using Wallet Core's network-specific default path. */
export async function deriveDefaultAddress(mnemonic: string, coinName: string, passphrase = '') {
  const { core, wallet } = await restoreWallet(mnemonic, passphrase);
  const coin = getCoinType(core, coinName);
  const address = wallet.getAddressForCoin(coin);
  if (!address) throw new Error(`Wallet Core failed to derive address for ${coinName}`);
  return address;
}

/** Derive from an explicit BIP32 path. Use this for custom/mode policies. */
export async function deriveAddress(
  mnemonic: string,
  coinName: string,
  derivationPath: string,
  passphrase = ''
) {
  if (!/^m(?:\/[0-9]+'?)*$/.test(derivationPath)) {
    throw new Error('Invalid derivation path');
  }

  const { core, wallet } = await restoreWallet(mnemonic, passphrase);
  const coin = getCoinType(core, coinName);
  const privateKey = wallet.getKey(coin, derivationPath);
  if (!privateKey) throw new Error(`Wallet Core failed to derive key at ${derivationPath}`);
  const publicKey = privateKey.getPublicKey();
  const address = core.AnyAddress.createWithPublicKey(publicKey, coin).description();
  if (!address) throw new Error(`Wallet Core failed to create address for ${coinName}`);
  return address;
}

export async function isValidMnemonic(mnemonic: string): Promise<boolean> {
  try {
    await restoreWallet(mnemonic);
    return true;
  } catch {
    return false;
  }
}

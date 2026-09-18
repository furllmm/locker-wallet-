import type { LockerMode } from '../rules/modes.js';
import type { NetworkDefinition } from '../network/types.js';
import { evmModeDerivationPolicy, materializePath } from '../network/derivation.js';
import { deriveAddress, deriveDefaultAddress } from './wallet-core.js';

export interface WalletAccount {
  id: string;
  lockerId: string;
  networkId: string;
  coinName?: string;
  mode: LockerMode;
  accountIndex: number;
  derivationPath?: string;
  address: string;
}

export async function deriveAccountAddress(
  mnemonic: string,
  lockerId: string,
  network: NetworkDefinition,
  mode: LockerMode,
  accountIndex = 0,
  coinName?: string,
): Promise<WalletAccount> {
  if (accountIndex < 0 || !Number.isInteger(accountIndex)) throw new Error('Invalid account index');

  // Wallet Core registry networks use their own standard derivation unless a
  // caller explicitly provides a mode path. Custom EVM gets the mode branch.
  let address: string;
  let derivationPath: string | undefined;

  if (network.kind === 'custom-evm') {
    const policy = evmModeDerivationPolicy(network.id, mode);
    derivationPath = materializePath(policy.pathTemplate, accountIndex);
    // Custom EVM networks use Ethereum-compatible keys/addresses. Wallet Core's
    // Ethereum CoinType is used only for key/address derivation; the network's
    // chainId and RPC remain independent.
    address = await deriveAddress(mnemonic, 'ethereum', derivationPath);
  }

  if (!coinName) throw new Error('coinName is required for Wallet Core networks');

  if (network.derivation?.[0]?.path && mode === 'normal') {
    derivationPath = network.derivation[0].path.replace(/\/[0-9]+$/, `/${accountIndex}`);
    address = await deriveAddress(mnemonic, coinName, derivationPath);
  } else {
    address = await deriveDefaultAddress(mnemonic, coinName);
  }

  return {
    id: crypto.randomUUID(), lockerId, networkId: network.id, coinName,
    mode, accountIndex, ...(derivationPath ? { derivationPath } : {}), address,
  };
}

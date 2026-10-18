import {
  getWalletSettings,
  saveWalletSettings,
  type VaultDocument,
} from './vault.js';
import type { WalletSettings } from '../settings/wallet-settings.js';

/**
 * Storage boundary for the application layer. Implementations should atomically
 * replace the vault document and must never store the mnemonic separately.
 */
export interface VaultDocumentStore {
  load(): Promise<VaultDocument>;
  save(vault: VaultDocument): Promise<void>;
}

/**
 * Reads and persists wallet settings through the same encrypted vault document.
 * The storage adapter is supplied by the host app (desktop file store, etc.).
 */
export class WalletSettingsService {
  constructor(
    private readonly store: VaultDocumentStore,
    private readonly getPassword: () => Promise<string>,
  ) {}

  async get(): Promise<WalletSettings> {
    const [vault, password] = await Promise.all([this.store.load(), this.getPassword()]);
    return getWalletSettings(vault, password);
  }

  async save(settings: WalletSettings): Promise<void> {
    const [vault, password] = await Promise.all([this.store.load(), this.getPassword()]);
    const updatedVault = saveWalletSettings(vault, password, settings);
    await this.store.save(updatedVault);
  }
}

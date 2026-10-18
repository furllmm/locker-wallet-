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
 * Writes are serialized to prevent two settings saves from overwriting each other.
 */
export class WalletSettingsService {
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: VaultDocumentStore,
    private readonly getPassword: () => Promise<string>,
  ) {}

  async get(): Promise<WalletSettings> {
    // A read waits for earlier writes so it won't return stale settings.
    await this.saveQueue;
    const [vault, password] = await Promise.all([this.store.load(), this.getPassword()]);
    return getWalletSettings(vault, password);
  }

  save(settings: WalletSettings): Promise<void> {
    const operation = this.saveQueue.then(async () => {
      const [vault, password] = await Promise.all([this.store.load(), this.getPassword()]);
      const updatedVault = saveWalletSettings(vault, password, settings);
      await this.store.save(updatedVault);
    });
    // Keep the queue usable after a failed save, while returning the original error
    // to this caller.
    this.saveQueue = operation.catch(() => undefined);
    return operation;
  }
}

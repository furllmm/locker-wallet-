# Furllamm Crypto Locker Wallet — v0.4

Transaction domain milestone.

## Actions

- **Send:** send an asset to any valid destination address.
- **Receive:** presentation/read-only flow; it does not create an outgoing transaction.
- **Transfer:** choose another Locker/Account inside this wallet as the destination. On-chain this is still an ordinary transaction to that account's address.

## Rules

- Internal Transfer requires the same network.
- Cross-network movement is not silently treated as a Transfer; a future Bridge feature will handle that.
- Ghost and Receive Only are blocked immediately before signing.
- Spending threshold is enforced by the existing signing policy.
- Transaction amounts use integer base units to avoid floating-point money errors.

## Current boundary

v0.4 creates transaction intents/drafts and policy guards. It does **not** broadcast real transactions yet. RPC, fee estimation, transaction encoding, Wallet Core signing and broadcast belong to the next network-provider milestone.


## v0.5 — EVM provider milestone

- Added an HTTP JSON-RPC client with timeout and JSON-RPC error handling.
- Added EVM native balance, ERC-20 `balanceOf`, nonce, gas price and gas estimation helpers.
- Added custom EVM address derivation through Wallet Core's Ethereum key/address rules.
- Added native-transfer preparation and ERC-20 transfer ABI encoding.
- Added EIP-155 legacy transaction signing-payload encoding.
- Real signing/broadcast is still intentionally not automatic in this milestone. The next step is Wallet Core EVM signing integration plus explicit user confirmation before `eth_sendRawTransaction`.

Trust Wallet's current developer documentation describes Ethereum signing as: build transaction fields, sign with Wallet Core, then broadcast the encoded transaction; Ethereum default derivation is `m/44'/60'/0'/0/0`.

## Wallet Settings — default wallet and Saving Rules

- `defaultWalletId` stores the wallet preselected by the receive/send UI; `null` means no preference.
- Saving Rules are scoped to a source wallet and destination wallet and use a caller-provided USD valuation for the proposed transfer.
- A rule can block a transfer below its minimum USD value or show a warning. A transfer exactly at the threshold passes.
- Rules are policy-only: they never create, sign, or broadcast a transaction.
- `validateWalletSettings` validates wallet references and rule configuration; `evaluateSavingRules` evaluates a proposed transfer.
- Settings are stored inside the existing AES-256-GCM encrypted vault payload. Existing vaults without a `walletSettings` field load with safe defaults; saving settings re-encrypts the payload with a fresh salt and IV.
- Core APIs: `getWalletSettings(vault, password)` and `saveWalletSettings(vault, password, settings)`. The caller must persist the returned `VaultDocument` through the app's storage layer.
- This repository currently contains domain/core code rather than a rendered desktop UI, so the Wallet Settings screen and its add/edit/enable/delete controls still need UI integration.

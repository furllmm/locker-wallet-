import { canSign, type SigningContext } from '../rules/modes.js';
import type { TransactionDraft } from './types.js';

export function assertSigningAllowed(draft: TransactionDraft, context: SigningContext & { fromLockerId: string; fromAccountId: string }): void {
  if (draft.intent.fromLockerId !== context.fromLockerId || draft.intent.fromAccountId !== context.fromAccountId) throw new Error('Signing source does not match transaction source');
  const result = canSign(context);
  if (!result.allowed) throw new Error(result.reason ?? 'Signing blocked by wallet policy');
}

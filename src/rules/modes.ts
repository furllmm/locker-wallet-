export type LockerMode = 'normal' | 'ghost' | 'receive-only' | 'test';

export interface SigningContext {
  mode: LockerMode;
  balanceUsd: number;
  spendingThresholdUsd?: number;
}

export function canSign(ctx: SigningContext): { allowed: boolean; reason?: string } {
  if (ctx.mode === 'ghost') return { allowed: false, reason: 'Ghost Vault blocks signing.' };
  if (ctx.mode === 'receive-only') return { allowed: false, reason: 'Receive Only blocks signing.' };
  if (ctx.spendingThresholdUsd !== undefined && ctx.balanceUsd < ctx.spendingThresholdUsd) {
    return { allowed: false, reason: `Balance is below the spending threshold of $${ctx.spendingThresholdUsd}.` };
  }
  return { allowed: true };
}

export type GuardrailPrivateState = {
  originalCommitment: Uint8Array;
};

export function createGuardrailPrivateState(
  originalCommitment: Uint8Array,
): GuardrailPrivateState {
  return { originalCommitment };
}

/** Compact witness: SHA-256 of the raw paste. Never returned to the host or `/api/shield`. */
export const witnesses = {
  originalCommitment({
    privateState,
  }: {
    privateState: GuardrailPrivateState;
  }): [GuardrailPrivateState, Uint8Array] {
    return [privateState, privateState.originalCommitment];
  },
};

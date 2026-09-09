import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  originalCommitment(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  shield(context: __compactRuntime.CircuitContext<PS>,
         cleanedHash_0: Uint8Array,
         packFlags_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  shield(context: __compactRuntime.CircuitContext<PS>,
         cleanedHash_0: Uint8Array,
         packFlags_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  shield(context: __compactRuntime.CircuitContext<PS>,
         cleanedHash_0: Uint8Array,
         packFlags_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  attestations: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { cleanedHash: Uint8Array,
                             binding: Uint8Array,
                             packFlags: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { cleanedHash: Uint8Array, binding: Uint8Array, packFlags: bigint }]>
  };
  readonly nextId: bigint;
  readonly totalShielded: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

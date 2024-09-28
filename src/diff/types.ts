import { RecordKey, KeyOf, ValueType } from "@/utilities/types";

export interface Assign<TValue> {
  type: "assign";
  value: TValue;
}

export interface Add<TValue> {
  type: "add";
  value: TValue;
}

export interface Edit<TValue> {
  type: "edit";
  value: Diff<TValue>;
}

export interface Remove<TValue> {
  type: "remove";
  value: TValue;
}

export interface Move<TKey extends RecordKey> {
  type: "move";
  key: TKey;
}

export interface EditAndMove<TValue, TKey extends RecordKey> {
  type: "edit+move";
  value: Diff<TValue>;
  key: TKey;
}

export type RecordFieldChange<
  TRecord extends Record<RecordKey, unknown>,
  TKey extends keyof TRecord
> = TRecord[TKey] extends ValueType
  ? Assign<TRecord[TKey]>
  : TRecord[TKey] extends Array<infer _>
  ? Add<TRecord[TKey]> | Edit<TRecord[TKey]> | Remove<TRecord[TKey]>
  :
      | Add<TRecord[TKey]>
      | Edit<TRecord[TKey]>
      | Remove<TRecord[TKey]>
      | Move<KeyOf<TRecord, TRecord[TKey]>>
      | EditAndMove<TRecord[TKey], KeyOf<TRecord, TRecord[TKey]>>;

export type RecordDiff<TRecord extends Record<RecordKey, unknown>> = {
  [TKey in keyof TRecord]?: RecordFieldChange<TRecord, TKey>[];
};

export type ArrayItemChange<TRecord extends Record<RecordKey, unknown>> =
  | Add<TRecord>
  | Edit<TRecord>
  | Move<number>
  | EditAndMove<TRecord, number>
  | Remove<TRecord>;

export type ArrayDiff<TRecord extends Record<RecordKey, unknown>> = Map<number, ArrayItemChange<TRecord>[]>;

export type Diff<TValue> = TValue extends Record<RecordKey, infer _>
  ? RecordDiff<TValue>
  : TValue extends Array<infer TRecord>
  ? TRecord extends Record<RecordKey, infer _>
    ? ArrayDiff<TRecord>
    : never
  : never;

import { FieldKey } from "@/utilities/types";

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

export interface Move<TKey extends FieldKey> {
  type: "move";
  key: TKey;
}

export interface EditAndMove<TValue, TKey extends FieldKey> {
  type: "edit+move";
  value: Diff<TValue>;
  key: TKey;
}

export type RecordFieldChange<TValue> = TValue extends Array<infer _>
  ? Add<TValue> | Edit<TValue> | Remove<TValue>
  : TValue extends Record<FieldKey, infer _>
  ? Add<TValue> | Edit<TValue> | Remove<TValue> | Move<FieldKey> | EditAndMove<TValue, FieldKey>
  : Assign<TValue>;

export type RecordDiff<TRecord extends Record<FieldKey, any>> = {
  [TKey in keyof TRecord]?: RecordFieldChange<TRecord[TKey]>[];
};

export type ArrayItemChange<TRecord extends Record<FieldKey, any>> =
  | Add<TRecord>
  | Edit<TRecord>
  | Move<number>
  | EditAndMove<TRecord, number>
  | Remove<TRecord>;

export type ArrayDiff<TRecord extends Record<FieldKey, any>> = Map<number, ArrayItemChange<TRecord>[]>;

export type Diff<TValue> = TValue extends Record<FieldKey, infer _>
  ? RecordDiff<TValue>
  : TValue extends Array<infer TRecord>
  ? TRecord extends Record<FieldKey, infer _>
    ? ArrayDiff<TRecord>
    : never
  : never;

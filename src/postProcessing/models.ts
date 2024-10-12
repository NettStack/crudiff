import { Key, ValueType } from "@/core/models";

export interface Assign<TValue> {
  type: "assign";
  value: TValue;
}

export interface Add<TValue> {
  type: "add";
  value: TValue;
}

export interface AddAll<TValue> {
  type: "add-all";
  value: TValue;
}

export interface Edit<TValue> {
  type: "edit";
  value: Changes<TValue>;
}

export interface Move<TKey> {
  type: "move";
  key: TKey;
}

export interface Remove<TValue> {
  type: "remove";
  value: TValue;
}

export interface RemoveAll<TValue> {
  type: "remove-all";
  value: TValue;
}

export type EntityChanges<TValue extends Record<Key, unknown>, TKey extends Key> =
  | Add<TValue>
  | Edit<TValue>
  | Move<TKey>
  | Remove<TValue>;

export type MaybeEntityChanges<TValue, TKey extends Key> = TValue extends Record<Key, unknown>
  ? EntityChanges<TValue, TKey>[]
  : never;

export type EntityChangesRecord<TValue extends Record<Key, unknown>, TKey extends Key> = Record<
  TKey,
  EntityChanges<TValue, TKey>[]
>;

export type MaybeEntityChangesRecord<TValue, TKey extends Key> = TValue extends Record<Key, unknown>
  ? Record<TKey, MaybeEntityChanges<TValue, TKey>>
  : never;

export type ArrayChanges<TItem extends Record<Key, unknown>> =
  | AddAll<TItem[]>
  | Edit<TItem[]>
  | RemoveAll<TItem[]>;

export type MaybeArrayChanges<TItem> = TItem extends Record<Key, unknown>
  ? ArrayChanges<TItem>
  : never;

export type FieldChanges<TValue, TKey extends Key> = TValue extends ValueType
  ? Assign<TValue>
  : TValue extends Array<infer TItem>
  ? MaybeArrayChanges<TItem>
  : MaybeEntityChanges<TValue, TKey>;

export type FieldChangesRecord<TValue extends Record<Key, unknown>> = {
  [TKey in keyof TValue]?: FieldChanges<TValue[TKey], TKey>;
};

export type MaybeFieldChangesRecord<TValue> = TValue extends Record<Key, unknown>
  ? FieldChangesRecord<TValue>
  : never;

export type Changes<TValue> = TValue extends Array<infer TItem>
  ? MaybeEntityChangesRecord<TItem, number>
  : MaybeFieldChangesRecord<TValue>;

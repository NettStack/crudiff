export type ID = string | number;
export type FieldKey = string | number | symbol;
export type ValueType = string | number | bigint | symbol | null | undefined | Function | Date;

export interface Assign<TValue> {
  type: "assign";
  value: TValue;
}

export interface Create<TValue> {
  type: "create";
  value: TValue;
}

export interface Edit<TValue> {
  type: "edit";
  value: Diff<TValue>;
}

export interface Delete<TValue> {
  type: "delete";
  value: TValue;
}

export type Change<TValue> = TValue extends ValueType ? Assign<TValue> : Create<TValue> | Edit<TValue> | Delete<TValue>;

export type RecordDiff<TRecord extends Record<FieldKey, any>> = {
  [TKey in keyof TRecord]?: Change<TRecord[TKey]>;
};

export type ArrayDiff<TRecord extends Record<FieldKey, any>> = Map<number, Change<TRecord>>;

export type Diff<TValue> = TValue extends Record<FieldKey, infer _>
  ? RecordDiff<TValue>
  : TValue extends Array<infer TRecord>
  ? TRecord extends Record<FieldKey, infer _>
    ? ArrayDiff<TRecord>
    : never
  : never;

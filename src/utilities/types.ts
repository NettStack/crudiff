export type RecordKey = string | number | symbol;
export type ValueType = string | number | bigint | symbol | null | undefined | Function | Date;
export type ID = string | number;

export type ValueOf<TRecord extends Record<RecordKey, any>> = TRecord[keyof TRecord];

export type KeyOf<TRecord extends Record<RecordKey, any>, TValue> = Exclude<
  keyof TRecord,
  ValueOf<{ [TKey2 in keyof TRecord]: TRecord[TKey2] extends TValue ? undefined : TKey2 }>
>;

export {};

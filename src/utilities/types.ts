export type FieldKey = string | number | symbol;
export type ValueType = string | number | bigint | symbol | null | undefined | Function | Date;
export type ID = string | number;

export type WithField<TRecord extends Record<FieldKey, any>, TName extends FieldKey, TValue = any> = TRecord & {
  [key in TName]: TValue;
};

export type WithTypeField<TRecord extends Record<FieldKey, any> = {}> = WithField<TRecord, typeof typeFieldKey, string>;
export type WithIdField<TRecord extends Record<FieldKey, any> = {}> = WithField<TRecord, typeof idFieldKey, ID>;
export type WithDiffFields<TRecord extends Record<FieldKey, any> = {}> = WithTypeField<TRecord> & WithIdField<TRecord>;

const typeFieldKey: "__type" = "__type";
const idFieldKey: "__id" = "__id";

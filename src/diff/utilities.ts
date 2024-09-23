import { FieldKey, ValueType } from "./types";

export type ValueTypeAssertion<TValue> = TValue extends ValueType ? true : false;

export function isValueType<TValue>(value: TValue): ValueTypeAssertion<TValue> {
  const type = typeof value;

  const itIs =
    value === null ||
    type === "undefined" ||
    type === "bigint" ||
    type === "boolean" ||
    type === "function" ||
    type === "number" ||
    type === "string" ||
    type === "symbol" ||
    value instanceof Date;

  return itIs as ValueTypeAssertion<TValue>;
}

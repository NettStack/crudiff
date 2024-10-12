import { ValueType } from "./models";

export function isValueType(value: any): value is ValueType {
  const type = typeof value;

  return (
    value === null ||
    type === "undefined" ||
    type === "bigint" ||
    type === "boolean" ||
    type === "function" ||
    type === "number" ||
    type === "string" ||
    type === "symbol" ||
    value instanceof Date
  );
}

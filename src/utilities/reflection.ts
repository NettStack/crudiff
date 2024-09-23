export function isValueType<TValue>(value: TValue): boolean {
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

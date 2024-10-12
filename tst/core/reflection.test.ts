import { ValueType } from "@/core/models";
import { isValueType } from "@/core/reflection";

describe("Reflection", () => {
  describe("isValueType", () => {
    it("returns true", () => {
      const values: ValueType[] = [
        "",
        1,
        BigInt(1),
        Symbol(),
        null,
        undefined,
        () => {},
        new Date(),
      ];

      for (const value of values) expect(isValueType(value)).toEqual(true);
    });
  });
});

import { Executor } from "@/diff";
import { Add, ArrayItemChange, Edit, EditAndMove, Move, RecordFieldChange, Remove } from "@/diff/types";
import { ID, KeyOf } from "@/utilities/types";

describe("Executor", () => {
  const typeName = "TestRecord";

  const executor = new Executor({
    getId: (value: DiffTestRecord) => value.__id,
    getKeys: (value: DiffTestRecord): (keyof TestRecord)[] =>
      value.__type !== typeName
        ? []
        : [
            "number1",
            "number2",
            "array1",
            "array2",
            "array3",
            "array4",
            "record1",
            "record2",
            "record3",
            "record4",
            "record5",
            "record6",
            "record7",
            "record8",
          ],
  });

  describe("getDiff", () => {
    it("throws when trying to diff value types", () => {
      expect(() => executor.getDiff<any>("", {})).toThrow();
      expect(() => executor.getDiff<any>({}, "")).toThrow();
    });

    it("throws when record keys not returned", () => {
      expect(() => executor.getDiff<any>({}, {})).toThrow();
    });

    it("throws when record id is null", () => {
      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>>(
          { __type: typeName, record1: { __id: 1, __type: typeName } },
          { __type: typeName, record1: { __id: null!, __type: typeName } }
        )
      ).toThrow();

      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>>(
          { __type: typeName, record1: { __id: null!, __type: typeName } },
          { __type: typeName, record1: { __id: 1, __type: typeName } }
        )
      ).toThrow();

      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>[]>(
          [{ __id: 1, __type: typeName }],
          [{ __id: null!, __type: typeName }]
        )
      ).toThrow();

      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>[]>(
          [{ __id: null!, __type: typeName }],
          [{ __id: 1, __type: typeName }]
        )
      ).toThrow();
    });

    it("throws when record id is duplicated", () => {
      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>>(
          { __type: typeName, record1: { __id: 1, __type: typeName }, record2: { __id: 1, __type: typeName } },
          { __type: typeName }
        )
      ).toThrow();

      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>>(
          { __type: typeName },
          { __type: typeName, record1: { __id: 1, __type: typeName }, record2: { __id: 1, __type: typeName } }
        )
      ).toThrow();

      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>[]>(
          [
            { __id: 1, __type: typeName },
            { __id: 1, __type: typeName },
          ],
          [{ __type: typeName, __id: 1 }]
        )
      ).toThrow();

      expect(() =>
        executor.getDiff<Partial<DiffTestRecord>[]>(
          [{ __type: typeName, __id: 1 }],
          [
            { __id: 1, __type: typeName },
            { __id: 1, __type: typeName },
          ]
        )
      ).toThrow();
    });

    it("detects when there are no changes", () => {
      const record = {};
      const array: any[] = [];
      expect(executor.getDiff(record, record)).toBeFalsy();
      expect(executor.getDiff(array, array)).toBeFalsy();
    });

    it("detects object changes", () => {
      const initial: DiffTestRecord = {
        __id: "initial",
        __type: typeName,
        number1: 8,
        number2: undefined,
        array1: [],
        array2: undefined,
        array3: [{ __id: "array3", __type: typeName }],
        array4: [],
        record1: undefined,
        record2: undefined,
        record3: { __id: "record3", __type: typeName },
        record4: { __id: "record4", __type: typeName },
        record5: { __id: "record5", __type: typeName },
        record6: { __id: "record6", __type: typeName },
        record7: { __id: "record7", __type: typeName },
      };

      const current: DiffTestRecord = {
        __id: "initial",
        __type: typeName,
        number1: undefined,
        number2: 9,
        array1: [],
        array2: [],
        array3: [],
        array4: undefined,
        record1: undefined,
        record2: {
          __id: "record1",
          __type: typeName,
        },
        record3: { __id: "record3", __type: typeName, number1: 1 },
        record4: { __id: "record5", __type: typeName },
        record5: { __id: "record4", __type: typeName },
        record6: undefined,
        record7: { __id: "record8", __type: typeName },
        record8: { __id: "record7", __type: typeName, number1: 7 },
      };

      const diff = executor.getDiff(initial, current);

      expect(diff).toBeTruthy();

      expect(diff?.record1).toBeFalsy();
      expect(diff?.record2).toEqual<RecordFieldChange<DiffTestRecord, "record2">[]>([
        {
          type: "add",
          value: current.record2,
        },
      ]);
      expect(diff?.record3).toEqual<RecordFieldChange<DiffTestRecord, "record3">[]>([
        {
          type: "edit",
          value: {
            number1: [
              {
                type: "assign",
                value: 1,
              },
            ],
          },
        },
      ]);
      expect(diff?.record4).toEqual<RecordFieldChange<DiffTestRecord, "record4">[]>([
        {
          type: "move",
          key: "record5",
        },
      ]);
      expect(diff?.record5).toEqual<RecordFieldChange<DiffTestRecord, "record5">[]>([
        {
          type: "move",
          key: "record4",
        },
      ]);
      expect(diff?.record6).toEqual<RecordFieldChange<DiffTestRecord, "record6">[]>([
        {
          type: "remove",
          value: initial.record6,
        },
      ]);
      expect(diff?.record7).toEqual<RecordFieldChange<DiffTestRecord, "record7">[]>([
        {
          type: "edit+move",
          value: {
            number1: [
              {
                type: "assign",
                value: 7,
              },
            ],
          },
          key: "record8",
        },
        {
          type: "add",
          value: current.record7,
        },
      ]);

      expect(diff?.number1).toEqual<RecordFieldChange<DiffTestRecord, "number1">[]>([
        {
          type: "assign",
          value: current.number1,
        },
      ]);
      expect(diff?.number2).toEqual<RecordFieldChange<DiffTestRecord, "number2">[]>([
        {
          type: "assign",
          value: current.number2,
        },
      ]);
      expect(diff?.array1).toBeFalsy();
      expect(diff?.array2).toEqual<RecordFieldChange<DiffTestRecord, "array2">[]>([
        {
          type: "add",
          value: current.array2,
        },
      ]);
      expect(diff?.array3).toEqual<RecordFieldChange<DiffTestRecord, "array3">[]>([
        {
          type: "edit",
          value: new Map<number, ArrayItemChange<DiffTestRecord>[]>([
            [
              0,
              [
                {
                  type: "remove",
                  value: initial.array3![0],
                },
              ],
            ],
          ]),
        },
      ]);
      expect(diff?.array4).toEqual<RecordFieldChange<DiffTestRecord, "array3">[]>([
        {
          type: "remove",
          value: initial.array4,
        },
      ]);
    });

    it("detects array changes", () => {
      const initial: DiffTestRecord[] = [
        { __type: typeName, __id: "unchanged", number1: 0 },
        { __type: typeName, __id: "edited", number1: 2 },
        { __type: typeName, __id: "moved", number1: 4 },
        { __type: typeName, __id: "editedAndmoved", number1: 5 },
        { __type: typeName, __id: "removed", number1: 3 },
      ];

      const current: DiffTestRecord[] = [
        { __type: typeName, __id: "unchanged", number1: 0 },
        { __type: typeName, __id: "edited", number1: 6 },
        { __type: typeName, __id: "editedAndmoved", number1: 7 },
        { __type: typeName, __id: "moved", number1: 4 },
        { __type: typeName, __id: "added", number1: 8 },
      ];

      const diff = executor.getDiff(initial, current);

      expect(diff).toBeTruthy();

      expect(diff?.get(0)).toBeFalsy();

      expect(diff?.get(1)?.[0]).toEqual<Edit<DiffTestRecord>>({
        type: "edit",
        value: {
          number1: [
            {
              type: "assign",
              value: 6,
            },
          ],
        },
      });

      expect(diff?.get(2)?.[0]).toEqual<Move<number>>({
        type: "move",
        key: 3,
      });

      expect(diff?.get(3)?.[0]).toEqual<EditAndMove<DiffTestRecord, number>>({
        type: "edit+move",
        value: {
          number1: [
            {
              type: "assign",
              value: 7,
            },
          ],
        },
        key: 2,
      });

      expect(diff?.get(4)?.[0]).toEqual<Remove<DiffTestRecord>>({
        type: "remove",
        value: initial[4],
      });

      expect(diff?.get(4)?.[1]).toEqual<Add<DiffTestRecord>>({
        type: "add",
        value: current[4],
      });
    });
  });
});

type TestRecord = {
  number1?: number;
  number2?: number;
  record1?: TestRecord;
  record2?: TestRecord;
  record3?: TestRecord;
  record4?: TestRecord;
  record5?: TestRecord;
  record6?: TestRecord;
  record7?: TestRecord;
  record8?: TestRecord;
  array1?: TestRecord[];
  array2?: TestRecord[];
  array3?: TestRecord[];
  array4?: TestRecord[];
};

type DiffTestRecord = TestRecord & { __id: ID; __type: string } & Omit<
    TestRecord,
    KeyOf<TestRecord, TestRecord> | KeyOf<TestRecord, TestRecord[]>
  > & {
    record1?: DiffTestRecord;
    record2?: DiffTestRecord;
    record3?: DiffTestRecord;
    record4?: DiffTestRecord;
    record5?: DiffTestRecord;
    record6?: DiffTestRecord;
    record7?: DiffTestRecord;
    record8?: DiffTestRecord;
    array1?: DiffTestRecord[];
    array2?: DiffTestRecord[];
    array3?: DiffTestRecord[];
    array4?: DiffTestRecord[];
  };

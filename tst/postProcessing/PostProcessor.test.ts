import { Uid } from "@/core/models";
import { PostProcessor } from "@/postProcessing";
import { Add, Edit, FieldChanges, Move, Remove } from "@/postProcessing/models";

describe("PostProcessor", () => {
  const typeName = "Entity";

  const processor = new PostProcessor({
    getId: (value: Entity) => value.__id,
    getKeys: (value: Entity): (keyof Entity)[] =>
      value.__type !== typeName
        ? []
        : [
            "number1",
            "number2",
            "array1",
            "array2",
            "array3",
            "array4",
            "entity1",
            "entity2",
            "entity3",
            "entity4",
            "entity5",
            "entity6",
            "entity7",
            "entity8",
          ],
  });

  describe("getChanges", () => {
    it("throws when trying to get changes for value types", () => {
      expect(() => processor.getChanges<any>("", {})).toThrow();
      expect(() => processor.getChanges<any>({}, "")).toThrow();
    });

    it("throws when entity keys not returned", () => {
      expect(() => processor.getChanges<any>({}, {})).toThrow();
    });

    it("throws when entity id is null", () => {
      expect(() =>
        processor.getChanges<Partial<Entity>>(
          { __type: typeName, entity1: { __id: 1, __type: typeName } },
          { __type: typeName, entity1: { __id: null!, __type: typeName } }
        )
      ).toThrow();

      expect(() =>
        processor.getChanges<Partial<Entity>>(
          { __type: typeName, entity1: { __id: null!, __type: typeName } },
          { __type: typeName, entity1: { __id: 1, __type: typeName } }
        )
      ).toThrow();

      expect(() =>
        processor.getChanges<Partial<Entity>[]>(
          [{ __id: 1, __type: typeName }],
          [{ __id: null!, __type: typeName }]
        )
      ).toThrow();

      expect(() =>
        processor.getChanges<Partial<Entity>[]>(
          [{ __id: null!, __type: typeName }],
          [{ __id: 1, __type: typeName }]
        )
      ).toThrow();
    });

    it("throws when entity id is duplicated", () => {
      expect(() =>
        processor.getChanges<Partial<Entity>>(
          {
            __type: typeName,
            entity1: { __id: 1, __type: typeName },
            entity2: { __id: 1, __type: typeName },
          },
          { __type: typeName }
        )
      ).toThrow();

      expect(() =>
        processor.getChanges<Partial<Entity>>(
          { __type: typeName },
          {
            __type: typeName,
            entity1: { __id: 1, __type: typeName },
            entity2: { __id: 1, __type: typeName },
          }
        )
      ).toThrow();

      expect(() =>
        processor.getChanges<Partial<Entity>[]>(
          [
            { __id: 1, __type: typeName },
            { __id: 1, __type: typeName },
          ],
          [{ __type: typeName, __id: 1 }]
        )
      ).toThrow();

      expect(() =>
        processor.getChanges<Partial<Entity>[]>(
          [{ __type: typeName, __id: 1 }],
          [
            { __id: 1, __type: typeName },
            { __id: 1, __type: typeName },
          ]
        )
      ).toThrow();
    });

    it("detects when there are no changes", () => {
      const entity: Entity = { __type: typeName, __id: 1 };
      const array: any[] = [];
      expect(processor.getChanges(entity, entity)).toBeFalsy();
      expect(
        processor.getChanges({ ...entity, number1: undefined }, { ...entity, number1: null })
      ).toBeFalsy();
      expect(processor.getChanges(array, array)).toBeFalsy();
    });

    it("detects entity changes", () => {
      const initial: Entity = {
        __id: "initial",
        __type: typeName,
        number1: 8,
        number2: undefined,
        array1: [],
        array2: undefined,
        array3: [{ __id: "array3", __type: typeName }],
        array4: [],
        entity1: undefined,
        entity2: undefined,
        entity3: { __id: "entity3", __type: typeName },
        entity4: { __id: "entity4", __type: typeName },
        entity5: { __id: "entity5", __type: typeName },
        entity6: { __id: "entity6", __type: typeName },
        entity7: { __id: "entity7", __type: typeName },
      };

      const current: Entity = {
        __id: "initial",
        __type: typeName,
        number1: undefined,
        number2: 9,
        array1: [],
        array2: [],
        array3: [],
        array4: undefined,
        entity1: undefined,
        entity2: {
          __id: "entity1",
          __type: typeName,
        },
        entity3: { __id: "entity3", __type: typeName, number1: 1 },
        entity4: { __id: "entity5", __type: typeName },
        entity5: { __id: "entity4", __type: typeName },
        entity6: undefined,
        entity7: { __id: "entity8", __type: typeName },
        entity8: { __id: "entity7", __type: typeName, number1: 7 },
      };

      const changes = processor.getChanges(initial, current);

      expect(changes).toBeTruthy();

      expect(changes?.entity1).toBeFalsy();
      expect(changes?.entity2).toEqual<FieldChanges<Entity["entity3"], keyof Entity>>([
        {
          type: "add",
          value: current.entity2!,
        },
      ]);
      expect(changes?.entity3).toEqual<FieldChanges<Entity["entity3"], keyof Entity>>([
        {
          type: "edit",
          value: {
            number1: {
              type: "assign",
              value: 1,
            },
          },
        },
      ]);
      expect(changes?.entity4).toEqual<FieldChanges<Entity["entity4"], keyof Entity>>([
        {
          type: "move",
          key: "entity5",
        },
      ]);
      expect(changes?.entity5).toEqual<FieldChanges<Entity["entity5"], keyof Entity>>([
        {
          type: "move",
          key: "entity4",
        },
      ]);
      expect(changes?.entity6).toEqual<FieldChanges<Entity["entity6"], keyof Entity>>([
        {
          type: "remove",
          value: initial.entity6!,
        },
      ]);
      expect(changes?.entity7).toEqual<FieldChanges<Entity["entity7"], keyof Entity>>([
        {
          type: "edit",
          value: {
            number1: {
              type: "assign",
              value: 7,
            },
          },
        },
        {
          type: "move",
          key: "entity8",
        },
        {
          type: "add",
          value: current.entity7!,
        },
      ]);

      expect(changes?.number1).toEqual<FieldChanges<Entity["number1"], keyof Entity>>({
        type: "assign",
        value: current.number1,
      });
      expect(changes?.number2).toEqual<FieldChanges<Entity["number2"], keyof Entity>>({
        type: "assign",
        value: current.number2,
      });
      expect(changes?.array1).toBeFalsy();
      expect(changes?.array2).toEqual<FieldChanges<Entity["array2"], keyof Entity>>({
        type: "add-all",
        value: current.array2!,
      });
      expect(changes?.array3).toEqual<FieldChanges<Entity["array3"], keyof Entity>>({
        type: "edit",
        value: {
          "0": [
            {
              type: "remove",
              value: initial.array3![0],
            },
          ],
        },
      });
      expect(changes?.array4).toEqual<FieldChanges<Entity["array4"], keyof Entity>>({
        type: "remove-all",
        value: initial.array4!,
      });
    });

    it("detects array changes", () => {
      const initial: Entity[] = [
        { __type: typeName, __id: "unchanged", number1: 0 },
        { __type: typeName, __id: "edited", number1: 2 },
        { __type: typeName, __id: "moved", number1: 4 },
        { __type: typeName, __id: "editedAndmoved", number1: 5 },
        { __type: typeName, __id: "removed", number1: 3 },
      ];

      const current: Entity[] = [
        { __type: typeName, __id: "unchanged", number1: 0 },
        { __type: typeName, __id: "edited", number1: 6 },
        { __type: typeName, __id: "editedAndmoved", number1: 7 },
        { __type: typeName, __id: "moved", number1: 4 },
        { __type: typeName, __id: "added", number1: 8 },
      ];

      const changes = processor.getChanges(initial, current);

      expect(changes).toBeTruthy();

      expect(changes?.[0]).toBeFalsy();

      expect(changes?.[1]?.[0]).toEqual<Edit<Entity>>({
        type: "edit",
        value: {
          number1: {
            type: "assign",
            value: 6,
          },
        },
      });

      expect(changes?.[2]?.[0]).toEqual<Move<number>>({
        type: "move",
        key: 3,
      });

      expect(changes?.[3]?.[0]).toEqual<Edit<Entity>>({
        type: "edit",
        value: {
          number1: {
            type: "assign",
            value: 7,
          },
        },
      });

      expect(changes?.[3]?.[1]).toEqual<Move<number>>({
        type: "move",
        key: 2,
      });

      expect(changes?.[4]?.[0]).toEqual<Remove<Entity>>({
        type: "remove",
        value: initial[4],
      });

      expect(changes?.[4]?.[1]).toEqual<Add<Entity>>({
        type: "add",
        value: current[4],
      });
    });
  });
});

type Entity = {
  __id: Uid;
  __type: string;
  number1?: number | null;
  number2?: number;
  entity1?: Entity;
  entity2?: Entity;
  entity3?: Entity;
  entity4?: Entity;
  entity5?: Entity;
  entity6?: Entity;
  entity7?: Entity;
  entity8?: Entity;
  array1?: Entity[];
  array2?: Entity[];
  array3?: Entity[];
  array4?: Entity[];
};

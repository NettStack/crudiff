import { Executor } from "@/diff";
import { Add, Remove, Edit, EditAndMove, Move, RecordDiff } from "@/diff/types";
import { WithDiffFields, WithIdField, WithTypeField } from "@/utilities/types";
import * as Yup from "yup";

describe("Executor", () => {
  describe("getSchema", () => {
    it("gets", () => {
      const typeName = "a";
      const schema = Yup.object({});

      const executor = new Executor({
        getId: () => "",
        getSchemaKey: (value) => (value as WithTypeField).__type,
        schemas: new Map([[typeName, schema]]),
      });

      const instance: WithTypeField = { __type: typeName };

      expect(executor.getSchema(instance)).toBe(schema);
    });

    it("fails to get", () => {
      const typeName = "a";
      const schema = Yup.object({});

      const executor = new Executor({
        getId: () => "",
        getSchemaKey: (value) => (value as WithTypeField).__type,
        schemas: new Map([[typeName, schema]]),
      });

      const instance: WithTypeField = { __type: typeName.toUpperCase() };

      expect(executor.getSchema(instance)).toBeUndefined();
    });
  });

  describe("getRecordsDiff", () => {
    it("gets nothing", () => {
      const schema: Yup.ObjectSchema<{ fieldValue: number }> = Yup.object({
        fieldValue: Yup.number().required(),
      });

      const typeName = "a";

      const instance: WithDiffFields<{ fieldValue: number }> = {
        __type: typeName,
        __id: "unchanged",
        fieldValue: 1,
      };

      const executor = new Executor({
        getId: (value) => (value as WithIdField).__id,
        getSchemaKey: (value) => (value as WithTypeField).__type,
        schemas: new Map([[typeName, schema]]),
      });

      expect(executor.getRecordsDiff(instance, instance)).toBeFalsy();
      expect(executor.getRecordsDiff(instance, { ...instance })).toBeFalsy();
    });

    it("gets assignments", () => {
      const schema: Yup.ObjectSchema<{ fieldValue: number }> = Yup.object({
        fieldValue: Yup.number().required(),
      });

      const typeName = "a";

      const initial: WithDiffFields<{ fieldValue: number }> = {
        __type: typeName,
        __id: "edited",
        fieldValue: 2,
      };

      const current: WithDiffFields<{ fieldValue: number }> = {
        __type: typeName,
        __id: "edited",
        fieldValue: 6,
      };

      const executor = new Executor({
        getId: (value) => (value as WithIdField).__id,
        getSchemaKey: (value) => (value as WithTypeField).__type,
        schemas: new Map([[typeName, schema]]),
      });

      const diff = executor.getRecordsDiff(initial, current);

      expect(diff).toBeTruthy();
      expect(diff).toEqual<RecordDiff<typeof initial>>({
        fieldValue: [
          {
            type: "assign",
            value: 6,
          },
        ],
      });
    });

    it("gets added", () => {
      const schema: Yup.ObjectSchema<{ fieldValue: number }> = Yup.object({
        fieldValue: Yup.number().required(),
      });

      const typeName = "a";

      const initial: WithDiffFields<{ fieldValue?: { fieldValue: number } }> = {
        __type: typeName,
        __id: "edited",
      };

      const current: WithDiffFields<{ fieldValue?: { fieldValue: number } }> = {
        __type: typeName,
        __id: "edited",
        fieldValue: {
          fieldValue: 3,
        },
      };

      const executor = new Executor({
        getId: (value) => (value as WithIdField).__id,
        getSchemaKey: (value) => (value as WithTypeField).__type,
        schemas: new Map([[typeName, schema]]),
      });

      const diff = executor.getRecordsDiff(initial, current);

      expect(diff).toBeTruthy();
      expect(diff).toEqual<RecordDiff<typeof initial>>({
        fieldValue: [
          {
            type: "add",
            value: {
              fieldValue: 3,
            },
          },
        ],
      });
    });
  });

  describe("getArraysDiff", () => {
    it("gets nothing", () => {
      const typeName = "a";

      const schema: Yup.ObjectSchema<{ fieldValue: number }> = Yup.object({
        fieldValue: Yup.number().required(),
      });

      const instances: WithDiffFields<{ fieldValue: number }>[] = [
        { __type: typeName, __id: "unchanged", fieldValue: 1 },
      ];

      const executor = new Executor({
        getId: (value) => (value as WithIdField).__id,
        getSchemaKey: (value) => (value as WithTypeField).__type,
        schemas: new Map([[typeName, schema]]),
      });

      expect(executor.getArraysDiff(instances, instances)).toBeFalsy();
      expect(executor.getArraysDiff(instances, [...instances])).toBeFalsy();
    });

    it("gets edited, moved, editedAndMoved, removed and added", () => {
      const typeName = "a";

      const schema: Yup.ObjectSchema<{ fieldValue: number }> = Yup.object({
        fieldValue: Yup.number().required(),
      });

      const initial: WithDiffFields<{ fieldValue: number }>[] = [
        { __type: typeName, __id: "edited", fieldValue: 2 },
        { __type: typeName, __id: "moved", fieldValue: 4 },
        { __type: typeName, __id: "editedAndmoved", fieldValue: 5 },
        { __type: typeName, __id: "removed", fieldValue: 3 },
      ];

      const current: WithDiffFields<{ fieldValue: number }>[] = [
        { __type: typeName, __id: "edited", fieldValue: 6 },
        { __type: typeName, __id: "editedAndmoved", fieldValue: 7 },
        { __type: typeName, __id: "moved", fieldValue: 4 },
        { __type: typeName, __id: "added", fieldValue: 8 },
      ];

      const executor = new Executor({
        getId: (value) => (value as WithIdField).__id,
        getSchemaKey: (value) => (value as WithTypeField).__type,
        schemas: new Map([[typeName, schema]]),
      });

      const diff = executor.getArraysDiff(initial, current);

      expect(diff).toBeTruthy();

      expect(diff?.get(0)?.[0]).toEqual<Edit<(typeof initial)[0]>>({
        type: "edit",
        value: {
          fieldValue: [
            {
              type: "assign",
              value: 6,
            },
          ],
        },
      });

      expect(diff?.get(1)?.[0]).toEqual<Move<number>>({
        type: "move",
        key: 2,
      });

      expect(diff?.get(2)?.[0]).toEqual<EditAndMove<(typeof initial)[0], number>>({
        type: "edit+move",
        value: {
          fieldValue: [
            {
              type: "assign",
              value: 7,
            },
          ],
        },
        key: 1,
      });

      expect(diff?.get(3)?.[0]).toEqual<Remove<(typeof initial)[0]>>({
        type: "remove",
        value: initial[3],
      });

      expect(diff?.get(3)?.[1]).toEqual<Add<(typeof initial)[0]>>({
        type: "add",
        value: current[3],
      });
    });
  });
});

import * as Yup from "yup";
import { isValueType } from "../utilities/reflection";
import { ArrayDiff, Assign, Change, Create, Delete, Diff, Edit, FieldKey, ID, Move, RecordDiff } from "./types";

export type SchemaId = string;

export interface ExecutionOptions {
  getId<TValue>(value: TValue): ID;
  getSchemaKey<TValue>(value: TValue): SchemaId;
  schemas: Map<SchemaId, any>;
}

export default class Executor {
  getSchema<TRecord extends Record<FieldKey, any>>(value: TRecord): Yup.ObjectSchema<TRecord> | undefined {
    const key = this.options.getSchemaKey(value);
    return key == null ? undefined : this.options.schemas.get(key);
  }

  getDiff<TValue>(initial: TValue, current: TValue): Diff<TValue> | undefined {
    if (isValueType(initial) || isValueType(current)) throw new Error("Value types not allowed.");

    if (Array.isArray(initial) && Array.isArray(current))
      return this.getArraysDiff(initial, current) as Diff<TValue> | undefined;

    return this.getRecordsDiff(
      initial as { [TKey in keyof TValue]: TValue[TKey] },
      current as { [TKey in keyof TValue]: TValue[TKey] }
    ) as Diff<TValue> | undefined;
  }

  getRecordsDiff<TRecord extends Record<FieldKey, any>>(
    initial: TRecord,
    current: TRecord
  ): RecordDiff<TRecord> | undefined {
    if (initial === current || (initial == null && current == null)) return undefined;

    const schema = this.getSchema(initial);

    if (!schema) throw new Error(`Schema not found for: ${JSON.stringify(initial)}.`);

    const diff: RecordDiff<TRecord> = {};

    for (const key in schema.fields) {
      if (key in initial) {
        const initialValue = initial[key];

        if (!(key in current)) {
          if (isValueType(initialValue)) {
            diff[key] = {
              type: "assign",
              value: undefined,
            } as Assign<typeof initialValue> as Change<typeof initialValue>;
          } else {
            diff[key] = {
              type: "delete",
              value: initialValue,
            } as Delete<typeof initialValue> as Change<typeof initialValue>;
          }
        } else {
          if (isValueType(initialValue)) {
            diff[key] = {
              type: "assign",
              value: current[key],
            } as Assign<typeof initialValue> as Change<typeof initialValue>;
          } else {
            const value = this.getDiff(initialValue, current[key]);

            if (value)
              diff[key] = {
                type: "edit",
                value,
              } as Edit<typeof initialValue> as Change<typeof initialValue>;
          }
        }
      } else if (key in current) {
        const currentValue = current[key];

        if (isValueType(currentValue))
          diff[key] = {
            type: "assign",
            value: currentValue,
          } as Assign<typeof currentValue> as Change<typeof currentValue>;
        else
          diff[key] = {
            type: "create",
            value: currentValue,
          } as Create<typeof currentValue> as Change<typeof currentValue>;
      }
    }

    return diff;
  }

  getArraysDiff<TRecord extends Record<FieldKey, any>>(
    initial: TRecord[],
    current: TRecord[]
  ): ArrayDiff<TRecord> | undefined {
    if (initial === current || (initial == null && current == null)) return undefined;

    const initialLookup = new Map<ID, number>();
    const currentLookup = new Map<ID, number>();

    initial.forEach((value, index) => {
      const id = this.options.getId(value);

      if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(initial)}.`);
      if (initialLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(initial)}.`);

      initialLookup.set(id, index);
    });

    current.forEach((value, index) => {
      const id = this.options.getId(value);

      if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(current)}.`);
      if (currentLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(current)}.`);

      currentLookup.set(id, index);
    });

    const diff: ArrayDiff<TRecord> = new Map();

    initialLookup.forEach((initialIndex, id) => {
      const currentIndex = currentLookup.get(id);

      if (currentIndex == null) {
        diff.set(initialIndex, { type: "delete", value: initial[initialIndex] });
      } else {
        let edit: Edit<TRecord> | undefined;
        let move: Move | undefined;

        if (initialIndex !== currentIndex) move = { type: "move", index: currentIndex };

        const value = this.getDiff(initial[initialIndex], current[currentIndex]);

        if (value) edit = { type: "edit", value };

        if (edit && move) diff.set(initialIndex, { ...edit, ...move, type: "edit+move" });
        else if (edit) diff.set(initialIndex, edit);
        else if (move) diff.set(initialIndex, move);
      }
    });

    currentLookup.forEach((currentIndex, id) => {
      if (!initialLookup.has(id))
        diff.set(currentIndex, {
          type: "create",
          value: current[currentIndex],
        });
    });

    return diff;
  }

  constructor(readonly options: ExecutionOptions) {}
}

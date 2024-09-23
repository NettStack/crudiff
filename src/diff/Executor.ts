import { FieldKey, ID } from "@/utilities/types";
import * as Yup from "yup";
import { isValueType } from "../utilities/reflection";
import {
  Add,
  ArrayDiff,
  ArrayItemChange,
  Assign,
  Diff,
  Edit,
  Move,
  RecordDiff,
  RecordFieldChange,
  Remove,
} from "./types";

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

    // const initialLookup = new Map<ID, FieldKey>();
    // const currentLookup = new Map<ID, FieldKey>();

    // Object.entries(initial).forEach(([key, value]) => {
    //   const id = this.options.getId(value);

    //   if (id == null) return;
    //   if (initialLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(initial)}.`);

    //   initialLookup.set(id, key);
    // });

    // Object.entries(current).forEach(([key, value]) => {
    //   const id = this.options.getId(value);

    //   if (id == null) return;
    //   if (currentLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(current)}.`);

    //   currentLookup.set(id, key);
    // });

    const diff: RecordDiff<TRecord> = {};

    for (const key in schema.fields) {
      if (key in initial) {
        const initialValue = initial[key];

        if (!(key in current)) {
          if (isValueType(initialValue)) {
            includeRecordChange(diff, key, {
              type: "assign",
              value: undefined,
            } as Assign<typeof initialValue> as RecordFieldChange<typeof initialValue>);
          } else {
            includeRecordChange(diff, key, {
              type: "remove",
              value: initialValue,
            } as Remove<typeof initialValue> as RecordFieldChange<typeof initialValue>);
          }
        } else {
          if (isValueType(initialValue)) {
            const currentValue = current[key];

            if (initialValue !== currentValue)
              includeRecordChange(diff, key, {
                type: "assign",
                value: currentValue,
              } as Assign<typeof initialValue> as RecordFieldChange<typeof initialValue>);
          } else {
            const valueDiff = this.getDiff(initialValue, current[key]);

            if (valueDiff)
              includeRecordChange(diff, key, {
                type: "edit",
                value: valueDiff,
              } as Edit<typeof initialValue> as RecordFieldChange<typeof initialValue>);
          }
        }
      } else if (key in current) {
        const currentValue = current[key];

        if (isValueType(currentValue))
          includeRecordChange(diff, key, {
            type: "assign",
            value: currentValue,
          } as Assign<typeof currentValue> as RecordFieldChange<typeof currentValue>);
        else
          includeRecordChange(diff, key, {
            type: "add",
            value: currentValue,
          } as Add<typeof currentValue> as RecordFieldChange<typeof currentValue>);
      }
    }

    return Object.keys(diff).length ? diff : undefined;
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
        includeArrayChange(diff, initialIndex, { type: "remove", value: initial[initialIndex] });
      } else {
        let edit: Edit<TRecord> | undefined;
        let move: Move<number> | undefined;

        if (initialIndex !== currentIndex) move = { type: "move", key: currentIndex };

        const value = this.getDiff(initial[initialIndex], current[currentIndex]);

        if (value) edit = { type: "edit", value };

        if (edit && move) includeArrayChange(diff, initialIndex, { ...edit, ...move, type: "edit+move" });
        else if (edit) includeArrayChange(diff, initialIndex, edit);
        else if (move) includeArrayChange(diff, initialIndex, move);
      }
    });

    currentLookup.forEach((currentIndex, id) => {
      if (!initialLookup.has(id))
        includeArrayChange(diff, currentIndex, {
          type: "add",
          value: current[currentIndex],
        });
    });

    return diff.size ? diff : undefined;
  }

  constructor(readonly options: ExecutionOptions) {}
}

function includeArrayChange<TRecord extends Record<FieldKey, any>>(
  diff: ArrayDiff<TRecord>,
  index: number,
  change: ArrayItemChange<TRecord>
) {
  let changeSet = diff.get(index);

  if (changeSet == null) diff.set(index, (changeSet = []));

  changeSet.push(change);
}

function includeRecordChange<TRecord extends Record<FieldKey, any>>(
  diff: RecordDiff<TRecord>,
  key: keyof TRecord,
  change: RecordFieldChange<TRecord[typeof key]>
) {
  let changeSet = diff[key];

  if (changeSet == null) diff[key] = changeSet = [];

  changeSet.push(change);
}

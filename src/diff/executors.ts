import * as Yup from "yup";
import { Assign, Change, Create, Delete, Diff, Edit, FieldKey, ID, RecordDiff } from "./types";
import { isValueType } from "./utilities";

export type SchemaId = string;

export interface ExecutionOptions {
  getId<TValue>(value: TValue): ID;
  getSchemaKey<TValue>(value: TValue): SchemaId;
  schemas: Map<SchemaId, any>;
}

export class Executor {
  getSchema<TRecord extends Record<FieldKey, any>>(value: TRecord): Yup.ObjectSchema<TRecord> | undefined {
    const key = this.options.getSchemaKey(value);
    return key == null ? undefined : this.options.schemas.get(key);
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
            diff[key] = {
              type: "edit",
              value: this.execute(initialValue, current[key]),
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

  execute<TValue>(initial: TValue, current: TValue): Diff<TValue> | undefined {
    throw new Error("Method not implemented.");
  }

  constructor(readonly options: ExecutionOptions) {}
}

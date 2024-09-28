import { isValueType } from "@/utilities/reflection";
import { ID, RecordKey } from "@/utilities/types";
import {
  Add,
  ArrayDiff,
  ArrayItemChange,
  Assign,
  Diff,
  Edit,
  EditAndMove,
  Move,
  RecordDiff,
  RecordFieldChange,
  Remove,
} from "./types";

export type SchemaId = string;

export interface ExecutionOptions {
  getId(value: unknown): ID;
  getKeys(value: unknown): string[];
}

export default class Executor {
  getDiff<TValue>(initial: TValue, current: TValue): Diff<TValue> | undefined {
    if (isValueType(initial) || isValueType(current)) throw new Error("Value types not allowed.");

    if (Array.isArray(initial) && Array.isArray(current))
      return this.getArraysDiff(initial, current) as Diff<TValue> | undefined;

    return this.getRecordsDiff(
      initial as { [TKey in keyof TValue]: TValue[TKey] },
      current as { [TKey in keyof TValue]: TValue[TKey] }
    ) as Diff<TValue> | undefined;
  }

  private getRecordsDiff<TRecord extends Record<RecordKey, unknown>>(
    initial: TRecord,
    current: TRecord
  ): RecordDiff<TRecord> | undefined {
    if (initial === current) return undefined;

    const keys: (keyof TRecord)[] = this.options.getKeys(initial);

    if (!keys.length) throw new Error(`Keys not returned for: ${JSON.stringify(initial)}.`);

    const diff: RecordDiff<TRecord> = {};

    this.getRecordFieldsChanges<TRecord>(keys, initial, current, diff);
    this.getNonRecordFieldsChanges<TRecord>(keys, initial, current, diff);

    return Object.keys(diff).length ? diff : undefined;
  }

  private getRecordFieldsChanges<TRecord extends Record<RecordKey, unknown>>(
    keys: (keyof TRecord)[],
    initial: TRecord,
    current: TRecord,
    diff: RecordDiff<TRecord>
  ) {
    const initialLookup = new Map<ID, keyof TRecord>();
    const currentLookup = new Map<ID, keyof TRecord>();

    keys.forEach((key) => {
      let value: TRecord[typeof key];

      value = initial[key];

      if (!(isValueType(value) || Array.isArray(value))) {
        const id = this.options.getId(value);

        if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
        if (initialLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

        initialLookup.set(id, key);
      }

      value = current[key];

      if (!(isValueType(value) || Array.isArray(value))) {
        const id = this.options.getId(value);

        if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
        if (currentLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

        currentLookup.set(id, key);
      }
    });

    initialLookup.forEach((initialKey, id) => {
      const currentKey = currentLookup.get(id);

      if (currentKey == null) {
        const remove: Remove<TRecord[typeof initialKey]> = {
          type: "remove",
          value: initial[initialKey],
        };

        includeRecordChange(diff, initialKey, remove as RecordFieldChange<TRecord, typeof initialKey>);
      } else {
        let edit: Edit<TRecord[typeof initialKey]> | undefined;
        let move: Move<typeof currentKey> | undefined;

        if (initialKey !== currentKey) move = { type: "move", key: currentKey };

        const valueDiff = this.getDiff(initial[initialKey], current[currentKey]);

        if (valueDiff) edit = { type: "edit", value: valueDiff };

        if (edit && move) {
          const editAndMove: EditAndMove<TRecord[typeof initialKey], typeof currentKey> = {
            type: "edit+move",
            key: move.key,
            value: edit.value,
          };

          includeRecordChange(diff, initialKey, editAndMove as RecordFieldChange<TRecord, typeof initialKey>);
        } else if (edit) includeRecordChange(diff, initialKey, edit as RecordFieldChange<TRecord, typeof initialKey>);
        else if (move) includeRecordChange(diff, initialKey, move as RecordFieldChange<TRecord, typeof initialKey>);
      }
    });

    currentLookup.forEach((currentKey, id) => {
      if (!initialLookup.has(id)) {
        const add: Add<TRecord[typeof currentKey]> = {
          type: "add",
          value: current[currentKey],
        };

        includeRecordChange(diff, currentKey, add as RecordFieldChange<TRecord, typeof currentKey>);
      }
    });
  }

  private getNonRecordFieldsChanges<TRecord extends Record<RecordKey, unknown>>(
    keys: (keyof TRecord)[],
    initial: TRecord,
    current: TRecord,
    diff: RecordDiff<TRecord>
  ) {
    keys.forEach((key) => {
      const initialValue = initial[key];
      const currentValue = current[key];

      if (initialValue === currentValue || (initialValue == null && currentValue == null)) return;

      if (initialValue != null) {
        if (currentValue == null) {
          if (isValueType(initialValue)) {
            const assign: Assign<TRecord[typeof key]> = {
              type: "assign",
              value: current[key],
            };

            includeRecordChange(diff, key, assign as RecordFieldChange<TRecord, keyof TRecord>);
          } else if (Array.isArray(initialValue)) {
            const remove: Remove<TRecord[typeof key]> = {
              type: "remove",
              value: initialValue,
            };

            includeRecordChange(diff, key, remove as RecordFieldChange<TRecord, typeof key>);
          }
        } else {
          if (isValueType(initialValue)) {
            const assign: Assign<TRecord[typeof key]> = {
              type: "assign",
              value: currentValue,
            };

            includeRecordChange(diff, key, assign as RecordFieldChange<TRecord, typeof key>);
          } else if (Array.isArray(initialValue)) {
            const valueDiff = this.getDiff(initialValue, currentValue);

            if (valueDiff) {
              const edit: Edit<TRecord[typeof key]> = {
                type: "edit",
                value: valueDiff,
              };

              includeRecordChange(diff, key, edit as RecordFieldChange<TRecord, typeof key>);
            }
          }
        }
      } else if (currentValue != null) {
        if (isValueType(currentValue)) {
          const assign: Assign<TRecord[typeof key]> = {
            type: "assign",
            value: currentValue,
          };

          includeRecordChange(diff, key, assign as RecordFieldChange<TRecord, typeof key>);
        } else if (Array.isArray(currentValue)) {
          const add: Add<TRecord[typeof key]> = {
            type: "add",
            value: currentValue,
          };

          includeRecordChange(diff, key, add as RecordFieldChange<TRecord, typeof key>);
        }
      }
    });
  }

  private getArraysDiff<TRecord extends Record<RecordKey, unknown>>(
    initial: TRecord[],
    current: TRecord[]
  ): ArrayDiff<TRecord> | undefined {
    if (initial === current) return undefined;

    const initialLookup = new Map<ID, number>();
    const currentLookup = new Map<ID, number>();

    initial.forEach((value, index) => {
      const id = this.options.getId(value);

      if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
      if (initialLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

      initialLookup.set(id, index);
    });

    current.forEach((value, index) => {
      const id = this.options.getId(value);

      if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
      if (currentLookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

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

function includeArrayChange<TRecord extends Record<RecordKey, unknown>>(
  diff: ArrayDiff<TRecord>,
  index: number,
  change: ArrayItemChange<TRecord>
) {
  let changeSet = diff.get(index);

  if (changeSet == null) diff.set(index, (changeSet = []));

  changeSet.push(change);
}

function includeRecordChange<TRecord extends Record<RecordKey, unknown>>(
  diff: RecordDiff<TRecord>,
  key: keyof TRecord,
  change: RecordFieldChange<TRecord, typeof key>
) {
  let changeSet = diff[key];

  if (changeSet == null) diff[key] = changeSet = [];

  if (!changeSet.find((e) => e.type === change.type)) changeSet.push(change);
}

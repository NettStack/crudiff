import { isValueType } from "@/utilities/reflection";
import { Key, Uid } from "@/utilities/types";
import {
  Add,
  AddAll,
  Assign,
  Changes,
  Edit,
  EntityChanges,
  EntityChangesRecord,
  FieldChanges,
  FieldChangesRecord,
  Move,
  Remove,
  RemoveAll,
} from "./types";

export interface ExecutionOptions {
  getId(value: unknown): Uid;
  getKeys(value: unknown): string[];
}

export default class Executor {
  getChanges<TValue>(initial: TValue, current: TValue): Changes<TValue> | undefined {
    if (isValueType(initial) || isValueType(current)) throw new Error("Value types not allowed.");

    if (Array.isArray(initial) && Array.isArray(current))
      return this.getArrayChanges(initial, current) as Changes<TValue> | undefined;

    return this.getEntityChanges(
      initial as { [TKey in keyof TValue]: TValue[TKey] },
      current as { [TKey in keyof TValue]: TValue[TKey] }
    ) as Changes<TValue> | undefined;
  }

  private getEntityChanges<TRecord extends Record<Key, unknown>>(
    initial: TRecord,
    current: TRecord
  ): FieldChangesRecord<TRecord> | undefined {
    if (initial === current) return undefined;

    const keys: (keyof TRecord)[] = this.options.getKeys(initial);

    if (!keys.length) throw new Error(`Keys not returned for: ${JSON.stringify(initial)}.`);

    const fieldChangesRecord: FieldChangesRecord<TRecord> = {};

    this.getEntityTypedFieldsChanges<TRecord>(keys, initial, current, fieldChangesRecord);
    this.getNonEntityTypedFieldsChanges<TRecord>(keys, initial, current, fieldChangesRecord);

    return Object.keys(fieldChangesRecord).length ? fieldChangesRecord : undefined;
  }

  private getEntityTypedFieldsChanges<TRecord extends Record<Key, unknown>>(
    keys: (keyof TRecord)[],
    initial: TRecord,
    current: TRecord,
    fieldChangesRecord: FieldChangesRecord<TRecord>
  ) {
    const initialLookup = new Map<Uid, keyof TRecord>();
    const currentLookup = new Map<Uid, keyof TRecord>();

    keys.forEach((key) => {
      let value: TRecord[typeof key];

      value = initial[key];

      if (!(isValueType(value) || Array.isArray(value))) {
        const id = this.options.getId(value);

        if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
        if (initialLookup.has(id))
          throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

        initialLookup.set(id, key);
      }

      value = current[key];

      if (!(isValueType(value) || Array.isArray(value))) {
        const id = this.options.getId(value);

        if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
        if (currentLookup.has(id))
          throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

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

        includeFieldChanges(fieldChangesRecord, initialKey, [remove] as FieldChanges<
          TRecord[typeof initialKey],
          keyof TRecord
        >);
      } else {
        let edit: Edit<TRecord[typeof initialKey]> | undefined;
        let move: Move<typeof currentKey> | undefined;

        if (initialKey !== currentKey) move = { type: "move", key: currentKey };

        const valueFieldChangesRecord = this.getChanges(initial[initialKey], current[currentKey]);

        if (valueFieldChangesRecord) edit = { type: "edit", value: valueFieldChangesRecord };

        if (edit)
          includeFieldChanges(fieldChangesRecord, initialKey, [edit] as FieldChanges<
            TRecord[typeof initialKey],
            keyof TRecord
          >);

        if (move)
          includeFieldChanges(fieldChangesRecord, initialKey, [move] as FieldChanges<
            TRecord[typeof initialKey],
            keyof TRecord
          >);
      }
    });

    currentLookup.forEach((currentKey, id) => {
      if (!initialLookup.has(id)) {
        const add: Add<TRecord[typeof currentKey]> = {
          type: "add",
          value: current[currentKey],
        };

        includeFieldChanges(fieldChangesRecord, currentKey, [add] as FieldChanges<
          TRecord[typeof currentKey],
          keyof TRecord
        >);
      }
    });
  }

  private getNonEntityTypedFieldsChanges<TRecord extends Record<Key, unknown>>(
    keys: (keyof TRecord)[],
    initial: TRecord,
    current: TRecord,
    fieldChangesRecord: FieldChangesRecord<TRecord>
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

            includeFieldChanges(
              fieldChangesRecord,
              key,
              assign as FieldChanges<TRecord[typeof key], keyof TRecord>
            );
          } else if (Array.isArray(initialValue)) {
            const remove: RemoveAll<TRecord[typeof key]> = {
              type: "remove*",
              value: initialValue,
            };

            includeFieldChanges(fieldChangesRecord, key, remove as FieldChanges<[], typeof key>);
          }
        } else {
          if (isValueType(initialValue)) {
            const assign: Assign<TRecord[typeof key]> = {
              type: "assign",
              value: currentValue,
            };

            includeFieldChanges(
              fieldChangesRecord,
              key,
              assign as FieldChanges<TRecord[typeof key], typeof key>
            );
          } else if (Array.isArray(initialValue)) {
            const valueEntityChangesRecord = this.getChanges(initialValue, currentValue);

            if (valueEntityChangesRecord) {
              const edit: Edit<TRecord[typeof key]> = {
                type: "edit",
                value: valueEntityChangesRecord,
              };

              includeFieldChanges(fieldChangesRecord, key, edit as FieldChanges<[], typeof key>);
            }
          }
        }
      } else if (currentValue != null) {
        if (isValueType(currentValue)) {
          const assign: Assign<TRecord[typeof key]> = {
            type: "assign",
            value: currentValue,
          };

          includeFieldChanges(
            fieldChangesRecord,
            key,
            assign as FieldChanges<TRecord[typeof key], typeof key>
          );
        } else if (Array.isArray(currentValue)) {
          const add: AddAll<TRecord[typeof key]> = {
            type: "add*",
            value: currentValue,
          };

          includeFieldChanges(fieldChangesRecord, key, add as FieldChanges<[], typeof key>);
        }
      }
    });
  }

  private getArrayChanges<TItem extends Record<Key, unknown>>(
    initial: TItem[],
    current: TItem[]
  ): EntityChangesRecord<TItem, number> | undefined {
    if (initial === current) return undefined;

    const initialLookup = new Map<Uid, number>();
    const currentLookup = new Map<Uid, number>();

    initial.forEach((value, index) => {
      const id = this.options.getId(value);

      if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
      if (initialLookup.has(id))
        throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

      initialLookup.set(id, index);
    });

    current.forEach((value, index) => {
      const id = this.options.getId(value);

      if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
      if (currentLookup.has(id))
        throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

      currentLookup.set(id, index);
    });

    const entityChangesRecord: EntityChangesRecord<TItem, number> = {};

    initialLookup.forEach((initialIndex, id) => {
      const currentIndex = currentLookup.get(id);

      if (currentIndex == null) {
        includeItemChanges(entityChangesRecord, initialIndex, {
          type: "remove",
          value: initial[initialIndex],
        });
      } else {
        let edit: Edit<TItem> | undefined;
        let move: Move<number> | undefined;

        if (initialIndex !== currentIndex) move = { type: "move", key: currentIndex };

        const value = this.getChanges(initial[initialIndex], current[currentIndex]);

        if (value) edit = { type: "edit", value };

        if (edit) includeItemChanges(entityChangesRecord, initialIndex, edit);
        if (move) includeItemChanges(entityChangesRecord, initialIndex, move);
      }
    });

    currentLookup.forEach((currentIndex, id) => {
      if (!initialLookup.has(id))
        includeItemChanges(entityChangesRecord, currentIndex, {
          type: "add",
          value: current[currentIndex],
        });
    });

    return Object.keys(entityChangesRecord).length ? entityChangesRecord : undefined;
  }

  constructor(readonly options: ExecutionOptions) {}
}

function includeItemChanges<TRecord extends Record<Key, unknown>>(
  record: EntityChangesRecord<TRecord, number>,
  index: number,
  changes: EntityChanges<TRecord, number>
) {
  let changesArray = record[index];

  if (changesArray == null) record[index] = changesArray = [];

  changesArray.push(changes);
}

function includeFieldChanges<TRecord extends Record<TKey, unknown>, TKey extends keyof TRecord>(
  record: FieldChangesRecord<TRecord>,
  key: TKey,
  changes: FieldChanges<TRecord[TKey], TKey>
) {
  if (Array.isArray(changes)) {
    let changesArray = record[key];

    if (isEntityChangesArray(changesArray)) changesArray.push(...changes);
    else record[key] = changes;
  } else {
    record[key] = changes;
  }
}

function isEntityChangesArray<TValue extends Record<Key, unknown>, TKey extends Key>(
  changes: unknown
): changes is EntityChanges<TValue, TKey>[] {
  return changes != null && Array.isArray(changes);
}

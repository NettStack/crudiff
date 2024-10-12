import { Key, Uid } from "@/core/models";
import { isValueType } from "@/core/reflection";
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
} from "./models";

export interface PostProcessingOptions {
  getId(value: unknown): Uid;
  getKeys(value: unknown): string[];
}

export default class PostProcessor {
  getChanges<TValue>(initial: TValue, current: TValue): Changes<TValue> | undefined {
    if (isValueType(initial) || isValueType(current)) throw new Error("Value types not allowed.");

    if (Array.isArray(initial) && Array.isArray(current))
      return this.getArrayChanges(initial, current) as Changes<TValue> | undefined;

    return this.getEntityChanges(
      initial as { [TKey in keyof TValue]: TValue[TKey] },
      current as { [TKey in keyof TValue]: TValue[TKey] }
    ) as Changes<TValue> | undefined;
  }

  private getEntityChanges<TEntity extends Record<Key, unknown>>(
    initial: TEntity,
    current: TEntity
  ): FieldChangesRecord<TEntity> | undefined {
    if (initial === current) return undefined;

    const keys: (keyof TEntity)[] = this.options.getKeys(initial);

    if (!keys.length) throw new Error(`Keys not returned for: ${JSON.stringify(initial)}.`);

    const fieldChangesRecord: FieldChangesRecord<TEntity> = {};

    this.getEntityFieldsChanges<TEntity>(keys, initial, current, fieldChangesRecord);
    this.getValueTypeAndArrayFieldsChanges<TEntity>(keys, initial, current, fieldChangesRecord);

    return Object.keys(fieldChangesRecord).length ? fieldChangesRecord : undefined;
  }

  private getEntityFieldsChanges<TEntity extends Record<Key, unknown>>(
    keys: (keyof TEntity)[],
    initial: TEntity,
    current: TEntity,
    fieldChangesRecord: FieldChangesRecord<TEntity>
  ) {
    const initialLookup = new Map<Uid, keyof TEntity>();
    const currentLookup = new Map<Uid, keyof TEntity>();
    const entityAndLookupPairs: [TEntity, Map<Uid, keyof TEntity>][] = [
      [initial, initialLookup],
      [current, currentLookup],
    ];

    keys.forEach((key) => {
      entityAndLookupPairs.forEach(([entity, lookup]) => {
        const value = entity[key];

        if (!(isValueType(value) || Array.isArray(value)))
          includeLookupEntry(lookup, this.options, [key, value]);
      });
    });

    initialLookup.forEach((initialKey, id) => {
      const currentKey = currentLookup.get(id);

      if (currentKey == null) {
        const remove: Remove<TEntity[typeof initialKey]> = {
          type: "remove",
          value: initial[initialKey],
        };

        includeFieldChanges(fieldChangesRecord, initialKey, [remove] as FieldChanges<
          TEntity[typeof initialKey],
          keyof TEntity
        >);
      } else {
        let edit: Edit<TEntity[typeof initialKey]> | undefined;
        let move: Move<typeof currentKey> | undefined;

        if (initialKey !== currentKey) move = { type: "move", key: currentKey };

        const valueFieldChangesRecord = this.getChanges(initial[initialKey], current[currentKey]);

        if (valueFieldChangesRecord) edit = { type: "edit", value: valueFieldChangesRecord };

        if (edit)
          includeFieldChanges(fieldChangesRecord, initialKey, [edit] as FieldChanges<
            TEntity[typeof initialKey],
            keyof TEntity
          >);

        if (move)
          includeFieldChanges(fieldChangesRecord, initialKey, [move] as FieldChanges<
            TEntity[typeof initialKey],
            keyof TEntity
          >);
      }
    });

    currentLookup.forEach((currentKey, id) => {
      if (!initialLookup.has(id)) {
        const add: Add<TEntity[typeof currentKey]> = {
          type: "add",
          value: current[currentKey],
        };

        includeFieldChanges(fieldChangesRecord, currentKey, [add] as FieldChanges<
          TEntity[typeof currentKey],
          keyof TEntity
        >);
      }
    });
  }

  private getValueTypeAndArrayFieldsChanges<TEntity extends Record<Key, unknown>>(
    keys: (keyof TEntity)[],
    initial: TEntity,
    current: TEntity,
    fieldChangesRecord: FieldChangesRecord<TEntity>
  ) {
    keys.forEach((key) => {
      const initialValue = initial[key];
      const currentValue = current[key];

      if (initialValue === currentValue) return;

      if (initialValue == null) {
        if (currentValue == null) return;

        if (isValueType(currentValue)) {
          const assign: Assign<TEntity[typeof key]> = {
            type: "assign",
            value: currentValue,
          };

          includeFieldChanges(
            fieldChangesRecord,
            key,
            assign as FieldChanges<TEntity[typeof key], typeof key>
          );
        } else if (Array.isArray(currentValue)) {
          const add: AddAll<TEntity[typeof key]> = {
            type: "add-all",
            value: currentValue,
          };

          includeFieldChanges(fieldChangesRecord, key, add as FieldChanges<[], typeof key>);
        }
      } else if (currentValue != null) {
        if (isValueType(initialValue)) {
          const assign: Assign<TEntity[typeof key]> = {
            type: "assign",
            value: currentValue,
          };

          includeFieldChanges(
            fieldChangesRecord,
            key,
            assign as FieldChanges<TEntity[typeof key], typeof key>
          );
        } else if (Array.isArray(initialValue)) {
          const valueEntityChangesRecord = this.getChanges(initialValue, currentValue);

          if (valueEntityChangesRecord) {
            const edit: Edit<TEntity[typeof key]> = {
              type: "edit",
              value: valueEntityChangesRecord,
            };

            includeFieldChanges(fieldChangesRecord, key, edit as FieldChanges<[], typeof key>);
          }
        }
      } else {
        if (initialValue == null) return;

        if (isValueType(initialValue)) {
          const assign: Assign<TEntity[typeof key]> = {
            type: "assign",
            value: currentValue,
          };

          includeFieldChanges(
            fieldChangesRecord,
            key,
            assign as FieldChanges<TEntity[typeof key], keyof TEntity>
          );
        } else if (Array.isArray(initialValue)) {
          const remove: RemoveAll<TEntity[typeof key]> = {
            type: "remove-all",
            value: initialValue,
          };

          includeFieldChanges(fieldChangesRecord, key, remove as FieldChanges<[], typeof key>);
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
    const arrayAndLookupPairs: [TItem[], Map<Uid, number>][] = [
      [initial, initialLookup],
      [current, currentLookup],
    ];

    arrayAndLookupPairs.forEach(([array, lookup]) => {
      array.forEach((value, index) => includeLookupEntry(lookup, this.options, [index, value]));
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
        const itemChanges = this.getChanges(initial[initialIndex], current[currentIndex]);

        if (itemChanges)
          includeItemChanges(entityChangesRecord, initialIndex, {
            type: "edit",
            value: itemChanges,
          });

        if (initialIndex !== currentIndex)
          includeItemChanges(entityChangesRecord, initialIndex, {
            type: "move",
            key: currentIndex,
          });
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

  constructor(readonly options: PostProcessingOptions) {}
}

function includeLookupEntry<TEntity, TKey extends Key>(
  lookup: Map<Uid, TKey>,
  options: PostProcessingOptions,
  [key, value]: [TKey, TEntity]
): Map<Uid, TKey> {
  const id = options.getId(value);

  if (id == null) throw new Error(`ID not returned for: ${JSON.stringify(value)}.`);
  if (lookup.has(id)) throw new Error(`ID ${id} duplicated by: ${JSON.stringify(value)}.`);

  lookup.set(id, key);

  return lookup;
}

function includeItemChanges<TEntity extends Record<Key, unknown>>(
  record: EntityChangesRecord<TEntity, number>,
  index: number,
  changes: EntityChanges<TEntity, number>
) {
  let changesArray = record[index];

  if (changesArray == null) record[index] = changesArray = [];

  changesArray.push(changes);
}

function includeFieldChanges<TEntity extends Record<TKey, unknown>, TKey extends keyof TEntity>(
  record: FieldChangesRecord<TEntity>,
  key: TKey,
  changes: FieldChanges<TEntity[TKey], TKey>
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

# Crudiff

A mini JavaScript library designed specifically for comparing JSON objects in a CRUD (Create, Read, Update, Delete) context.
It provides a straightforward way to identify changes between two JSON structures, making it particularly useful in applications
where data synchronization and change tracking are essential.

![branches-badge](./badges/coverage/badge-branches.svg) ![functions-badge](./badges/coverage/badge-functions.svg) ![lines-badge](./badges/coverage/badge-lines.svg) ![statements-badge](./badges/coverage/badge-statements.svg)

#### Key Features

1. **Change Detection**:

    Detect additions, deletions, and modifications between two JSON objects. This is ideal for scenarios where you need to manage data state effectively.

2. **CRUD Operations**:

    Label differences in terms of CRUD operations, allowing developers to easily understand how two versions of a JSON object differ in terms of what has been created, updated, or deleted.

3. **Nested Object Support**:

    Handle nested JSON structures, ensuring that even deeply nested fields are accurately compared and reported.

#### Usage Example

##### Differences between records

```js
import { Executor } from "@nettstack/crudiff/diff";

const typeName = "TestRecord";

const executor = new Executor({
  getId: (value) => value.__id,
  getKeys: (value) =>
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

const initial = {
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

const current = {
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

console.log(JSON.stringify(diff, null, 4));

// Output:
// {
//   record3: [
//     {
//       type: "edit",
//       value: {
//         number1: [
//           {
//             type: "assign",
//             value: 1,
//           },
//         ],
//       },
//     },
//   ],
//   record4: [
//     {
//       type: "move",
//       key: "record5",
//     },
//   ],
//   record5: [
//     {
//       type: "move",
//       key: "record4",
//     },
//   ],
//   record6: [
//     {
//       type: "remove",
//       value: {
//         __id: "record6",
//         __type: "TestRecord",
//       },
//     },
//   ],
//   record7: [
//     {
//       type: "edit+move",
//       key: "record8",
//       value: {
//         number1: [
//           {
//             type: "assign",
//             value: 7,
//           },
//         ],
//       },
//     },
//     {
//       type: "add",
//       value: {
//         __id: "record8",
//         __type: "TestRecord",
//       },
//     },
//   ],
//   record2: [
//     {
//       type: "add",
//       value: {
//         __id: "record1",
//         __type: "TestRecord",
//       },
//     },
//   ],
//   number1: [
//     {
//       type: "assign",
//     },
//   ],
//   number2: [
//     {
//       type: "assign",
//       value: 9,
//     },
//   ],
//   array2: [
//     {
//       type: "add",
//       value: [],
//     },
//   ],
//   array3: [
//     {
//       type: "edit",
//       value: {},
//     },
//   ],
//   array4: [
//     {
//       type: "remove",
//       value: [],
//     },
//   ],
// }
```

##### Differences between arrays

```js
const initial = [
  { __type: typeName, __id: "unchanged", number1: 0 },
  { __type: typeName, __id: "edited", number1: 2 },
  { __type: typeName, __id: "moved", number1: 4 },
  { __type: typeName, __id: "editedAndmoved", number1: 5 },
  { __type: typeName, __id: "removed", number1: 3 },
];

const current = [
  { __type: typeName, __id: "unchanged", number1: 0 },
  { __type: typeName, __id: "edited", number1: 6 },
  { __type: typeName, __id: "editedAndmoved", number1: 7 },
  { __type: typeName, __id: "moved", number1: 4 },
  { __type: typeName, __id: "added", number1: 8 },
];

const diff = executor.getDiff(initial, current); // Returns a map

console.log(JSON.stringify([...Array.from(diff!.entries())], null, 4));

// Output:
// [
//   [
//     1,
//     [
//       {
//         type: "edit",
//         value: {
//           number1: [
//             {
//               type: "assign",
//               value: 6,
//             },
//           ],
//         },
//       },
//     ],
//   ],
//   [
//     2,
//     [
//       {
//         type: "move",
//         key: 3,
//       },
//     ],
//   ],
//   [
//     3,
//     [
//       {
//         type: "edit+move",
//         value: {
//           number1: [
//             {
//               type: "assign",
//               value: 7,
//             },
//           ],
//         },
//         key: 2,
//       },
//     ],
//   ],
//   [
//     4,
//     [
//       {
//         type: "remove",
//         value: {
//           __type: "TestRecord",
//           __id: "removed",
//           number1: 3,
//         },
//       },
//       {
//         type: "add",
//         value: {
//           __type: "TestRecord",
//           __id: "added",
//           number1: 8,
//         },
//       },
//     ],
//   ],
// ];

```

#### Documentation

*Coming soon...*

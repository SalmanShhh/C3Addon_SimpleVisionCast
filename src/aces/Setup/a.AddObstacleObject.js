export const config = {
  listName: "Add obstacle object",
  displayText: "Add {0} as an obstacle object",
  description: "Register an object type for custom object obstacle mode.",
  params: [
    {
      id: "objectType",
      name: "Object",
      desc: "Object type to treat as an obstacle.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (objectType) {
  this._addObstacleObject(objectType);
}
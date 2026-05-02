export const config = {
  listName: "Has obstacle object",
  displayText: "Has obstacle object <b>{0}</b>",
  description: "Check whether an object type is registered as a custom obstacle.",
  params: [
    {
      id: "objectType",
      name: "Object",
      desc: "Object type to test.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (objectType) {
  return this._hasObstacleObject(objectType);
}
export const config = {
  listName: "Remove obstacle object",
  displayText: "Remove <b>{0}</b> from obstacle objects",
  description: "Unregister an object type from custom object obstacle mode.",
  params: [
    {
      id: "objectType",
      name: "Object",
      desc: "Object type to remove.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (objectType) {
  this._removeObstacleObject(objectType);
}
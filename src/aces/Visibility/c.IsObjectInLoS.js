export const config = {
  listName: "Has line of sight to object",
  displayText: "Has line of sight to {0}",
  description: "Check whether any instance of the given object is currently inside the visibility polygon.",
  params: [
    {
      id: "object",
      name: "Object",
      desc: "Object to test.",
      type: "object",
    },
  ],
};

export const expose = true;

export default function (object) {
  if (!object) return false;
  for (const inst of object.instances()) {
    if (this._isObjectInLoS(this._getUID(inst))) return true;
  }
  return false;
}
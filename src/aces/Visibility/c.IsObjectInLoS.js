export const config = {
  listName: "Has line of sight to object",
  displayText: "Has line of sight to object UID {0}",
  description: "Check whether the given UID is currently inside the cached visibility polygon.",
  params: [
    {
      id: "uid",
      name: "UID",
      desc: "UID to test.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (uid) {
  return this._isObjectInLoS(uid);
}
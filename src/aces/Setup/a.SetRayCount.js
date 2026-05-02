export const config = {
  listName: "Set ray count",
  displayText: "Set ray count to <b>{0}</b>",
  description: "Set the number of primary rays cast each update.",
  params: [
    {
      id: "count",
      name: "Ray count",
      desc: "Primary ray count.",
      type: "number",
      initialValue: "64",
    },
  ],
};

export const expose = true;

export default function (count) {
  this._setRayCount(count);
}
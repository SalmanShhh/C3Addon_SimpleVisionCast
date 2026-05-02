export const config = {
  listName: "Set mesh pin origin",
  displayText: "Set mesh pin origin to <b>{0}</b>, <b>{1}</b>",
  description: "Move the mesh fan origin in normalized host space.",
  params: [
    {
      id: "x",
      name: "X",
      desc: "Normalized X coordinate.",
      type: "number",
      initialValue: "0.5",
    },
    {
      id: "y",
      name: "Y",
      desc: "Normalized Y coordinate.",
      type: "number",
      initialValue: "0.5",
    },
  ],
};

export const expose = true;

export default function (x, y) {
  this._setMeshPinOrigin(x, y);
}
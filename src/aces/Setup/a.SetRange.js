export const config = {
  listName: "Set range",
  displayText: "Set range to {0}",
  description: "The maximum distance in pixels that line-of-sight can cover.",
  params: [
    {
      id: "radius",
      name: "Range",
      desc: "Maximum range in pixels.",
      type: "number",
      initialValue: "300",
    },
  ],
};

export const expose = true;

export default function (radius) {
  this._setRange(radius);
}

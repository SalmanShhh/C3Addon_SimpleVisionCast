export const config = {
  listName: "Is point in visibility",
  displayText: "Point {0}, {1} is in visibility",
  description: "Check whether a world-space point is inside the current visibility polygon.",
  params: [
    {
      id: "x",
      name: "X",
      desc: "World X.",
      type: "number",
      initialValue: "0",
    },
    {
      id: "y",
      name: "Y",
      desc: "World Y.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (x, y) {
  return this._isPointInVisibility(x, y);
}
export const config = {
  listName: "Clear obstacle objects",
  displayText: "Clear all obstacle objects",
  description: "Remove every registered custom obstacle object type.",
  params: [],
};

export const expose = true;

export default function () {
  this._clearObstacleObjects();
}
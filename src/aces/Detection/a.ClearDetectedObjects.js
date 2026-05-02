export const config = {
  listName: "Clear detected objects",
  displayText: "Clear detected objects",
  description: "Clear the cached visible set used for enter and exit events.",
  params: [],
};

export const expose = true;

export default function () {
  this._clearDetectedObjects();
}
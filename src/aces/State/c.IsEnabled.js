export const config = {
  listName: "Is enabled",
  displayText: "Is enabled",
  description: "True when the Simple Vision Cast behavior is currently enabled.",
  isTrigger: false,
  isInvertible: true,
  params: [],
};

export const expose = true;

export default function () {
  return this._isEnabled();
}

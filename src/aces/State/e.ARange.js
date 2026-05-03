export const config = {
  returnType: "number",
  description: "The maximum distance in pixels that line-of-sight can cover.",
  params: [],
};

export default function () {
  return this._getActiveRange();
}

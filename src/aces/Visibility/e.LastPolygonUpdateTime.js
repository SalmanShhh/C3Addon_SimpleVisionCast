export const config = {
  returnType: "number",
  description: "Runtime timestamp of the most recent polygon update.",
  params: [],
};

export default function () {
  return this._getLastPolygonUpdateTime();
}
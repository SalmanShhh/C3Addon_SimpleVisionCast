export const config = {
  returnType: "number",
  description: "Number of points in the current visibility polygon.",
  params: [],
};

export default function () {
  return this._countPolyPoints();
}
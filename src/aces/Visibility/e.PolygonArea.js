export const config = {
  returnType: "number",
  description: "Approximate area of the current visibility polygon.",
  params: [],
};

export default function () {
  return this._getPolygonAreaExpression();
}
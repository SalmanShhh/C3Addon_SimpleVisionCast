export const config = {
  returnType: "number",
  description: "Current cone of view in degrees.",
  params: [],
};

export default function () {
  return this._getActiveRayArc();
}
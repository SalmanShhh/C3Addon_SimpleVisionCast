export const config = {
  returnType: "number",
  description: "Current facing angle offset in degrees.",
  params: [],
};

export default function () {
  return this._getActiveFacingAngle();
}
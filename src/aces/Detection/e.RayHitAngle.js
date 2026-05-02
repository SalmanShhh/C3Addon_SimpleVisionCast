export const config = {
  returnType: "number",
  description: "Angle in degrees of the current ray hit.",
  params: [],
};

export default function () {
  return this._getRayHitAngle();
}
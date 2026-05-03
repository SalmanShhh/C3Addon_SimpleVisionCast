export const config = {
  returnType: "number",
  description: "Angle in degrees of the surface normal at the current ray hit point (0-360). Valid inside On ray hit.",
  params: [],
};

export default function () {
  return this._getRayHitNormalAngle();
}

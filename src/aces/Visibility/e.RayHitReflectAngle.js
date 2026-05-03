export const config = {
  returnType: "number",
  description: "Angle in degrees of the reflected ray direction (0-360). Valid inside On ray hit.",
  params: [],
};

export default function () {
  return this._getRayHitReflectAngle();
}

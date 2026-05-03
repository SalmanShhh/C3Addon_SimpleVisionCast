export const config = {
  returnType: "number",
  description: "Y component of the surface normal at the current ray hit point (-1 to 1). Valid inside On ray hit.",
  params: [],
};

export default function () {
  return this._getRayHitNormalY();
}

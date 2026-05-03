export const config = {
  returnType: "number",
  description: "World X of the reflected ray endpoint. Computed from the hit point along the reflected direction for the remaining radius distance. Valid inside On ray hit.",
  params: [],
};

export default function () {
  return this._getRayHitReflectX();
}

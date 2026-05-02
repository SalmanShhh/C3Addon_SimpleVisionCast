export const config = {
  returnType: "number",
  description: "World X of the current ray hit.",
  params: [],
};

export default function () {
  return this._getRayHitX();
}
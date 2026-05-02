export const config = {
  returnType: "number",
  description: "World Y of the current ray hit.",
  params: [],
};

export default function () {
  return this._getRayHitY();
}
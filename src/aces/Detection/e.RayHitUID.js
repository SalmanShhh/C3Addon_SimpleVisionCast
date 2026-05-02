export const config = {
  returnType: "number",
  description: "UID of the obstacle hit by the current ray.",
  params: [],
};

export default function () {
  return this._getRayHitUID();
}
export const config = {
  returnType: "number",
  description: "Number of registered custom obstacle object types.",
  params: [],
};

export default function () {
  return this._countObstacleObjects();
}
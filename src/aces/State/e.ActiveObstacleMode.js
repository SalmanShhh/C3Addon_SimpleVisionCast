export const config = {
  returnType: "string",
  description: "Current obstacle mode key.",
  params: [],
};

export default function () {
  return this._getActiveObstacleMode();
}
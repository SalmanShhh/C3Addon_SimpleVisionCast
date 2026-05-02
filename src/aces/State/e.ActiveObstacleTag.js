export const config = {
  returnType: "string",
  description: "Current primary obstacle tag, or an empty string outside tag mode.",
  params: [],
};

export default function () {
  return this._getActiveObstacleTag();
}
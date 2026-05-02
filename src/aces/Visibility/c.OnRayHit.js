export const config = {
  listName: "On ray hit",
  displayText: "On ray hit {0}",
  description: "Triggered for each primary ray that hits an obstacle.",
  isTrigger: true,
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Optional tag filter in tag obstacle mode.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (tag) {
  if (this._getActiveObstacleMode() !== "tag") {
    return true;
  }

  if (!tag) {
    return true;
  }

  return this._instanceHasTag(this._currentRayHit.instance, tag);
}
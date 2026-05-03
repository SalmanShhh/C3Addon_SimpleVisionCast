export const config = {
  listName: "Set obstacle tag",
  displayText: "Set obstacle tag to {0}",
  description: "Set active obstacle tags in tag mode. Use commas to provide multiple tags.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Obstacle tag or comma-separated tags.",
      type: "string",
      initialValue: '"wall"',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._setObstacleTag(tag);
}
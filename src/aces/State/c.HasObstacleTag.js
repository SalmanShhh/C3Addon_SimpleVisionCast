export const config = {
  listName: "Has obstacle tag",
  displayText: "Has obstacle tag <b>{0}</b>",
  description: "Check whether a tag is in the active obstacle tag set.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Obstacle tag to check.",
      type: "string",
      initialValue: '"wall"',
    },
  ],
};

export const expose = true;

export default function (tag) {
  return this._hasObstacleTag(tag);
}
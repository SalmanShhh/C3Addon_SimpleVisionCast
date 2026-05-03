export const config = {
  listName: "Remove obstacle tag",
  displayText: "Remove obstacle tag {0}",
  description: "Remove a tag from the active obstacle tag set.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Tag to remove.",
      type: "string",
      initialValue: '"wall"',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._removeObstacleTag(tag);
}
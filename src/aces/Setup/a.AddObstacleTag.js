export const config = {
  listName: "Add obstacle tag",
  displayText: "Add obstacle tag {0}",
  description: "Add obstacle tags in tag mode. Use commas to add multiple tags.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Tag or comma-separated tags to add.",
      type: "string",
      initialValue: '"wall"',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._addObstacleTag(tag);
}
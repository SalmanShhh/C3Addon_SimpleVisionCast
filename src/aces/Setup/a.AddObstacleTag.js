export const config = {
  listName: "Add obstacle tag",
  displayText: "Add obstacle tag <b>{0}</b>",
  description: "Add a secondary obstacle tag in tag mode.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Tag to add.",
      type: "string",
      initialValue: '"wall"',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._addObstacleTag(tag);
}
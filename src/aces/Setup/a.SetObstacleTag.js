export const config = {
  listName: "Set obstacle tag",
  displayText: "Set obstacle tag to {0}",
  description: "Replace the primary obstacle tag used in tag mode.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Primary obstacle tag.",
      type: "string",
      initialValue: '"wall"',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._setObstacleTag(tag);
}
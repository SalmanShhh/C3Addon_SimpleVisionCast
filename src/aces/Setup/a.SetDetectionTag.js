export const config = {
  listName: "Set detection tag",
  displayText: "Set detection tag to <b>{0}</b>",
  description: "Choose which tagged instances fire LoS enter and exit events.",
  params: [
    {
      id: "tag",
      name: "Tag",
      desc: "Detection tag.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (tag) {
  this._setDetectionTag(tag);
}
export const config = {
  listName: "Set cull mode",
  displayText: "Set cull mode to <b>{0}</b>",
  description: "Choose whether obstacle candidates are AABB-culled by radius.",
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "Cull mode.",
      type: "combo",
      initialValue: "radius_aabb",
      items: [{ radius_aabb: "Radius AABB" }, { none: "None" }],
    },
  ],
};

export const expose = true;

export default function (mode) {
  this._setCullMode(mode);
}
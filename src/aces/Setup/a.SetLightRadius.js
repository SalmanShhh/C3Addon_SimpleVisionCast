export const config = {
  listName: "Set range",
  displayText: "Set line of sight range to <b>{0}</b>",
  description: "Set the maximum ray distance in pixels.",
  params: [
    {
      id: "radius",
      name: "Range",
      desc: "Maximum visibility radius.",
      type: "number",
      initialValue: "300",
    },
  ],
};

export const expose = true;

export default function (radius) {
  this._setLightRadius(radius);
}
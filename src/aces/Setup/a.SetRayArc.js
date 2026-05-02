export const config = {
  listName: "Set cone of view",
  displayText: "Set cone of view to <b>{0}</b> degrees",
  description: "Set the angular sweep of the visibility cone.",
  params: [
    {
      id: "arc",
      name: "Cone of view",
      desc: "Arc in degrees.",
      type: "number",
      initialValue: "360",
    },
  ],
};

export const expose = true;

export default function (arc) {
  this._setRayArc(arc);
}
export const config = {
  listName: "Set cone of view",
  displayText: "Set cone of view to {0} degrees",
  description: "The angle range in degrees relative to the object angle that line-of-sight can cover.",
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
  this._setConeOfView(arc);
}

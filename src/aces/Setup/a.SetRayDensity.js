export const config = {
  listName: "Set ray density",
  displayText: "Set ray density to {0}%",
  description: "Set the ray density as a percentage (1-100). 100% = 1 ray per degree of cone angle. Recalculates on next tick.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "density",
      name: "Density",
      desc: "Ray density percentage (1-100)",
      type: "number",
      initialValue: "50",
    },
  ],
};

export const expose = true;

export default function (density) {
  this._setRayDensity(density);
}

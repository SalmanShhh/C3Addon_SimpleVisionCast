export const config = {
  listName: "Set mesh stagger mode",
  displayText: "Set mesh stagger mode to {0}",
  description:
    "Switch the mesh stagger strategy. 'Stable' writes the mesh only on the scheduled interval frame. 'Hybrid' also writes whenever the vision polygon refreshes mid-interval.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "Stagger strategy. 'Stable' = mesh updates only on scheduled interval frames. 'Hybrid' = also update when vision polygon refreshes mid-interval.",
      type: "combo",
      initialValue: "stable",
      items: [
        { stable: "Stable" },
        { hybrid: "Hybrid" },
      ],
    },
  ],
};

export const expose = true;

export default function (mode) {
  this._setMeshStaggerMode(mode);
}

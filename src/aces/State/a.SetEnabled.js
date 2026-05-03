export const config = {
  listName: "Set enabled",
  displayText: "Set enabled to {0}",
  description: "Enable or disable the Simple Vision Cast behavior. When disabled, raycasting and mesh updates are paused.",
  params: [
    {
      id: "enabled",
      name: "Enabled",
      desc: "Whether to enable the behavior.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = true;

export default function (enabled) {
  this._setEnabled(enabled);
}

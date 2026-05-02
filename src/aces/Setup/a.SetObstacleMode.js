export const config = {
  listName: "Set obstacle mode",
  displayText: "Set obstacle mode to <b>{0}</b>",
  description: "Switch how obstacle candidates are collected.",
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "Obstacle collection mode.",
      type: "combo",
      initialValue: "solid_behaviour",
      items: [
        { solid_behaviour: "Solid behaviour" },
        { custom_objects: "Custom objects" },
        { tag: "Tag" },
      ],
    },
  ],
};

export const expose = true;

export default function (mode) {
  this._setObstacleMode(mode);
}
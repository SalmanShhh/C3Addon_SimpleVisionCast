export const config = {
  listName: "Is obstacle mode active",
  displayText: "Obstacle mode is {0}",
  description: "Check whether a given obstacle mode is currently active.",
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "Obstacle mode to test.",
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
  return this._isObstacleModeActive(mode);
}
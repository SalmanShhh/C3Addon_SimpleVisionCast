export const config = {
  listName: "Set mesh update interval",
  displayText: "Set mesh update interval to {0} frame(s)",
  description:
    "Set how many frames to skip between mesh writes. 1 = every frame. Higher values reduce GPU overhead when many instances share a scene.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "interval",
      name: "Interval",
      desc: "Frames between mesh writes (1 = every frame, 2+ = skip frames)",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (interval) {
  this._setMeshUpdateInterval(interval);
}

export const config = {
  listName: "Set mesh update interval",
  displayText: "Set mesh update interval to {0} frame(s)",
  description:
    "Set how many frames to skip between mesh writes. 0 = every frame, 1 = skip 1 frame, 2 = skip 2 frames.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "interval",
      name: "Interval",
      desc: "Frames to skip between mesh writes (0 = every frame)",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (interval) {
  this._setMeshUpdateInterval(interval);
}

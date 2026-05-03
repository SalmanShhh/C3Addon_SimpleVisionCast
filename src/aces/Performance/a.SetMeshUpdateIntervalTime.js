export const config = {
  listName: "Set mesh update interval (time)",
  displayText: "Set mesh update interval to {0} second(s)",
  description:
    "Set a time-based interval (in seconds) between mesh writes. Overrides the frame-based interval while active. Set to 0 to revert to frame-based mode.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "seconds",
      name: "Seconds",
      desc: "Seconds between mesh writes. 0 = revert to frame-based mode.",
      type: "number",
      initialValue: "0.1",
    },
  ],
};

export const expose = true;

export default function (seconds) {
  this._setMeshUpdateIntervalTime(seconds);
}

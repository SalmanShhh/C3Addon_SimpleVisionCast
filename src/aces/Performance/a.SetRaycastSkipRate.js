export const config = {
  listName: "Set raycast skip rate",
  displayText: "Rebuild vision every {0} frame(s)",
  description:
    "Rebuild the visibility polygon only once every N frames, regardless of stagger mode. 0 or 1 disables skipping (existing stagger rules apply). 2+ skips N−1 frames between rebuilds. Useful for background or off-screen emitters.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "rate",
      name: "Rate",
      desc: "Frames per vision rebuild (0 or 1 = no skip, 2+ = skip N-1 frames)",
      type: "number",
      initialValue: "1",
    },
  ],
};

export const expose = true;

export default function (rate) {
  this._setRaycastSkipRate(rate);
}

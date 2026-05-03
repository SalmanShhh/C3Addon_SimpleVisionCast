export const config = {
  listName: "On raycast budget exceeded",
  displayText: "On raycast took longer than {0} ms",
  description:
    "Triggered after every vision rebuild in which the raycast took longer than the given threshold. Use LastRaycastMs to read the exact duration. Pair with SetRayDensity or SetRaycastSkipRate to reduce cost adaptively.",
  isTrigger: true,
  params: [
    {
      id: "budgetMs",
      name: "Budget (ms)",
      desc: "Threshold in milliseconds. Fires when the last raycast exceeded this value.",
      type: "number",
      initialValue: "2",
    },
  ],
};

export const expose = true;

export default function (budgetMs) {
  return this._lastRaycastMs > budgetMs;
}

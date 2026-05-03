export const config = {
  returnType: "number",
  description:
    "Time in milliseconds spent rebuilding the visibility polygon on the most recent update. Use with On raycast budget exceeded or poll each tick to drive adaptive quality.",
  params: [],
};

export default function () {
  return this._lastRaycastMs;
}

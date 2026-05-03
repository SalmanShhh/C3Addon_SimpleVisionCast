export const config = {
  returnType: "number",
  description:
    "Current time-based mesh write interval in seconds. Returns 0 when frame-based mode is active.",
  params: [],
};

export default function () {
  return this._meshUpdateIntervalTime;
}

export const config = {
  returnType: "number",
  description: "Current raycast skip rate — frames between vision rebuilds (0 or 1 = no skip).",
  params: [],
};

export default function () {
  return this._raycastSkipRate;
}

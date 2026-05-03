export const config = {
  returnType: "number",
  description: "Current mesh write interval in frames.",
  params: [],
};

export default function () {
  return this._meshUpdateInterval;
}

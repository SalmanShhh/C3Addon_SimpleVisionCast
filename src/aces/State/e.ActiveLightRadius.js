export const config = {
  returnType: "number",
  description: "Current line-of-sight range in pixels.",
  params: [],
};

export default function () {
  return this._getActiveLightRadius();
}
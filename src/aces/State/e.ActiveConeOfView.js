export const config = {
  returnType: "number",
  description: "The angle range in degrees relative to the object angle that line-of-sight can cover.",
  params: [],
};

export default function () {
  return this._getActiveConeOfView();
}

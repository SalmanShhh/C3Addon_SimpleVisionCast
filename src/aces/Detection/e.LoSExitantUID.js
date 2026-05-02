export const config = {
  returnType: "number",
  description: "UID of the object that just left line of sight.",
  params: [],
};

export default function () {
  return this._getLoSExitantUID();
}
export const config = {
  returnType: "number",
  description: "Number of currently visible detection-tagged objects.",
  params: [],
};

export default function () {
  return this._countVisibleObjects();
}
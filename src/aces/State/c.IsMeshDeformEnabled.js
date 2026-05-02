export const config = {
  listName: "Is mesh deform enabled",
  displayText: "Is mesh deform enabled",
  description: "True when polygon data is currently written to the host mesh.",
  params: [],
};

export const expose = true;

export default function () {
  return this._isMeshDeformEnabled();
}
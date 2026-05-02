export const config = {
  listName: "Enable mesh deform",
  displayText: "Enable mesh deform",
  description: "Resume writing the visibility polygon to the host mesh.",
  params: [],
};

export const expose = true;

export default function () {
  this._enableMeshDeform();
}
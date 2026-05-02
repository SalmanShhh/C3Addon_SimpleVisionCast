export const config = {
  listName: "Disable mesh deform",
  displayText: "Disable mesh deform",
  description: "Stop deforming the host mesh until re-enabled.",
  params: [],
};

export const expose = true;

export default function () {
  this._disableMeshDeform();
}
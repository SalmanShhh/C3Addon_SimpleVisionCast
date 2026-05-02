export const config = {
  listName: "Reset mesh",
  displayText: "Reset mesh",
  description: "Restore the mesh to a flat state and disable deformation.",
  params: [],
};

export const expose = true;

export default function () {
  this._resetMesh();
}
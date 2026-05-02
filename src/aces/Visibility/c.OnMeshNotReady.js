export const config = {
  listName: "On mesh not ready",
  displayText: "On mesh not ready",
  description: "Triggered when mesh deformation is enabled but no writable mesh is found.",
  isTrigger: true,
  params: [],
};

export const expose = true;

export default function () {
  return true;
}
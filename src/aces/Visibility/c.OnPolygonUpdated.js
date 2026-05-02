export const config = {
  listName: "On polygon updated",
  displayText: "On polygon updated",
  description: "Triggered after the visibility polygon is recomputed.",
  isTrigger: true,
  params: [],
};

export const expose = true;

export default function () {
  return true;
}
export const config = {
  listName: "On object enter line of sight",
  displayText: "On object enter line of sight",
  description: "Triggered when a detection-tagged object becomes visible.",
  isTrigger: true,
  params: [],
};

export const expose = true;

export default function () {
  return true;
}
export const config = {
  listName: "On object leave line of sight",
  displayText: "On object leave line of sight",
  description: "Triggered when a detection-tagged object is no longer visible.",
  isTrigger: true,
  params: [],
};

export const expose = true;

export default function () {
  return true;
}
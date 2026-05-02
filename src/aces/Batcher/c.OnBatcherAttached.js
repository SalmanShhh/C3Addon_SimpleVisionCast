export const config = {
  listName: "On batcher attached",
  displayText: "On batcher attached",
  description: "Triggered when a LumenBatch instance claims this light.",
  isTrigger: true,
  params: [],
};

export const expose = true;

export default function () {
  return true;
}
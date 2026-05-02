export const config = {
  listName: "On batcher detached",
  displayText: "On batcher detached",
  description: "Triggered when a LumenBatch instance releases this light.",
  isTrigger: true,
  params: [],
};

export const expose = true;

export default function () {
  return true;
}
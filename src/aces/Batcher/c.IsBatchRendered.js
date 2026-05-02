export const config = {
  listName: "Is batch rendered",
  displayText: "Is batch rendered",
  description: "True if a batcher is currently suppressing individual mesh writes.",
  params: [],
};

export const expose = true;

export default function () {
  return this._isBatchRendered();
}
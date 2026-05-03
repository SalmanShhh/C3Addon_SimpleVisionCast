export const config = {
  listName: "Set max obstacle candidates",
  displayText: "Limit obstacle candidates to {0} (0 = unlimited)",
  description:
    "Cap the number of obstacle instances tested each rebuild. Candidates are the first N collected by the active obstacle mode. 0 means unlimited. Reduces raycasting cost in dense scenes at the cost of accuracy.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "count",
      name: "Max candidates",
      desc: "Maximum obstacles to consider (0 = no limit)",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (count) {
  this._setMaxObstacleCandidates(count);
}

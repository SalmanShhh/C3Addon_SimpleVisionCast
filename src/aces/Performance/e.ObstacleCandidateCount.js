export const config = {
  returnType: "number",
  description:
    "Number of obstacle instances that were considered in the most recent vision rebuild. Reflects any active candidate cap.",
  params: [],
};

export default function () {
  return this._obstacleCandidateCount;
}

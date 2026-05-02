export const config = {
  returnType: "number",
  description: "UID hit by a visibility polygon point, or -1 if unobstructed.",
  params: [
    {
      id: "index",
      name: "Index",
      desc: "Polygon point index.",
      type: "number",
    },
  ],
};

export default function (index) {
  return this._getPolyHitUID(index);
}
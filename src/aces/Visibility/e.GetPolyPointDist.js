export const config = {
  returnType: "number",
  description: "Distance from the origin to a visibility polygon point.",
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
  return this._getPolyPointDist(index);
}
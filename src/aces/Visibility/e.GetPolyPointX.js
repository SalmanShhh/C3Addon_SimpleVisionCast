export const config = {
  returnType: "number",
  description: "World X of a visibility polygon point.",
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
  return this._getPolyPointX(index);
}
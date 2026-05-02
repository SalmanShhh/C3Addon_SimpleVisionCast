export const config = {
  returnType: "number",
  description: "UID of a visible object by index.",
  params: [
    {
      id: "index",
      name: "Index",
      desc: "Visible object index.",
      type: "number",
    },
  ],
};

export default function (index) {
  return this._getVisibleObjectUID(index);
}
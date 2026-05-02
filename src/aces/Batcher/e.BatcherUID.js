export const config = {
  returnType: "number",
  description: "UID of the LumenBatch instance currently rendering this light, or -1.",
  params: [],
};

export default function () {
  return this._getBatcherUID();
}
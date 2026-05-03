export const config = {
  returnType: "number",
  description: "Current number of frames skipped between mesh writes (0 = every frame).",
  params: [],
};

export default function () {
  return this._meshUpdateInterval;
}

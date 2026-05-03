export const config = {
  returnType: "string",
  description: "Current mesh stagger mode key: \"stable\" or \"hybrid\".",
  params: [],
};

export default function () {
  return this._meshStaggerMode;
}

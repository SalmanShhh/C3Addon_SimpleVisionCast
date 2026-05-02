export const config = {
  listName: "Set facing angle",
  displayText: "Set facing angle offset to <b>{0}</b>",
  description: "Set the cone angle offset relative to the host object.",
  params: [
    {
      id: "angle",
      name: "Angle",
      desc: "Facing angle offset in degrees.",
      type: "number",
      initialValue: "0",
    },
  ],
};

export const expose = true;

export default function (angle) {
  this._setFacingAngle(angle);
}
export const config = {
  listName: "Force detection sweep",
  displayText: "Force detection sweep",
  description: "Immediately test all detection-tagged objects against the current polygon.",
  params: [],
};

export const expose = true;

export default function () {
  this._forceDetectionSweep();
}
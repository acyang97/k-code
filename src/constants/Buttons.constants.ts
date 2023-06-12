import { Mood } from "../utils/image.utils";

export interface IButton {
  mood: Mood;
  className: string;
  sendToExtensionCommand: string;
  getFromExtensionCommand: string;
}

export const BUTTONS: IButton[] = [
  {
    mood: Mood.HAPPY,
    className: ".add-image-button-happy",
    sendToExtensionCommand: "openFileDialogHappy",
    getFromExtensionCommand: "fileDialogResultHappy",
  },
  {
    mood: Mood.MOODY,
    className: ".add-image-button-moody",
    sendToExtensionCommand: "openFileDialogMoody",
    getFromExtensionCommand: "fileDialogResultMoody",
  },
  {
    mood: Mood.FRUSTRATED,
    className: ".add-image-button-frustrated",
    sendToExtensionCommand: "openFileDialogFrustrated",
    getFromExtensionCommand: "fileDialogResultFrustrated",
  },
];

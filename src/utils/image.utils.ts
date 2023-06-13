import * as vscode from "vscode";

export enum Mood {
  HAPPY = "Happy",
  FRUSTRATED = "Frustrated",
  MOODY = "Moody",
}

export const getEmojiImageFileName = (mood: Mood): string => {
  if (mood === Mood.HAPPY) {
    return "happy-emoji.png";
  } else if (mood === Mood.MOODY) {
    return "moody-emoji.png";
  } else {
    return "frustrated-emoji.png";
  }
};

export async function encodeImageToBase64(
  filePath: string
): Promise<[string, string]> {
  try {
    const arr = filePath.split(".");
    const extension = arr[arr.length - 1];
    const selectedFilePath = filePath.replace("file://", "");
    const fileUri = vscode.Uri.file(selectedFilePath);
    const fileContent = await vscode.workspace.fs.readFile(fileUri);
    const imageBuffer = Buffer.from(fileContent);
    const base64Image = imageBuffer.toString("base64");
    return [base64Image, extension];
  } catch (error) {
    console.error("Error encoding image:", error);
    throw error;
  }
}

export const getMood = (numberOfErrors: number) => {
  let mood = Mood.HAPPY;
  if (numberOfErrors >= 5) {
    mood = Mood.FRUSTRATED;
  } else if (numberOfErrors > 0) {
    mood = Mood.MOODY;
  }
  return mood;
};

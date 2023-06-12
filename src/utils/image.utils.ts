export enum Mood {
  HAPPY,
  FRUSTRATED,
  MOODY,
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

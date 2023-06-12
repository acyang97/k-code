enum Mood {
  HAPPY,
  FRUSTRATED,
  MOODY,
}

export const getEmojiImageIfNoImage = (mood: Mood): string => {
  if (mood === Mood.HAPPY) {
    return "😊";
  } else if (mood === Mood.MOODY) {
    return "😨";
  } else {
    return "🤬";
  }
};

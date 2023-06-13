import { SPOTIFY_SONGS_LIST } from "../constants/spotify.constants";

export const getRandomSongLink = (): string => {
  return SPOTIFY_SONGS_LIST[
    Math.floor(Math.random() * SPOTIFY_SONGS_LIST.length)
  ];
};

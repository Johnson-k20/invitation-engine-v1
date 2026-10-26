import type { Mood } from "./types";

export type MoodConfig = {
  name: string;
  opening: string;
  revealIntro: string;
  closing: string;
  pacing: "slow" | "normal" | "quick";
};

export const moods: Record<Mood, MoodConfig> = {
  cozy: {
    name: "Cozy",
    opening: "I thought you might like this.",
    revealIntro: "",
    closing: "See you soon.",
    pacing: "slow",
  },

  playful: {
    name: "Playful",
    opening: "I have an idea for us.",
    revealIntro: "",
    closing: "This should be fun.",
    pacing: "quick",
  },

  elegant: {
    name: "Elegant",
    opening: "I would like to take you out.",
    revealIntro: "",
    closing: "Until then.",
    pacing: "normal",
  },
};
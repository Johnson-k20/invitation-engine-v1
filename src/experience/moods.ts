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
    opening: "I made something for you.",
    revealIntro: "Okay. Here's the plan.",
    closing: "See you soon.",
    pacing: "slow",
  },

  playful: {
    name: "Playful",
    opening: "Okay, I have a little plan for us.",
    revealIntro: "Here's what I've got in mind.",
    closing: "This should be fun.",
    pacing: "quick",
  },

  elegant: {
    name: "Elegant",
    opening: "I thought I'd make this one a little special.",
    revealIntro: "The plan.",
    closing: "Until then.",
    pacing: "normal",
  },
};
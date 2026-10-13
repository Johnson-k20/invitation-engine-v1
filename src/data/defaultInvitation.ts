import type { Invitation } from "../experience/types";

export const defaultInvitation: Invitation = {
  id: "demo-date-001",

  occasion: "date",

  recipient: {
    name: "Maya",
  },

  question: "Dinner with me?",

  schedule: {
    date: "2026-10-16",
    time: "18:30",
  },

  details: {
    activity: "Sunset walk",
    food: "Pasta",
    wear: "Smart casual",
  },

  destination: {
    name: "Somewhere cozy",
    area: "Karen",
    hint: "A little place I've been wanting to try.",
    mapUrl: "",
    reveal: "after-accept",
  },

  mood: "cozy",

  note: "I figured we could actually slow down for a few hours.",
};
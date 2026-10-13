import type { Invitation } from "./types";
import { buildDateExperience } from "./buildDateExperience";

const minimalInvitation: Invitation = {
  id: "minimal-001",

  occasion: "date",

  recipient: {
    name: "Aisha",
  },

  question: "Coffee with me?",
  
  schedule: {
    date: "2026-10-18",
    time: "15:00",
  },

  details: {},

  destination: {
    name: "Artcaffe",
    area: "Westlands",
    reveal: "before",
  },

  mood: "elegant",
};

const playfulInvitation: Invitation = {
  id: "playful-001",

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
  },

  destination: {
    name: "Somewhere cozy",
    area: "Karen",
    hint: "I've got a little place in mind.",
    reveal: "after-accept",
  },

  mood: "playful",

  note: "No spreadsheets. No plans. Just us.",
};

function printExperience(
  label: string,
  invitation: Invitation
) {
  console.log(`\n\n========== ${label} ==========\n`);

  const experience = buildDateExperience(invitation);

  for (const beat of experience) {
    console.log(`[${beat.type}]`);

    if (beat.content.title) {
      console.log(`Title: ${beat.content.title}`);
    }

    if (beat.content.body) {
      console.log(`Body: ${beat.content.body}`);
    }

    console.log(`Delay: ${beat.delay}ms`);
    console.log("---");
  }
}

printExperience("MINIMAL INVITATION", minimalInvitation);

printExperience("PLAYFUL INVITATION", playfulInvitation);
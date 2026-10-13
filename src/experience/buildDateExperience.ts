import type {
  ExperienceBeat,
  Invitation,
} from "./types.ts";

import { moods } from "./moods.ts";

export function buildDateExperience(
  invitation: Invitation
): ExperienceBeat[] {
  const experience: ExperienceBeat[] = [];
  const mood = moods[invitation.mood];

  // Opening
  experience.push({
    id: "opening",
    type: "opening",
    content: {
      title: invitation.recipient.name,
      body: mood.opening,
    },
    delay: 0,
    hold: 1800,
  });

  // Question
  experience.push({
    id: "ask",
    type: "ask",
    content: {
      title: invitation.question,
    },
    delay: 1000,
    hold: 2500,
  });

  // Schedule
  experience.push({
    id: "schedule",
    type: "schedule",
    content: {
      title: formatDate(invitation.schedule.date),
      body: formatTime(invitation.schedule.time),
    },
    delay: 0,
    hold: 2200,
  });

  // Reveal introduction
  experience.push({
    id: "reveal-intro",
    type: "reveal-intro",
    content: {
      body: mood.revealIntro,
    },
    delay: 0,
    hold: 1800,
  });

  // Activity
  if (invitation.details.activity) {
    experience.push({
      id: "activity",
      type: "activity",
      content: {
        title: invitation.details.activity,
      },
      delay: 500,
      hold: 2200,
    });
  }

  // Food
  if (invitation.details.food) {
    experience.push({
      id: "food",
      type: "food",
      content: {
        body: `Then ${invitation.details.food}.`,
      },
      delay: 700,
      hold: 2200,
    });
  }

  // Destination hint
 if (invitation.destination.hint) {
  experience.push({
    id: "destination-hint",
    type: "destination",
    content: {
      title: "And I know just the place.",
      body: invitation.destination.hint,
    },
    delay: 500,
    hold: 2800,
  });
}

  // Destination revealed immediately
  if (invitation.destination.reveal === "before") {
    experience.push({
      id: "destination",
      type: "destination",
      content: {
        title: invitation.destination.name,
        body: invitation.destination.area,
      },
      delay: 700,
      hold: 3000,
    });
  }

  // Wear
  if (invitation.details.wear) {
    experience.push({
      id: "wear",
      type: "wear",
      content: {
        title: "Wear",
        body: invitation.details.wear,
      },
      delay: 500,
      hold: 2200,
    });
  }

  // Personal note
  if (invitation.note) {
    experience.push({
      id: "note",
      type: "note",
      content: {
        body: invitation.note,
      },
      delay: 900,
      hold: 3000,
    });
  }

  // Closing
  experience.push({
    id: "closing",
    type: "closing",
    content: {
      body: mood.closing,
    },
    delay: 1000,
    hold: 2500,
  });

  return experience;
}

function formatDate(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;

  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`;
}
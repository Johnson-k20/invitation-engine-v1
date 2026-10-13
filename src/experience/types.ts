export type Occasion = "date";

export type Mood = "cozy" | "playful" | "elegant";

export type DestinationReveal = "before" | "after-accept";

export type Invitation = {
  id: string;

  occasion: Occasion;

  recipient: {
    name: string;
  };

  question: string;

  schedule: {
    date: string;
    time: string;
  };

  details: {
    activity?: string;
    food?: string;
    wear?: string;
  };

  destination: {
    name: string;
    area?: string;
    hint?: string;
    mapUrl?: string;
    reveal: DestinationReveal;
  };

  mood: Mood;

  note?: string;
};

export type ExperienceBeatType =
  | "opening"
  | "ask"
  | "schedule"
  | "reveal-intro"
  | "activity"
  | "food"
  | "destination"
  | "wear"
  | "note"
  | "closing";

export type ExperienceBeat = {
  id: string;

  type: ExperienceBeatType;

  content: {
    title?: string;
    body?: string;
  };

  delay: number;

  hold: number;
};

export type CreatorState =
  | "building"
  | "previewing"
  | "published";

export type RecipientState =
  | "opening"
  | "question"
  | "revealing"
  | "complete"
  | "declined";
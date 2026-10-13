import { defaultInvitation } from "../data/defaultInvitation.ts";
import { buildDateExperience } from "./buildDateExperience.ts";

const experience = buildDateExperience(defaultInvitation);

console.log("\n--- GENERATED DATE EXPERIENCE ---\n");

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


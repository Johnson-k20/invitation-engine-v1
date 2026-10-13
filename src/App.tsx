import { useState } from "react";

import { CreatorBuilder } from "./components/creator/CreatorBuilder";
import RecipientExperience from "./components/recipient/RecipientExperience";
import { defaultInvitation } from "./data/defaultInvitation";
import { buildDateExperience } from "./experience/buildDateExperience";
import type { Invitation } from "./experience/types";

type AppMode = "builder" | "preview";

const INVITATION_QUERY = "invite";

function encodeInvitation(invitation: Invitation): string {
  const json = JSON.stringify(invitation);

  const bytes = new TextEncoder().encode(json);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeInvitation(value: string): Invitation | null {
  try {
    const base64 = value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const binary = atob(padded);

    const bytes = Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0)
    );

    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);

    if (!isValidInvitation(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isValidInvitation(
  value: unknown
): value is Invitation {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const invitation = value as Record<string, unknown>;

  if (
    typeof invitation.id !== "string" ||
    typeof invitation.question !== "string" ||
    typeof invitation.mood !== "string"
  ) {
    return false;
  }

  if (
    !["cozy", "playful", "elegant"].includes(
      invitation.mood
    )
  ) {
    return false;
  }

  if (invitation.occasion !== "date") {
    return false;
  }

  const recipient = invitation.recipient;
  const schedule = invitation.schedule;
  const details = invitation.details;
  const destination = invitation.destination;

  if (
    typeof recipient !== "object" ||
    recipient === null ||
    typeof (recipient as Record<string, unknown>).name !== "string"
  ) {
    return false;
  }

  if (
    typeof schedule !== "object" ||
    schedule === null
  ) {
    return false;
  }

  const scheduleData =
    schedule as Record<string, unknown>;

  if (
    typeof scheduleData.date !== "string" ||
    typeof scheduleData.time !== "string"
  ) {
    return false;
  }

  if (
    typeof details !== "object" ||
    details === null
  ) {
    return false;
  }

  if (
    typeof destination !== "object" ||
    destination === null
  ) {
    return false;
  }

  const destinationData =
    destination as Record<string, unknown>;

  if (
    typeof destinationData.name !== "string" ||
    !["before", "after-accept"].includes(
      String(destinationData.reveal)
    )
  ) {
    return false;
  }

  return true;
}

function App() {
  const [invitation, setInvitation] =
    useState<Invitation>(() => {
      const params = new URLSearchParams(
        window.location.search
      );

      const encoded = params.get(INVITATION_QUERY);

      if (!encoded) {
        return defaultInvitation;
      }

      return (
        decodeInvitation(encoded) ?? defaultInvitation
      );
    });

  const [mode, setMode] =
    useState<AppMode>("builder");

  const params = new URLSearchParams(
    window.location.search
  );

  const encodedInvitation = params.get(INVITATION_QUERY);

  const isRecipientLink = Boolean(encodedInvitation);

  const decodedInvitation = encodedInvitation
    ? decodeInvitation(encodedInvitation)
    : null;

  const experience = buildDateExperience(invitation);

  function createInvitationLink(
    invitationToShare: Invitation
  ): string {
    const encoded = encodeInvitation(invitationToShare);

    const url = new URL(window.location.href);

    url.search = "";
    url.hash = "";

    url.searchParams.set(INVITATION_QUERY, encoded);

    return url.toString();
  }

  if (isRecipientLink) {
    if (!decodedInvitation) {
      return (
        <main className="experience-screen">
          <section className="ending-content">
            <h1 className="ending-title">
              This invitation could not be opened.
            </h1>

            <p className="ending-message">
              The link may be incomplete or invalid.
              Ask the person who sent it to create a new one.
            </p>
          </section>
        </main>
      );
    }

    return (
      <RecipientExperience
        invitation={decodedInvitation}
        experience={buildDateExperience(decodedInvitation)}
      />
    );
  }

  if (mode === "preview") {
    return (
      <div className="preview-shell">
        <button
          className="preview-back-button"
          type="button"
          onClick={() => setMode("builder")}
        >
          Back to builder
        </button>

        <RecipientExperience
          invitation={invitation}
          experience={experience}
        />
      </div>
    );
  }

  return (
    <CreatorBuilder
      invitation={invitation}
      onChange={setInvitation}
      onPreview={() => setMode("preview")}
      onCreateLink={createInvitationLink}
    />
  );
}

export default App;
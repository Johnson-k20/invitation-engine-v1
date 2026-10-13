import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  Footprints,
  MapPin,
  Shirt,
  Utensils,
} from "lucide-react";

import type {
  ExperienceBeat,
  Invitation,
} from "../../experience/types.ts";

type Stage =
  | "opening"
  | "question"
  | "revealing"
  | "complete"
  | "declined";

type RecipientExperienceProps = {
  invitation: Invitation;
  experience: ExperienceBeat[];
};

export default function RecipientExperience({
  invitation,
  experience,
}: RecipientExperienceProps) {
  const [stage, setStage] = useState<Stage>("opening");
  const [visibleBeats, setVisibleBeats] = useState(0);

  const opening = experience.find(
    (beat) => beat.type === "opening"
  );

  const ask = experience.find(
    (beat) => beat.type === "ask"
  );

  const schedule = experience.find(
    (beat) => beat.type === "schedule"
  );

  const revealIntro = experience.find(
    (beat) => beat.type === "reveal-intro"
  );

  const closing = experience.find(
    (beat) => beat.type === "closing"
  );

  const revealBeats = useMemo(
    () =>
      experience.filter(
        (beat) =>
          beat.type === "activity" ||
          beat.type === "food" ||
          beat.type === "destination" ||
          beat.type === "wear" ||
          beat.type === "note"
      ),
    [experience]
  );

  const finalRevealBeats = useMemo(() => {
    const orderedTypes: ExperienceBeat["type"][] = [
      "activity",
      "food",
      "destination",
      "wear",
      "note",
    ];

    const ordered = orderedTypes.flatMap((type) =>
      revealBeats.filter((beat) => beat.type === type)
    );

    const hasDestination = ordered.some(
      (beat) => beat.id === "destination"
    );

    if (
      invitation.destination.reveal === "after-accept" &&
      !hasDestination
    ) {
      const destinationBeat: ExperienceBeat = {
        id: "destination",
        type: "destination",
        content: {
          title: invitation.destination.name,
          body: invitation.destination.area,
        },
        delay: 500,
        hold: 2500,
      };

      const noteIndex = ordered.findIndex(
        (beat) => beat.type === "note"
      );

      if (noteIndex >= 0) {
        ordered.splice(noteIndex, 0, destinationBeat);
      } else {
        ordered.push(destinationBeat);
      }
    }

    return ordered;
  }, [revealBeats, invitation.destination]);

  const mapUrl = useMemo(
    () => getMapUrl(invitation),
    [invitation]
  );

  function openQuestion() {
    setStage("question");
  }

  function acceptInvitation() {
    setVisibleBeats(0);
    setStage("revealing");
  }

  function declineInvitation() {
    setStage("declined");
  }

  useEffect(() => {
    if (stage !== "revealing") {
      return;
    }

    // Stop at the end of the plan.
    // Do not automatically show the "See you soon" page.
    if (visibleBeats >= finalRevealBeats.length) {
      return;
    }

    const currentBeat = finalRevealBeats[visibleBeats];

    const delay = currentBeat
      ? getRevealDelay(currentBeat)
      : 1200;

    const timeout = window.setTimeout(() => {
      setVisibleBeats((current) => current + 1);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [stage, visibleBeats, finalRevealBeats]);

  function addToCalendar() {
    const start = parseLocalDateTime(
      invitation.schedule.date,
      invitation.schedule.time
    );

    if (!start) {
      window.alert(
        "The date or time is invalid. Please ask for a corrected invitation."
      );
      return;
    }

    // Use a default duration of two hours.
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const activity =
      invitation.details.activity?.trim() || "";

    const food =
      invitation.details.food?.trim() || "";

    const location = [
      invitation.destination.name,
      invitation.destination.area,
    ]
      .filter(Boolean)
      .join(", ");

    const description = [
      invitation.question,
      activity ? `Activity: ${activity}` : "",
      food ? `Food: ${food}` : "",
      invitation.details.wear
        ? `What to wear: ${invitation.details.wear}`
        : "",
      invitation.note
        ? `A note: ${invitation.note}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Invitation Engine//Invitation//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${escapeICS(invitation.id)}@invitation-engine`,
      `DTSTAMP:${formatUTCDate(new Date())}`,
      `DTSTART:${formatLocalICSDate(start)}`,
      `DTEND:${formatLocalICSDate(end)}`,
      `SUMMARY:${escapeICS(invitation.question)}`,
      `LOCATION:${escapeICS(location)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob(
      [icsContent],
      {
        type: "text/calendar;charset=utf-8",
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "my-invitation.ics";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className={`experience-screen experience-${stage}`}>
      <div className="experience-stage">
        {/* PERSONALIZED OPENING */}
        {stage === "opening" && (
          <section className="opening-content">
            <div className="opening-topline">
              <span className="opening-topline-dot" />
              <span>A LITTLE SOMETHING FOR YOU</span>
              <span className="opening-topline-dot" />
            </div>

            <div className="opening-personal">
              <p className="opening-prelude">
                This is for
              </p>

              <h1 className="opening-name">
                {invitation.recipient.name}
                <span className="opening-name-period">
                  .
                </span>
              </h1>
            </div>

            <div
              className="opening-divider"
              aria-hidden="true"
            >
              <span className="opening-divider-line" />
              <span className="opening-divider-center">
                ✳
              </span>
              <span className="opening-divider-line" />
            </div>

            <div className="opening-message-wrap">
              <p className="opening-message">
                {opening?.content.body ??
                  "I made something for you."}
              </p>

              <p className="opening-subtext">
                Nothing complicated. Just a little moment,
                made with you in mind.
              </p>
            </div>

            <button
              className="experience-button opening-button"
              onClick={openQuestion}
              type="button"
            >
              <span>Open your invitation</span>

              <span
                className="opening-button-arrow"
                aria-hidden="true"
              >
                ↗
              </span>
            </button>

            <p className="opening-footer">
              MADE JUST FOR YOU
            </p>
          </section>
        )}

        {/* INVITATION QUESTION */}
        {stage === "question" && (
          <section className="question-content">
            <div className="question-topline">
              <span className="question-topline-line" />
              <span>A LITTLE QUESTION</span>
              <span className="question-topline-line" />
            </div>

            <div className="question-personal">
              <p className="question-recipient">
                For <span>{invitation.recipient.name}</span>
              </p>

              <h1 className="question-title">
                {ask?.content.title ??
                  invitation.question}
              </h1>

              <div
                className="question-divider"
                aria-hidden="true"
              >
                <span className="question-divider-line" />
                <span className="question-divider-mark">
                  ✳
                </span>
                <span className="question-divider-line" />
              </div>
            </div>

            <div className="question-schedule">
              <span className="question-calendar-icon">
                <CalendarDays
                  size={19}
                  strokeWidth={1.5}
                />
              </span>

              <div className="question-schedule-copy">
                <p className="question-schedule-date">
                  {schedule?.content.title}
                </p>

                <p className="question-schedule-time">
                  {schedule?.content.body}
                </p>
              </div>
            </div>

            <div className="question-actions">
              <button
                className="experience-button question-primary-button"
                onClick={acceptInvitation}
                type="button"
              >
                <span>I'm in</span>

                <span
                  className="question-button-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </button>

              <button
                className="experience-text-button question-secondary-button"
                onClick={declineInvitation}
                type="button"
              >
                Maybe another day
              </button>
            </div>

            <p className="question-footer">
              NO PRESSURE. JUST ASKING.
            </p>
          </section>
        )}

        {/* PROGRESSIVE PLAN REVEAL */}
        {stage === "revealing" && (
          <section className="reveal-screen">
            <header className="reveal-header">
              <h1>{invitation.recipient.name}</h1>

              {revealIntro?.content.body && (
                <p>{revealIntro.content.body}</p>
              )}
            </header>

            <div className="reveal-content">
              {finalRevealBeats
                .slice(0, visibleBeats)
                .map((beat) => (
                  <RevealBeat
                    key={beat.id}
                    beat={beat}
                    mapUrl={mapUrl}
                  />
                ))}
            </div>
            
{visibleBeats >= finalRevealBeats.length && (
  <section className="reveal-continue">
    <div
      className="reveal-ending-ornament"
      aria-hidden="true"
    >
      <span />
      <span className="reveal-ending-star">✳</span>
      <span />
    </div>

    <p className="reveal-ending-eyebrow">
      UNTIL THEN
    </p>

    <p className="reveal-continue-message">
      {closing?.content.body ?? "See you soon."}
    </p>

    <p className="reveal-calendar-caption">
      Keep the date close.
    </p>

    <button
      className="reveal-calendar-button"
      type="button"
      onClick={addToCalendar}
    >
      <span className="reveal-calendar-icon">
        <CalendarDays
          size={19}
          strokeWidth={1.6}
        />
      </span>

      <span className="reveal-calendar-button-copy">
        <span className="reveal-calendar-button-title">
          Add to calendar
        </span>

        <span className="reveal-calendar-button-subtitle">
          Save our plans for later
        </span>
      </span>

      <span
        className="reveal-calendar-arrow"
        aria-hidden="true"
      >
        ↗
      </span>
    </button>

    <p className="reveal-ending-footer">
      MADE JUST FOR YOU
    </p>
  </section>
)}
       
          </section>
        )}

        {/* COMPLETION - RETAINED FOR FUTURE USE */}
        {stage === "complete" && (
          <section className="ending-content">
            <p className="ending-message">
              {closing?.content.body ?? "See you soon."}
            </p>

            <h1 className="ending-title">
              You're in.
            </h1>

            <button
              className="experience-button"
              type="button"
              onClick={addToCalendar}
            >
              <CalendarDays size={18} />
              Add to calendar
            </button>
          </section>
        )}

        {/* DECLINED */}
        {stage === "declined" && (
          <section className="ending-content">
            <p className="ending-message">
              No pressure. Another time.
            </p>

            <button
              className="experience-text-button"
              onClick={() => setStage("opening")}
              type="button"
            >
              Back
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

/* ========================================
   REVEAL CONTENT
======================================== */

function RevealBeat({
  beat,
  mapUrl,
}: {
  beat: ExperienceBeat;
  mapUrl: string;
}) {
  switch (beat.type) {
    case "activity":
      return (
        <article className="reveal-detail">
          <Footprints size={18} strokeWidth={1.6} />
          <p>{beat.content.title}</p>
        </article>
      );

    case "food":
      return (
        <article className="reveal-detail">
          <Utensils size={18} strokeWidth={1.6} />
          <p>{beat.content.body}</p>
        </article>
      );

    case "destination":
      if (beat.id === "destination-hint") {
        return (
          <article className="reveal-destination-hint">
            {beat.content.title && (
              <p>{beat.content.title}</p>
            )}

            {beat.content.body && (
              <p>{beat.content.body}</p>
            )}
          </article>
        );
      }

      return (
        <article className="reveal-destination">
          <MapPin size={19} strokeWidth={1.6} />

          <div className="reveal-destination-copy">
            <h2>{beat.content.title}</h2>

            {beat.content.body && (
              <p>{beat.content.body}</p>
            )}

            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              View location
            </a>
          </div>
        </article>
      );

    case "wear":
      return (
        <article className="reveal-detail reveal-wear">
          <Shirt size={18} strokeWidth={1.6} />

          <p>
            <span>Wear:</span> {beat.content.body}
          </p>
        </article>
      );

    case "note":
      return (
        <article className="reveal-note">
          <p>{beat.content.body}</p>
        </article>
      );

    default:
      return null;
  }
}

function getRevealDelay(
  beat: ExperienceBeat
): number {
  switch (beat.type) {
    case "activity":
      return 1700;

    case "food":
      return 1600;

    case "destination":
      return 2000;

    case "wear":
      return 1600;

    case "note":
      return 3500;

    default:
      return 1400;
  }
}

function getMapUrl(invitation: Invitation): string {
  const suppliedUrl = invitation.destination.mapUrl;

  if (suppliedUrl) {
    try {
      const parsedUrl = new URL(suppliedUrl);

      if (parsedUrl.protocol === "https:") {
        return parsedUrl.toString();
      }
    } catch {
      // Fall back to a Google Maps search.
    }
  }

  const location = [
    invitation.destination.name,
    invitation.destination.area,
  ]
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location
  )}`;
}

function parseLocalDateTime(
  date: string,
  time: string
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [year, month, day] = date
    .split("-")
    .map(Number);

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const result = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0
  );

  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }

  return result;
}

function formatLocalICSDate(date: Date): string {
  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}` +
    `${pad(date.getDate())}` +
    `T${pad(date.getHours())}` +
    `${pad(date.getMinutes())}` +
    `${pad(date.getSeconds())}`
  );
}

function formatUTCDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
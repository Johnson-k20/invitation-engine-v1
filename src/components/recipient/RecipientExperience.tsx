import { useEffect, useMemo, useState } from "react";
import "./RecipientExperience.css";


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
} from "../../experience/types";

import { supabase } from "../../lib/supabase";

type RecipientExperienceProps = {
  invitation: Invitation;
  experience: ExperienceBeat[];
  publicToken?: string;
};

type Stage =
  | "opening"
  | "question"
  | "revealing"
  | "complete"
  | "declined";

type ResponseType = "accepted" | "another_time";

type ResponseResult = {
  success?: boolean;
  error?: string;
};

type Destination = Invitation["destination"];

const REVEAL_ORDER = [
  "activity",
  "food",
  "destination",
  "wear",
  "note",
] as const;

function getRevealDelay(beat: ExperienceBeat): number {
  if (beat.hold > 0) {
    return beat.hold;
  }

  const delays: Record<string, number> = {
    activity: 1700,
    food: 1600,
    destination: 2000,
    wear: 1600,
    note: 3500,
    closing: 2500,
  };

  return delays[beat.type] ?? beat.delay ?? 1400;
}

function getMapUrl(destination: Destination): string | null {
  const suppliedUrl = destination.mapUrl?.trim();

  if (suppliedUrl) {
    try {
      const parsedUrl = new URL(suppliedUrl);

      if (
        parsedUrl.protocol === "https:" ||
        parsedUrl.protocol === "http:"
      ) {
        return parsedUrl.toString();
      }
    } catch {
      // Fall back to a Google Maps search.
    }
  }

  const location = [
    destination.name,
    destination.area,
    destination.hint,
  ]
    .filter(Boolean)
    .join(", ");

  if (!location.trim()) {
    return null;
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(location)
  );
}

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toCalendarDate(
  date: string,
  time: string
): string | null {
  const dateMatch = date.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!dateMatch) {
    return null;
  }

  const timeMatch = time.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (!timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

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

  const validationDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes
  );

  if (
    validationDate.getFullYear() !== year ||
    validationDate.getMonth() !== month - 1 ||
    validationDate.getDate() !== day
  ) {
    return null;
  }

  return (
    `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}` +
    `T${String(hours).padStart(2, "0")}` +
    `${String(minutes).padStart(2, "0")}00`
  );
}

function downloadCalendar(invitation: Invitation): void {
  const date = invitation.schedule.date;
  const time = invitation.schedule.time;

  const start = toCalendarDate(date, time);

  if (!start) {
    throw new Error(
      "The invitation needs a valid date and time before it can be added to your calendar."
    );
  }

  const dateTime = new Date(`${date}T${time}:00`);

  if (Number.isNaN(dateTime.getTime())) {
    throw new Error(
      "The invitation date or time is invalid."
    );
  }

  // Default event duration: one hour.
  dateTime.setHours(dateTime.getHours() + 1);

  const end =
    `${dateTime.getFullYear()}` +
    `${String(dateTime.getMonth() + 1).padStart(2, "0")}` +
    `${String(dateTime.getDate()).padStart(2, "0")}` +
    `T${String(dateTime.getHours()).padStart(2, "0")}` +
    `${String(dateTime.getMinutes()).padStart(2, "0")}00`;

  const destination = invitation.destination;

  const location = [
    destination.name,
    destination.area,
  ]
    .filter(Boolean)
    .join(", ");

  const description = [
    invitation.details.activity,
    invitation.details.food
      ? `Something good: ${invitation.details.food}`
      : "",
    invitation.details.wear
      ? `What to wear: ${invitation.details.wear}`
      : "",
    invitation.note ?? "",
    destination.hint ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const uid =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const contents = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Invitation Engine//Contemporary Keepsake//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@invitation-engine`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeCalendarText(invitation.question)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    ...(location
      ? [`LOCATION:${escapeCalendarText(location)}`]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([contents], {
    type: "text/calendar;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "our-plans.ics";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function formatSchedule(invitation: Invitation): string {
  const date = new Date(
    `${invitation.schedule.date}T12:00:00`
  );

  const formattedDate = Number.isNaN(date.getTime())
    ? invitation.schedule.date
    : new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date);

  if (!invitation.schedule.time) {
    return formattedDate;
  }

  const match = invitation.schedule.time.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (!match) {
    return `${formattedDate} · ${invitation.schedule.time}`;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return `${formattedDate} · ${invitation.schedule.time}`;
  }

  const formattedTime = new Intl.DateTimeFormat(
    "en-GB",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(new Date(2000, 0, 1, hours, minutes));

  return `${formattedDate} · ${formattedTime}`;
}

function getBeat(
  beats: ExperienceBeat[],
  type: ExperienceBeat["type"]
): ExperienceBeat | undefined {
  return beats.find((beat) => beat.type === type);
}

function makeDestinationBeat(
  invitation: Invitation
): ExperienceBeat | null {
  const destination = invitation.destination;

  const title = destination.name?.trim();

  const body = [
    destination.area,
    destination.hint,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!title && !body) {
    return null;
  }

  return {
    id: "destination",
    type: "destination",
    content: {
      title: title || "Somewhere for us",
      body,
    },
    delay: 500,
    hold: 2500,
  };
}

function RevealBeat({
  beat,
  invitation,
}: {
  beat: ExperienceBeat;
  invitation: Invitation;
}) {
  const title = beat.content.title;
  const body = beat.content.body;

  const icon =
    beat.type === "activity" ? (
      <Footprints aria-hidden="true" />
    ) : beat.type === "food" ? (
      <Utensils aria-hidden="true" />
    ) : beat.type === "destination" ? (
      <MapPin aria-hidden="true" />
    ) : beat.type === "wear" ? (
      <Shirt aria-hidden="true" />
    ) : null;

  const mapUrl =
    beat.type === "destination"
      ? getMapUrl(invitation.destination)
      : null;

  return (
    <article
      className={`recipient-reveal-beat recipient-reveal-${beat.type}`}
      data-beat={beat.id}
    >
      {icon && (
        <div className="recipient-reveal-icon">
          {icon}
        </div>
      )}

      {title && (
        <h3 className="recipient-reveal-title">
          {title}
        </h3>
      )}

      {body && (
        <p className="recipient-reveal-body">
          {body}
        </p>
      )}

      {beat.type === "schedule" && (
        <p className="recipient-reveal-body">
          {formatSchedule(invitation)}
        </p>
      )}

      {beat.type === "destination" && mapUrl && (
        <a
          className="recipient-map-link"
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin size={16} aria-hidden="true" />
          Open the map
        </a>
      )}
    </article>
  );
}

export default function RecipientExperience({
  invitation,
  experience,
  publicToken,
}: RecipientExperienceProps) {
  const [stage, setStage] = useState<Stage>("opening");

  const [visibleBeats, setVisibleBeats] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const [responseError, setResponseError] = useState("");

  const [calendarError, setCalendarError] = useState("");

  const [savedResponse, setSavedResponse] =
    useState<ResponseType | null>(null);

  const openingBeat = useMemo(
    () => getBeat(experience, "opening"),
    [experience]
  );

  const askBeat = useMemo(
    () => getBeat(experience, "ask"),
    [experience]
  );

  const closingBeat = useMemo(
    () => getBeat(experience, "closing"),
    [experience]
  );

  const revealBeats = useMemo(() => {
    const destinationShouldBeHeld =
      invitation.destination.reveal === "after-accept";

    const beats = experience.filter((beat) =>
      REVEAL_ORDER.includes(
        beat.type as (typeof REVEAL_ORDER)[number]
      )
    );

    const result = destinationShouldBeHeld
      ? beats.filter((beat) => beat.type !== "destination")
      : [...beats];

    if (
      destinationShouldBeHeld &&
      !result.some((beat) => beat.type === "destination")
    ) {
      const destinationBeat = makeDestinationBeat(invitation);

      if (destinationBeat) {
        result.push(destinationBeat);
      }
    }

    return result.sort(
      (a, b) =>
        REVEAL_ORDER.indexOf(
          a.type as (typeof REVEAL_ORDER)[number]
        ) -
        REVEAL_ORDER.indexOf(
          b.type as (typeof REVEAL_ORDER)[number]
        )
    );
  }, [experience, invitation]);

  useEffect(() => {
    if (stage !== "revealing") {
      return;
    }

    if (visibleBeats >= revealBeats.length) {
      const timeout = window.setTimeout(() => {
        setStage("complete");
      }, 500);

      return () => window.clearTimeout(timeout);
    }

    const currentBeat = revealBeats[visibleBeats];

    if (!currentBeat) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setVisibleBeats((current) => current + 1);
    }, getRevealDelay(currentBeat));

    return () => window.clearTimeout(timeout);
  }, [stage, visibleBeats, revealBeats]);

  async function saveResponse(
    response: ResponseType
  ): Promise<boolean> {
    if (submitting || savedResponse !== null) {
      return false;
    }

    setResponseError("");
    setSubmitting(true);

    try {
      // Builder previews and legacy links have no public token.
      // Keep those experiences usable without a database write.
      if (!publicToken) {
        setSavedResponse(response);
        return true;
      }

      const { data, error } = await supabase.rpc(
        "submit_invitation_response",
        {
          p_public_token: publicToken,
          p_response: response,
        }
      );

      if (error) {
        console.error(
          "Invitation response RPC failed:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        throw new Error(
          [
            error.message,
            error.details,
            error.hint,
            error.code ? `Code: ${error.code}` : "",
          ]
            .filter(Boolean)
            .join(" | ")
        );
      }

      const result = data as ResponseResult | null;

      if (!result || result.success !== true) {
        throw new Error(
          "The server did not confirm that your response was saved."
        );
      }

      setSavedResponse(response);

      return true;
    } catch (error) {
      console.error(
        "Failed to save invitation response:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      setResponseError(
        `Your response wasn't saved: ${message}`
      );

      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptInvitation() {
    if (submitting || savedResponse !== null) {
      return;
    }

    const success = await saveResponse("accepted");

    if (!success) {
      return;
    }

    setVisibleBeats(0);
    setStage("revealing");
  }

  async function declineInvitation() {
    if (submitting || savedResponse !== null) {
      return;
    }

    const success = await saveResponse("another_time");

    if (!success) {
      return;
    }

    setStage("declined");
  }

  function addToCalendar() {
    setCalendarError("");

    try {
      downloadCalendar(invitation);
    } catch (error) {
      console.error(
        "Unable to create calendar file:",
        error
      );

      setCalendarError(
        error instanceof Error
          ? error.message
          : "Unable to create the calendar file."
      );
    }
  }

  const recipientName = invitation.recipient.name.trim();

  const mood = invitation.mood || "cozy";

  const openingTitle =
    openingBeat?.content.title ||
    "I made something for you.";

  const openingBody =
    openingBeat?.content.body ||
    (recipientName
      ? `Something for you, ${recipientName}.`
      : "A little something, made just for you.");

  const questionTitle =
    askBeat?.content.title || invitation.question;

  const questionBody = askBeat?.content.body || "";

  const closingTitle =
    closingBeat?.content.body || "See you soon.";

  const mapUrl = getMapUrl(invitation.destination);

  return (
    <main
      className={`recipient-experience mood-${mood}`}
      data-stage={stage}
    >
      <div className="recipient-experience-inner">
        <div className="recipient-experience-topline">
          <span />
          A little something for you
          <span />
        </div>

        {stage === "opening" && (
          <section className="recipient-opening">
            <div
              className="recipient-opening-ornament"
              aria-hidden="true"
            >
              ✳
            </div>

            <p className="recipient-eyebrow">
              Made with you in mind
            </p>

            <h1 className="recipient-opening-title">
              {recipientName
                ? `For ${recipientName}`
                : openingTitle}
            </h1>

            <p className="recipient-opening-copy">
              {openingBody}
            </p>

            <div
              className="recipient-divider"
              aria-hidden="true"
            />

            <button
              type="button"
              className="recipient-button recipient-button-primary"
              onClick={() => setStage("question")}
            >
              Open your invitation
            </button>
          </section>
        )}

        {stage === "question" && (
          <section className="recipient-question">
            <div
              className="recipient-opening-ornament"
              aria-hidden="true"
            >
              ✳
            </div>

            <p className="recipient-eyebrow">
              An invitation for you
            </p>

            <h1 className="recipient-question-title">
              {questionTitle}
            </h1>

            {questionBody && (
              <p className="recipient-question-copy">
                {questionBody}
              </p>
            )}

            <div className="recipient-response-actions">
              <button
                type="button"
                className="recipient-button recipient-button-primary"
                onClick={() => void acceptInvitation()}
                disabled={submitting || savedResponse !== null}
              >
                {submitting
                  ? "Saving your response…"
                  : "I'm in"}
              </button>

              <button
                type="button"
                className="recipient-button recipient-button-secondary"
                onClick={() => void declineInvitation()}
                disabled={submitting || savedResponse !== null}
              >
                Maybe another day
              </button>
            </div>

            {responseError && (
              <div
                className="recipient-response-error"
                role="alert"
              >
                <p>{responseError}</p>

                <button
                  type="button"
                  className="recipient-button recipient-button-secondary"
                  onClick={() => setResponseError("")}
                >
                  Try again
                </button>
              </div>
            )}
          </section>
        )}

        {stage === "revealing" && (
          <section className="recipient-revealing">
            <p className="recipient-eyebrow">
              The plan, little by little
            </p>

            <h1 className="recipient-reveal-heading">
              {mood === "playful"
                ? "Here's what I've got in mind."
                : mood === "elegant"
                  ? "The plan."
                  : "Okay. Here's the plan."}
            </h1>

            <div className="recipient-reveal-list">
              {revealBeats
                .slice(0, visibleBeats)
                .map((beat) => (
                  <RevealBeat
                    key={beat.id}
                    beat={beat}
                    invitation={invitation}
                  />
                ))}
            </div>

            {visibleBeats < revealBeats.length && (
              <div className="recipient-reveal-progress">
                <span aria-hidden="true" />
                <p>A little more to come</p>
              </div>
            )}
          </section>
        )}

        {stage === "complete" && (
          <section className="recipient-complete">
            <div
              className="recipient-opening-ornament"
              aria-hidden="true"
            >
              ✳
            </div>

            <p className="recipient-eyebrow">
              It's a plan
            </p>

            <h1 className="recipient-complete-title">
              {closingTitle}
            </h1>

            <div className="recipient-complete-summary">
              <CalendarDays
                size={18}
                aria-hidden="true"
              />

              <span>{formatSchedule(invitation)}</span>
            </div>

            <div className="recipient-complete-actions">
              <button
                type="button"
                className="recipient-button recipient-button-primary"
                onClick={addToCalendar}
              >
                <CalendarDays
                  size={17}
                  aria-hidden="true"
                />
                Add to calendar
              </button>

              {mapUrl && (
                <a
                  className="recipient-button recipient-button-secondary"
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin
                    size={17}
                    aria-hidden="true"
                  />
                  Open the map
                </a>
              )}
            </div>

            {calendarError && (
              <div
                className="recipient-response-error"
                role="alert"
              >
                {calendarError}
              </div>
            )}

            <p className="recipient-keepsake-footer">
              A little moment, made personal.
            </p>
          </section>
        )}

        {stage === "declined" && (
          <section className="recipient-declined">
            <div
              className="recipient-opening-ornament"
              aria-hidden="true"
            >
              ✳
            </div>

            <p className="recipient-eyebrow">
              Thank you for letting me know
            </p>

            <h1 className="recipient-declined-title">
              Another time, then.
            </h1>

            <p className="recipient-declined-copy">
              No pressure. We'll find another moment
              that works for both of us.
            </p>

            <div
              className="recipient-divider"
              aria-hidden="true"
            />

            <p className="recipient-keepsake-footer">
              Your response has been saved.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
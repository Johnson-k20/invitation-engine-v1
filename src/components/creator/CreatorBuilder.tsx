import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Invitation, Mood } from "../../experience/types";
import { moods as moodConfigs } from "../../experience/moods";
import "./CreatorBuilder.css";

type CreatorBuilderProps = {
  invitation: Invitation;
  onChange: (invitation: Invitation) => void;
  onPreview: () => void;
  onCreateLink: (invitation: Invitation) => string | void | Promise<string | void>;
};

const moods: { id: Mood; name: string; description: string }[] = [
  { id: "cozy", name: "Cozy", description: "Warm and unhurried" },
  { id: "playful", name: "Playful", description: "Lighthearted and spontaneous" },
  { id: "elegant", name: "Elegant", description: "Composed and intentional" },
];

const emojis = ["♡", "✦", "☀", "🌷", "✨", "☕", "🌙", "🍓", "💌", "🎈", "🪻", "🍷"];

export default function CreatorBuilder({
  invitation,
  onChange,
  onPreview,
  onCreateLink,
}: CreatorBuilderProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const setRecipientName = (value: string) =>
    onChange({ ...invitation, recipient: { ...invitation.recipient, name: value } });

  const setSchedule = (key: "date" | "time", value: string) =>
    onChange({ ...invitation, schedule: { ...invitation.schedule, [key]: value } });

  const setDetails = (key: keyof Invitation["details"], value: string) =>
    onChange({ ...invitation, details: { ...invitation.details, [key]: value } });

  const setDestination = (key: keyof Invitation["destination"], value: string) =>
    onChange({
      ...invitation,
      destination: { ...invitation.destination, [key]: value },
    });

  const handleCreateLink = async () => {
    setLinkError("");
    setCopied(false);
    setCreating(true);
    try {
      const result = await onCreateLink(invitation);
      if (typeof result === "string" && result.trim()) setLink(result);
      else if (typeof window !== "undefined") {
        const current = new URL(window.location.href);
        if (current.searchParams.has("invite")) setLink(current.toString());
      }
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "The link could not be created. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setLinkError("Copying was blocked by the browser. Select the link and copy it manually.");
    }
  };

  const shareWhatsApp = () => {
    if (!link) return;
    const message = `I made something for you. Open it here: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const updateText = (key: "question" | "note", event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ ...invitation, [key]: event.target.value });
  };

  return (
    <main className="keepsake-builder">
      <header className="keepsake-header">
        <div className="keepsake-header-meta">
          <span className="keepsake-mark" aria-hidden="true">✳</span>
          <span className="keepsake-overline">A small thing, made personal</span>
          <span className="keepsake-edition">MADE FOR ONE PERSON</span>
        </div>
        <div className="keepsake-header-composition">
          <div className="keepsake-header-copy">
            <p className="keepsake-header-kicker">A note before the plans</p>
            <h1 className="keepsake-title">Make it <em>personal.</em></h1>
            <p className="keepsake-subtitle">Start with what you want to ask. The details can find their place around it.</p>
            <div className="keepsake-title-rule"><span>✦</span></div>
          </div>
          <aside
            className={`keepsake-live-note keepsake-live-note--${invitation.mood}`}
            aria-label={`Live invitation preview, ${moodConfigs[invitation.mood].name} mood`}
          >
            <span className="keepsake-live-note-label">LIVE INVITATION PREVIEW</span>
            <span className="keepsake-live-note-flower" aria-hidden="true">✳</span>
            <p className="keepsake-live-recipient">{invitation.recipient.name.trim() || "Someone special"}</p>
            <p className="keepsake-live-question">{invitation.question.trim() || "Your question will live here."}</p>
            <p className="keepsake-live-opening">{moodConfigs[invitation.mood].opening}</p>
            <div className="keepsake-live-plan" aria-label="Plan preview">
              <span>{invitation.details.activity.trim() || "Your activity"}</span>
              <span aria-hidden="true">·</span>
              <span>{invitation.details.food.trim() || "Something to eat"}</span>
            </div>
            <span className="keepsake-live-note-rule" aria-hidden="true" />
            <span className="keepsake-live-note-signoff">{moodConfigs[invitation.mood].closing}</span>
          </aside>
        </div>
      </header>

      <div className="keepsake-composition">
        <section className="keepsake-ask" aria-labelledby="keepsake-ask-title">
          <div className="keepsake-section-topline">
            <span className="keepsake-section-index" aria-hidden="true">✳</span>
            <h2 id="keepsake-ask-title">The ask</h2>
            <span className="keepsake-section-flourish" aria-hidden="true">WORDS, WITH FEELING</span>
          </div>

          <div className="keepsake-recipient-block">
            <label className="keepsake-label" htmlFor="recipient-name">THIS ONE IS FOR</label>
            <input
              id="recipient-name"
              className="keepsake-recipient-input"
              value={invitation.recipient.name}
              onChange={(event) => setRecipientName(event.target.value)}
              placeholder="Their name"
              autoComplete="off"
            />
          </div>

          <div className="keepsake-question-block">
            <label className="keepsake-label" htmlFor="invitation-question">THE QUESTION</label>
            <div className="keepsake-question-input-wrap">
              <textarea
                id="invitation-question"
                className="keepsake-question-input"
                value={invitation.question}
                onChange={(event) => onChange({ ...invitation, question: event.target.value })}
                placeholder="What would you like to ask?"
                rows={2}
              />
              <div className="keepsake-emoji-control">
                <button
                  type="button"
                  className="keepsake-emoji-trigger"
                  aria-label="Choose a small symbol"
                  aria-expanded={emojiOpen}
                  onClick={() => setEmojiOpen((open) => !open)}
                >
                  {invitation.question.match(/[♡✦☀🌷✨☕🌙🍓💌🎈🪻🍷]/u)?.[0] ?? "♡"}
                  <span>+</span>
                </button>
                {emojiOpen && (
                  <div className="keepsake-emoji-picker" role="group" aria-label="Choose a symbol">
                    {emojis.map((emoji) => (
                      <button
                        type="button"
                        className="keepsake-emoji-option"
                        key={emoji}
                        onClick={() => {
                          const cleaned = invitation.question.replace(/[♡✦☀🌷✨☕🌙🍓💌🎈🪻🍷]/gu, "").trimEnd();
                          onChange({ ...invitation, question: `${cleaned} ${emoji}`.trim() });
                          setEmojiOpen(false);
                        }}
                        aria-label={`Use ${emoji}`}
                      >{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="keepsake-soft-note">A few words that sound like you.</p>
          </div>

          <fieldset className="keepsake-feeling">
            <legend className="keepsake-label">THE FEELING</legend>
            <p className="keepsake-feeling-hint">Choose a tone to see it take shape.</p>
            <div className="keepsake-moods">
              {moods.map((mood) => (
                <button
                  type="button"
                  key={mood.id}
                  className={`keepsake-mood${invitation.mood === mood.id ? " is-selected" : ""}`}
                  data-mood={mood.id}
                  aria-pressed={invitation.mood === mood.id}
                  onClick={() => onChange({ ...invitation, mood: mood.id })}
                >
                  <span className="keepsake-mood-name">{mood.name}</span>
                  <span className="keepsake-mood-description">{mood.description}</span>
                  <span className="keepsake-mood-indicator" aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="keepsake-plan" aria-labelledby="keepsake-plan-title">
          <div className="keepsake-section-topline">
            <span className="keepsake-section-index" aria-hidden="true">✧</span>
            <h2 id="keepsake-plan-title">The plan</h2>
            <span className="keepsake-section-flourish" aria-hidden="true">THE LITTLE DETAILS</span>
          </div>
          <div className="keepsake-plan-intro">A little time, set aside for the two of you.</div>

          <div className="keepsake-field-grid">
            <div className="keepsake-field keepsake-field-date">
              <label className="keepsake-label" htmlFor="invitation-date">DATE</label>
              <input id="invitation-date" type="date" value={invitation.schedule.date} onChange={(event) => setSchedule("date", event.target.value)} />
            </div>
            <div className="keepsake-field keepsake-field-time">
              <label className="keepsake-label" htmlFor="invitation-time">TIME</label>
              <input id="invitation-time" type="time" value={invitation.schedule.time} onChange={(event) => setSchedule("time", event.target.value)} />
            </div>
            <div className="keepsake-field">
              <label className="keepsake-label" htmlFor="invitation-activity">WHAT WE’LL DO</label>
              <input id="invitation-activity" value={invitation.details.activity ?? ""} onChange={(event) => setDetails("activity", event.target.value)} placeholder="A sunset walk…" />
            </div>
            <div className="keepsake-field">
              <label className="keepsake-label" htmlFor="invitation-food">SOMETHING TO EAT</label>
              <input id="invitation-food" value={invitation.details.food ?? ""} onChange={(event) => setDetails("food", event.target.value)} placeholder="Pasta, maybe…" />
            </div>
          </div>

          <div className="keepsake-destination">
            <span className="keepsake-label">WHERE WE’LL GO</span>
            <input
              className="keepsake-destination-name"
              aria-label="Destination name"
              value={invitation.destination.name}
              onChange={(event) => setDestination("name", event.target.value)}
              placeholder="Somewhere cozy"
            />
            <input
              className="keepsake-destination-area"
              aria-label="Destination area"
              value={invitation.destination.area ?? ""}
              onChange={(event) => setDestination("area", event.target.value)}
              placeholder="Neighbourhood or area"
            />
          </div>

          <details className="keepsake-more" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
            <summary><span>A little more</span><span className="keepsake-more-symbol" aria-hidden="true">{detailsOpen ? "−" : "+"}</span></summary>
            <div className="keepsake-more-fields">
              <div className="keepsake-field">
                <label className="keepsake-label" htmlFor="invitation-wear">WHAT TO WEAR</label>
                <input id="invitation-wear" value={invitation.details.wear ?? ""} onChange={(event) => setDetails("wear", event.target.value)} placeholder="Smart casual…" />
              </div>
              <div className="keepsake-field">
                <label className="keepsake-label" htmlFor="invitation-hint">A SMALL HINT</label>
                <input id="invitation-hint" value={invitation.destination.hint ?? ""} onChange={(event) => setDestination("hint", event.target.value)} placeholder="A little place I’ve been wanting to try." />
              </div>
              <div className="keepsake-field">
                <label className="keepsake-label" htmlFor="invitation-map">MAP LINK (OPTIONAL)</label>
                <input id="invitation-map" type="url" value={invitation.destination.mapUrl ?? ""} onChange={(event) => setDestination("mapUrl", event.target.value)} placeholder="https://…" />
              </div>
              <div className="keepsake-field keepsake-note-field">
                <label className="keepsake-label" htmlFor="invitation-note">A NOTE, JUST FOR THEM</label>
                <textarea id="invitation-note" value={invitation.note ?? ""} onChange={(event) => updateText("note", event)} placeholder="I thought we could slow down for a few hours…" rows={2} />
              </div>
            </div>
          </details>
        </section>
      </div>

      <footer className="keepsake-footer">
        <div className="keepsake-footer-signoff"><span aria-hidden="true">✳</span><span>Made with a little thought.</span></div>
        <div className="keepsake-footer-actions">
          <button type="button" className="keepsake-preview-button" onClick={onPreview}>Preview invitation <span aria-hidden="true">↗</span></button>
          <button type="button" className="keepsake-create-button" onClick={handleCreateLink} disabled={creating}>
            {creating ? "Making your link…" : "Create invitation link"}<span aria-hidden="true">↗</span>
          </button>
        </div>
      </footer>

      {linkError && <p className="keepsake-error" role="alert">{linkError}</p>}
      {link && (
        <section className="keepsake-share" aria-live="polite" aria-label="Your invitation link">
          <div className="keepsake-share-heading"><span className="keepsake-share-mark">✦</span><div><h2>Your invitation is ready.</h2><p>Send it to them. The link opens straight into your invitation.</p></div></div>
          <div className="keepsake-share-row"><input aria-label="Invitation link" readOnly value={link} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button></div>
          <button type="button" className="keepsake-whatsapp-button" onClick={shareWhatsApp}>Share on WhatsApp <span aria-hidden="true">↗</span></button>
        </section>
      )}
    </main>
  );
}

export { CreatorBuilder };

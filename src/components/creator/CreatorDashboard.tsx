import { useEffect, useMemo, useState } from "react";
import type { PublishedInvitation } from "../../lib/invitations";
import "./CreatorDashboard.css";

type CreatorDashboardProps = {
  invitations: PublishedInvitation[];
  loading: boolean;
  error: string;
  onCreate: () => void;
  onEdit: (invitation: PublishedInvitation) => void;
  onRefresh: () => void;
  onSignOut: () => void;
  signingOut: boolean;
};

function recipientName(record: PublishedInvitation) {
  return record.invitation_data.recipient?.name?.trim() || "Untitled invitation";
}

function dateLabel(value: string) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function responseLabel(record: PublishedInvitation) {
  if (record.response === "accepted") return "Accepted";
  if (record.response === "another_time") return "Another time";
  return "Awaiting response";
}

function statusClass(record: PublishedInvitation) {
  if (record.status === "archived") return "is-archived";
  if (record.response === "accepted") return "is-accepted";
  if (record.response === "another_time") return "is-another-time";
  return "is-published";
}

export function CreatorDashboard({
  invitations,
  loading,
  error,
  onCreate,
  onEdit,
  onRefresh,
  onSignOut,
  signingOut,
}: CreatorDashboardProps) {
  const [filter, setFilter] = useState<"all" | "waiting" | "responded">("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => ({
    total: invitations.length,
    waiting: invitations.filter((item) => item.status === "published" && !item.response).length,
    accepted: invitations.filter((item) => item.response === "accepted").length,
  }), [invitations]);

  const filteredInvitations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invitations.filter((item) => {
      const hasResponse = Boolean(item.response);
      const matchesFilter =
        filter === "all" ||
        (filter === "waiting" && item.status === "published" && !hasResponse) ||
        (filter === "responded" && hasResponse);
      const matchesSearch = !term ||
        recipientName(item).toLowerCase().includes(term) ||
        item.invitation_data.question.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [filter, invitations, search]);

  useEffect(() => {
    document.title = "Your invitations · Keepsake";
    return () => { document.title = "Invitation Engine"; };
  }, []);

  return (
    <main className="keepsake-dashboard">
      <header className="dashboard-topbar">
        <a className="dashboard-brand" href="#" onClick={(event) => event.preventDefault()} aria-label="Invitation studio home">
          <span className="dashboard-brand-mark" aria-hidden="true">✳</span>
          <span>keepsake<span className="dashboard-brand-period">.</span></span>
        </a>
        <div className="dashboard-account-actions">
          <button type="button" className="dashboard-quiet-button" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" className="dashboard-quiet-button" onClick={onSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <section className="dashboard-intro">
        <div>
          <p className="dashboard-eyebrow">YOUR INVITATION STUDIO</p>
          <h1>A little room for <em>meaningful plans.</em></h1>
          <p className="dashboard-intro-copy">Make something personal, then see how it lands.</p>
        </div>
        <button type="button" className="dashboard-create-button" onClick={onCreate}>
          <span aria-hidden="true">＋</span> Create invitation
        </button>
      </section>

      <section className="dashboard-stats" aria-label="Invitation summary">
        <article className="dashboard-stat">
          <span className="dashboard-stat-label">ALL INVITATIONS</span>
          <strong>{counts.total}</strong>
          <span className="dashboard-stat-foot">Kept in one place</span>
        </article>
        <article className="dashboard-stat">
          <span className="dashboard-stat-label">AWAITING A REPLY</span>
          <strong>{counts.waiting}</strong>
          <span className="dashboard-stat-foot">Still out in the world</span>
        </article>
        <article className="dashboard-stat">
          <span className="dashboard-stat-label">ACCEPTED</span>
          <strong>{counts.accepted}</strong>
          <span className="dashboard-stat-foot">Plans to look forward to</span>
        </article>
      </section>

      <section className="dashboard-list-section">
        <div className="dashboard-list-heading">
          <div>
            <p className="dashboard-eyebrow">YOUR COLLECTION</p>
            <h2>Invitations <span>{invitations.length}</span></h2>
          </div>
          <label className="dashboard-search">
            <span className="dashboard-visually-hidden">Search invitations</span>
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find someone…" />
          </label>
        </div>

        <div className="dashboard-filters" role="group" aria-label="Filter invitations">
          <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>All</button>
          <button type="button" className={filter === "waiting" ? "is-active" : ""} onClick={() => setFilter("waiting")}>Awaiting reply</button>
          <button type="button" className={filter === "responded" ? "is-active" : ""} onClick={() => setFilter("responded")}>Responded</button>
        </div>

        {error && (
          <div className="dashboard-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRefresh}>Try again</button>
          </div>
        )}

        {loading ? (
          <div className="dashboard-empty"><span className="dashboard-empty-mark">✳</span><p>Gathering your invitations…</p></div>
        ) : filteredInvitations.length === 0 ? (
          <div className="dashboard-empty">
            <span className="dashboard-empty-mark" aria-hidden="true">♡</span>
            <h3>{invitations.length === 0 ? "Your collection starts here." : "Nothing matches just yet."}</h3>
            <p>{invitations.length === 0 ? "Create your first invitation and give someone something lovely to open." : "Try another search or filter to find the invitation."}</p>
            {invitations.length === 0 && <button type="button" className="dashboard-create-button dashboard-create-button--small" onClick={onCreate}>Create your first invitation <span aria-hidden="true">→</span></button>}
          </div>
        ) : (
          <div className="dashboard-invitation-list">
            {filteredInvitations.map((record) => (
              <article className="dashboard-invitation-row" key={record.id}>
                <div className="dashboard-row-symbol" aria-hidden="true">♡</div>
                <div className="dashboard-row-main">
                  <h3>{recipientName(record)}</h3>
                  <p className="dashboard-row-question">{record.invitation_data.question || "A personal invitation"}</p>
                  <p className="dashboard-row-date">{dateLabel(record.invitation_data.schedule.date)}{record.invitation_data.schedule.time ? ` · ${record.invitation_data.schedule.time}` : ""}</p>
                </div>
                <div className="dashboard-row-status-wrap">
                  <span className={`dashboard-status ${statusClass(record)}`}>{record.status === "archived" ? "Archived" : responseLabel(record)}</span>
                  <span className="dashboard-row-created">Created {dateLabel(record.created_at.slice(0, 10))}</span>
                </div>
                <button type="button" className="dashboard-row-open" onClick={() => onEdit(record)} aria-label={`Manage invitation for ${recipientName(record)}`}>
                  Manage <span aria-hidden="true">↗</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>Made with care, for someone in particular.</span>
        <span>INVITATION STUDIO <i aria-hidden="true">✦</i></span>
      </footer>
    </main>
  );
}

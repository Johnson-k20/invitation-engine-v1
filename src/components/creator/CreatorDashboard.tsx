import { useEffect, useMemo, useState } from "react";
import type { PublishedInvitation } from "../../lib/invitations";
import "./CreatorDashboard.css";

type CreatorDashboardProps = {
  invitations: PublishedInvitation[];
  loading: boolean;
  error: string;
  onCreate: () => void;
  onPreview: (invitation: PublishedInvitation) => void;
  onViewResponse: (invitation: PublishedInvitation) => void;
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
  onPreview,
  onViewResponse,
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
        <div className="dashboard-intro-copy-block">
          <p className="dashboard-eyebrow">YOUR INVITATION STUDIO <span aria-hidden="true">/</span> OVERVIEW</p>
          <h1>Make room for <em>something lovely.</em></h1>
          <p className="dashboard-intro-copy">A quiet place to shape a plan, send it out, and see what comes back.</p>
        </div>
        <div className="dashboard-intro-side">
          <span className="dashboard-hero-flourish" aria-hidden="true">✳</span>
          <button type="button" className="dashboard-create-button" onClick={onCreate}>
            <span aria-hidden="true">＋</span> Create an invitation <span className="dashboard-create-arrow" aria-hidden="true">↗</span>
          </button>
          <span className="dashboard-hero-note">A thoughtful little thing, made by you.</span>
        </div>
      </section>

      <section className="dashboard-stats" aria-label="Invitation summary">
        <article className="dashboard-stat">
          <span className="dashboard-stat-index">01 / COLLECTION</span>
          <span className="dashboard-stat-label">All invitations</span>
          <strong>{counts.total.toString().padStart(2, "0")}</strong>
          <span className="dashboard-stat-foot">Every plan you’ve put into the world</span>
        </article>
        <article className="dashboard-stat">
          <span className="dashboard-stat-index">02 / OUT THERE</span>
          <span className="dashboard-stat-label">Awaiting a reply</span>
          <strong>{counts.waiting.toString().padStart(2, "0")}</strong>
          <span className="dashboard-stat-foot">Invitations still waiting to be answered</span>
        </article>
        <article className="dashboard-stat">
          <span className="dashboard-stat-index">03 / A YES</span>
          <span className="dashboard-stat-label">Accepted</span>
          <strong>{counts.accepted.toString().padStart(2, "0")}</strong>
          <span className="dashboard-stat-foot">Plans you can start looking forward to</span>
        </article>
      </section>

      <section className="dashboard-list-section">
        <div className="dashboard-list-heading">
          <div>
            <p className="dashboard-eyebrow">YOUR COLLECTION</p>
            <h2>Your collection <span>{filteredInvitations.length} shown</span></h2>
            <p className="dashboard-list-subtitle">Each invitation, and where things stand.</p>
          </div>
          <label className="dashboard-search">
            <span className="dashboard-visually-hidden">Search invitations</span>
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names or messages…" />
          </label>
        </div>

        <div className="dashboard-list-controls">
          <div className="dashboard-filters" role="group" aria-label="Filter invitations">
            <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>Everything <span>{counts.total}</span></button>
            <button type="button" className={filter === "waiting" ? "is-active" : ""} onClick={() => setFilter("waiting")}>Awaiting <span>{counts.waiting}</span></button>
            <button type="button" className={filter === "responded" ? "is-active" : ""} onClick={() => setFilter("responded")}>Responded</button>
          </div>
          {search && <button type="button" className="dashboard-clear-search" onClick={() => setSearch("")}>Clear search ×</button>}
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
                <div className="dashboard-row-actions">
                  <button type="button" className="dashboard-row-action" onClick={() => onPreview(record)}>
                    Preview
                  </button>
                  {record.response ? (
                    <button type="button" className="dashboard-row-action dashboard-row-action--response" onClick={() => onViewResponse(record)}>
                      View response
                    </button>
                  ) : (
                    <span className="dashboard-row-pending" aria-label="No response received yet">Waiting</span>
                  )}
                  <button type="button" className="dashboard-row-action" onClick={() => onEdit(record)}>
                    Edit
                  </button>
                </div>
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

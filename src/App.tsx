import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { CreatorBuilder } from "./components/creator/CreatorBuilder";
import { CreatorDashboard } from "./components/creator/CreatorDashboard";
import RecipientExperience from "./components/recipient/RecipientExperience";
import {
  AuthPanel,
  PasswordRecoveryPanel,
} from "./auth/AuthPanel";

import { supabase } from "./lib/supabase";
import {
  publishInvitation,
  getPublishedInvitation,
  getCreatorInvitations,
  type PublishedInvitation,
} from "./lib/invitations";

import { defaultInvitation } from "./data/defaultInvitation";
import { buildDateExperience } from "./experience/buildDateExperience";
import type { Invitation } from "./experience/types";

type AppMode = "dashboard" | "builder" | "preview" | "response";

const LEGACY_INVITATION_QUERY = "invite";
const PUBLIC_TOKEN_QUERY = "token";

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

    return isValidInvitation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isValidInvitation(
  value: unknown
): value is Invitation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const invitation = value as Record<string, unknown>;

  if (
    typeof invitation.id !== "string" ||
    typeof invitation.question !== "string" ||
    typeof invitation.mood !== "string" ||
    !["cozy", "playful", "elegant"].includes(
      invitation.mood
    ) ||
    invitation.occasion !== "date"
  ) {
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

  const scheduleData = schedule as Record<string, unknown>;

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

  const destinationData = destination as Record<
    string,
    unknown
  >;

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

function StatusScreen({
  message,
  detail,
}: {
  message: string;
  detail?: string;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#faf8f4",
        color: "#292624",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
      }}
    >
      <section style={{ maxWidth: "420px" }}>
        <p
          style={{
            color: "#a96f5f",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          A little something for you
        </p>

        <h1
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: "38px",
            fontWeight: 500,
          }}
        >
          {message}
        </h1>

        {detail && (
          <p
            style={{
              color: "#77716b",
              lineHeight: 1.7,
            }}
          >
            {detail}
          </p>
        )}
      </section>
    </main>
  );
}

function App() {
  const params = new URLSearchParams(
    window.location.search
  );

  const publicToken = params.get(PUBLIC_TOKEN_QUERY);
  const legacyEncodedInvitation = params.get(
    LEGACY_INVITATION_QUERY
  );

  const isDatabaseRecipientLink = Boolean(publicToken);
  const isLegacyRecipientLink = Boolean(
    legacyEncodedInvitation
  );

  const legacyInvitation = legacyEncodedInvitation
    ? decodeInvitation(legacyEncodedInvitation)
    : null;

  const [invitation, setInvitation] = useState<Invitation>(
    () => legacyInvitation ?? defaultInvitation
  );

  const [mode, setMode] = useState<AppMode>("dashboard");
  const [creatorInvitations, setCreatorInvitations] = useState<PublishedInvitation[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [editingInvitationId, setEditingInvitationId] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<PublishedInvitation | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const [passwordRecovery, setPasswordRecovery] =
    useState(false);

  const [recipientInvitation, setRecipientInvitation] =
    useState<Invitation | null>(null);

  const [recipientLoading, setRecipientLoading] = useState(
    isDatabaseRecipientLink
  );

  const [recipientError, setRecipientError] = useState(false);

  /*
   * Restore the creator's session and listen for
   * authentication events, including password recovery.
   */
  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (active) {
          setSession(data.session);
        }
      } catch (error) {
        console.error(
          "Unable to restore session:",
          error
        );
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!active) {
          return;
        }

        if (event === "PASSWORD_RECOVERY") {
          setPasswordRecovery(true);
        }

        setSession(currentSession);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * Load the signed-in creator's invitations for the dashboard.
   */
  useEffect(() => {
    if (!session || isDatabaseRecipientLink || isLegacyRecipientLink || passwordRecovery) return;

    let active = true;
    async function loadCreatorInvitations() {
      setDashboardLoading(true);
      setDashboardError("");
      try {
        const records = await getCreatorInvitations();
        if (active) setCreatorInvitations(records);
      } catch (error) {
        console.error("Unable to load creator invitations:", error);
        if (active) {
          setDashboardError(error instanceof Error ? error.message : "Your invitations could not be loaded.");
        }
      } finally {
        if (active) setDashboardLoading(false);
      }
    }
    void loadCreatorInvitations();
    return () => { active = false; };
  }, [session, isDatabaseRecipientLink, isLegacyRecipientLink, passwordRecovery]);

  async function refreshCreatorInvitations() {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      setCreatorInvitations(await getCreatorInvitations());
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Your invitations could not be loaded.");
    } finally {
      setDashboardLoading(false);
    }
  }

  /*
   * Load a published invitation using its public token.
   * Recipients do not need a creator account.
   */
  useEffect(() => {
    if (!publicToken) {
      setRecipientLoading(false);
      return;
    }

    let active = true;

    async function loadRecipientInvitation() {
      setRecipientLoading(true);
      setRecipientError(false);
      setRecipientInvitation(null);

      try {
        const loadedInvitation =
          await getPublishedInvitation(publicToken!);

        if (!active) {
          return;
        }

        if (
          !loadedInvitation ||
          !isValidInvitation(loadedInvitation)
        ) {
          setRecipientError(true);
          return;
        }

        setRecipientInvitation(loadedInvitation);
      } catch (error) {
        console.error(
          "Unable to load invitation:",
          error
        );

        if (active) {
          setRecipientError(true);
        }
      } finally {
        if (active) {
          setRecipientLoading(false);
        }
      }
    }

    void loadRecipientInvitation();

    return () => {
      active = false;
    };
  }, [publicToken]);

  /*
   * Publish an invitation and return its shareable URL.
   */
  async function createInvitationLink(
    invitationToShare: Invitation
  ): Promise<string> {
    const published = await publishInvitation(
      invitationToShare,
      editingInvitationId
    );

    setEditingInvitationId(published.id);
    await refreshCreatorInvitations();

    const url = new URL(window.location.href);

    url.search = "";
    url.hash = "";

    url.searchParams.set(
      PUBLIC_TOKEN_QUERY,
      published.public_token
    );

    return url.toString();
  }

  /*
   * Sign the creator out.
   */
  async function handleSignOut() {
    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setMode("dashboard");
      setEditingInvitationId(null);
    } catch (error) {
      console.error("Unable to sign out:", error);

      window.alert(
        "Sign-out failed. Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  /*
   * Public route: database-backed invitation.
   */
  if (isDatabaseRecipientLink) {
    if (recipientLoading) {
      return (
        <StatusScreen message="Opening your invitation..." />
      );
    }

    if (
      recipientError ||
      !recipientInvitation ||
      !publicToken
    ) {
      return (
        <StatusScreen
          message="This invitation could not be opened."
          detail="The link may be invalid, or the invitation may no longer be available. Ask the person who sent it to check the link."
        />
      );
    }

    return (
      <RecipientExperience
        invitation={recipientInvitation}
        experience={buildDateExperience(
          recipientInvitation
        )}
        publicToken={publicToken}
      />
    );
  }

  /*
   * Public route: previously generated encoded invitations.
   */
  if (isLegacyRecipientLink) {
    if (!legacyInvitation) {
      return (
        <StatusScreen
          message="This invitation could not be opened."
          detail="The link may be incomplete or invalid. Ask the person who sent it to create a new one."
        />
      );
    }

    return (
      <RecipientExperience
        invitation={legacyInvitation}
        experience={buildDateExperience(
          legacyInvitation
        )}
      />
    );
  }

  /*
   * Password recovery.
   */
  if (passwordRecovery) {
    return (
      <PasswordRecoveryPanel
        onComplete={() => {
          setPasswordRecovery(false);
        }}
      />
    );
  }

  /*
   * Wait for the initial authentication check.
   */
  if (authLoading) {
    return (
      <StatusScreen message="Preparing your invitation studio..." />
    );
  }

  /*
   * Authentication screen.
   */
  if (!session) {
    return <AuthPanel />;
  }

  if (mode === "dashboard") {
    return (
      <CreatorDashboard
        invitations={creatorInvitations}
        loading={dashboardLoading}
        error={dashboardError}
        onCreate={() => {
          setInvitation({
            ...defaultInvitation,
            id: crypto.randomUUID(),
          });
          setEditingInvitationId(null);
          setMode("builder");
        }}
        onPreview={(record) => {
          setInvitation(record.invitation_data);
          setEditingInvitationId(null);
          setMode("preview");
        }}
        onViewResponse={(record) => {
          setSelectedResponse(record);
          setMode("response");
        }}
        onEdit={(record) => {
          setInvitation(record.invitation_data);
          setEditingInvitationId(record.id);
          setMode("builder");
        }}
        onRefresh={refreshCreatorInvitations}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
    );
  }

  const experience = buildDateExperience(invitation);

  /*
   * View the actual response saved by the recipient.
   */
  if (mode === "response" && selectedResponse) {
    const responseLabel = selectedResponse.response === "accepted"
      ? "They said yes."
      : "They would prefer another time.";
    const respondedAt = selectedResponse.responded_at
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(selectedResponse.responded_at))
      : null;

    return (
      <main style={{
        minHeight: "100vh",
        padding: "28px 20px",
        display: "grid",
        placeItems: "center",
        background: "#faf8f4",
        color: "#292624",
        fontFamily: "Inter, sans-serif",
      }}>
        <section style={{
          width: "min(100%, 560px)",
          padding: "clamp(24px, 5vw, 44px)",
          border: "1px solid rgba(64, 51, 44, 0.13)",
          background: "#fffdf9",
        }}>
          <p style={{ color: "#a96f5f", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Invitation response
          </p>
          <h1 style={{ margin: "12px 0", fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: "clamp(34px, 7vw, 48px)", fontWeight: 500 }}>
            {selectedResponse.invitation_data.recipient.name || "Your invitation"}
          </h1>
          <p style={{ color: "#62564f", lineHeight: 1.7 }}>
            {selectedResponse.invitation_data.question}
          </p>
          <div style={{ margin: "26px 0", padding: "20px", background: "#f7eee8", borderLeft: "3px solid #a96f5f" }}>
            <p style={{ margin: 0, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8d6659" }}>
              Their answer
            </p>
            <h2 style={{ margin: "10px 0 4px", fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: "32px", fontWeight: 500 }}>
              {responseLabel}
            </h2>
            {respondedAt && <p style={{ margin: 0, color: "#82786f", fontSize: "12px" }}>Received {respondedAt}</p>}
          </div>
          <p style={{ color: "#82786f", fontSize: "13px", lineHeight: 1.7 }}>
            {selectedResponse.response === "accepted"
              ? "Make it a good one."
              : "You can edit the invitation or make a new plan."}
          </p>
          <button type="button" onClick={() => setMode("dashboard")} style={{
            marginTop: "12px",
            minHeight: "42px",
            padding: "0 16px",
            border: "1px solid #a96f5f",
            borderRadius: "3px",
            background: "#a96f5f",
            color: "#fffaf5",
            font: "500 12px Inter, sans-serif",
            cursor: "pointer",
          }}>
            ← Back to invitations
          </button>
        </section>
      </main>
    );
  }

  /*
   * Creator preview mode.
   */
  if (mode === "preview") {
    return (
      <div className="preview-shell">
        <button
          className="preview-back-button"
          type="button"
          onClick={() => setMode("dashboard")}
        >
          Back to dashboard
        </button>

        <RecipientExperience
          invitation={invitation}
          experience={experience}
        />
      </div>
    );
  }

  /*
   * Authenticated creator builder.
   */
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode("dashboard");
          setEditingInvitationId(null);
          void refreshCreatorInvitations();
        }}
        aria-label="Return to invitation dashboard"
        style={{
          position: "fixed",
          top: "16px",
          left: "18px",
          zIndex: 1000,
          padding: "9px 14px",
          border: "1px solid #ded8d0",
          borderRadius: "6px",
          background: "#faf8f4",
          color: "#292624",
          fontFamily: "Inter, sans-serif",
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        ← Dashboard
      </button>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sign out of your account"
        style={{
          position: "fixed",
          top: "16px",
          right: "18px",
          zIndex: 1000,
          padding: "9px 14px",
          border: "1px solid #ded8d0",
          borderRadius: "6px",
          background: "#faf8f4",
          color: "#292624",
          fontFamily: "Inter, sans-serif",
          fontSize: "12px",
          cursor: signingOut ? "wait" : "pointer",
          opacity: signingOut ? 0.65 : 1,
        }}
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>

      <CreatorBuilder
        invitation={invitation}
        onChange={setInvitation}
        onPreview={() => setMode("preview")}
        onCreateLink={createInvitationLink}
      />
    </>
  );
}

export default App;
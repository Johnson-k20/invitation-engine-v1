import { supabase } from "./supabase";
import type { Invitation } from "../experience/types";

export type InvitationResponse = "accepted" | "another_time";

export type PublishedInvitation = {
  id: string;
  public_token: string;
  invitation_data: Invitation;
  status: "draft" | "published" | "archived";
  created_at: string;
  response?: InvitationResponse | null;
  responded_at?: string | null;
};

type InvitationRow = Omit<PublishedInvitation, "response" | "responded_at">;

type ResponseRow = {
  invitation_id: string;
  response: InvitationResponse;
  responded_at: string;
};

const invitationFields = "id, public_token, invitation_data, status, created_at";

async function requireCreator() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("You must sign in to manage invitations.");
  return user;
}

export async function getCreatorInvitations(): Promise<PublishedInvitation[]> {
  const user = await requireCreator();

  const { data, error } = await supabase
    .from("invitations")
    .select(invitationFields)
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const invitations = (data ?? []) as InvitationRow[];
  if (invitations.length === 0) return [];

  const ids = invitations.map((item) => item.id);
  const { data: responseData, error: responseError } = await supabase
    .from("invitation_responses")
    .select("invitation_id, response, responded_at")
    .in("invitation_id", ids);

  if (responseError) throw responseError;

  const responseByInvitation = new Map(
    ((responseData ?? []) as ResponseRow[]).map((item) => [
      item.invitation_id,
      item,
    ])
  );

  return invitations.map((item) => {
    const response = responseByInvitation.get(item.id);
    return {
      ...item,
      response: response?.response ?? null,
      responded_at: response?.responded_at ?? null,
    };
  });
}

export async function publishInvitation(
  invitation: Invitation,
  existingInvitationId?: string | null
): Promise<PublishedInvitation> {
  const user = await requireCreator();

  if (existingInvitationId) {
    const { data, error } = await supabase
      .from("invitations")
      .update({
        invitation_data: invitation,
        status: "published",
      })
      .eq("id", existingInvitationId)
      .eq("creator_id", user.id)
      .select(invitationFields)
      .single();

    if (error) throw error;
    return data as InvitationRow;
  }

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      creator_id: user.id,
      invitation_data: invitation,
      status: "published",
    })
    .select(invitationFields)
    .single();

  if (error) throw error;
  return data as InvitationRow;
}

export async function getPublishedInvitation(
  publicToken: string
): Promise<Invitation | null> {
  const { data, error } = await supabase
    .rpc("get_public_invitation", {
      p_public_token: publicToken,
    });

  if (error) throw error;
  if (!data || typeof data !== "object") return null;

  const result = data as { invitation_data?: unknown };
  if (!result.invitation_data) return null;

  return result.invitation_data as Invitation;
}

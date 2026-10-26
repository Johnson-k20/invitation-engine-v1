import { supabase } from "./supabase";
import type { Invitation } from "../experience/types";

export type PublishedInvitation = {
  id: string;
  public_token: string;
  invitation_data: Invitation;
  status: "draft" | "published" | "archived";
  created_at: string;
};

type InvitationRow = {
  id: string;
  public_token: string;
  invitation_data: Invitation;
  status: "draft" | "published" | "archived";
  created_at: string;
};

export async function publishInvitation(
  invitation: Invitation
): Promise<PublishedInvitation> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must sign in before publishing an invitation.");
  }

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      creator_id: user.id,
      invitation_data: invitation,
      status: "published",
    })
    .select("id, public_token, invitation_data, status, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as InvitationRow;
}

export async function getPublishedInvitation(
  publicToken: string
): Promise<Invitation | null> {
  const { data, error } = await supabase
    .rpc("get_public_invitation", {
      p_public_token: publicToken,
    });

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const result = data as {
    invitation_data?: unknown;
  };

  if (!result.invitation_data) {
    return null;
  }

  return result.invitation_data as Invitation;
}
import { REQUIRED_PACK_INSTITUTIONAL } from "@/shared/policy";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  ActiveTier,
  MembershipRow,
  OrganizationRow,
  ProfileRow,
} from "@/lib/supabase/types";
import type { Tier } from "@/lib/types";

export type Organization = {
  id: string;
  name: string;
  createdAt: string;
  adminAddress: string;
  memberAddresses: string[];
  requiredPackMask: number;
};

export type ProfileSummary = {
  id: string;
  walletAddress: string;
  activeTier: ActiveTier;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type SeatContext = {
  address: string | null;
  tier: Tier;
  organization: Organization | null;
  profile: ProfileSummary | null;
  configured: boolean;
};

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function tierFromActive(active: ActiveTier): Tier {
  return active === "institutional" ? "institutional" : "freelancer";
}

function toProfileSummary(row: ProfileRow): ProfileSummary {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    activeTier: row.active_tier,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
  };
}

async function loadOrganization(orgId: string): Promise<Organization | null> {
  const supabase = getSupabaseAdmin();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!org) return null;

  const orgRow = org as OrganizationRow;

  const { data: members, error: memberError } = await supabase
    .from("memberships")
    .select("wallet_address, role")
    .eq("organization_id", orgId);
  if (memberError) throw new Error(memberError.message);

  const memberRows = (members ?? []) as Pick<MembershipRow, "wallet_address" | "role">[];
  const memberAddresses = memberRows.map((m) => m.wallet_address);
  const admin =
    memberRows.find((m) => m.role === "admin")?.wallet_address ??
    memberAddresses[0] ??
    "";

  return {
    id: orgRow.id,
    name: orgRow.name,
    createdAt: orgRow.created_at,
    adminAddress: admin,
    memberAddresses,
    requiredPackMask: orgRow.required_pack_mask,
  };
}

async function organizationForProfile(profileId: string): Promise<Organization | null> {
  const supabase = getSupabaseAdmin();
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!membership) return null;
  return loadOrganization((membership as { organization_id: string }).organization_id);
}

export async function getSeatContext(address?: string | null): Promise<SeatContext> {
  if (!isSupabaseConfigured()) {
    return {
      address: address ? normalizeAddress(address) : null,
      tier: "freelancer",
      organization: null,
      profile: null,
      configured: false,
    };
  }

  if (!address?.trim()) {
    return {
      address: null,
      tier: "freelancer",
      organization: null,
      profile: null,
      configured: true,
    };
  }

  const key = normalizeAddress(address);
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet_address", key)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!profile) {
    return {
      address: key,
      tier: "freelancer",
      organization: null,
      profile: null,
      configured: true,
    };
  }

  const profileRow = profile as ProfileRow;
  const organization =
    profileRow.active_tier === "institutional"
      ? await organizationForProfile(profileRow.id)
      : null;

  return {
    address: key,
    tier: tierFromActive(profileRow.active_tier),
    organization,
    profile: toProfileSummary(profileRow),
    configured: true,
  };
}

export async function onboardSandbox(address: string): Promise<SeatContext> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const key = normalizeAddress(address);
  if (!key) throw new Error("Wallet address required.");

  const existing = await getSeatContext(key);
  if (existing.profile?.onboardingCompleted) {
    return existing;
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        wallet_address: key,
        active_tier: "sandbox",
        onboarding_completed: true,
        updated_at: now,
      },
      { onConflict: "wallet_address" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return {
    address: key,
    tier: "freelancer",
    organization: null,
    profile: toProfileSummary(profile as ProfileRow),
    configured: true,
  };
}

export async function onboardInstitutional(input: {
  name: string;
  adminAddress: string;
}): Promise<SeatContext> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const name = input.name.trim();
  const key = normalizeAddress(input.adminAddress);
  if (name.length < 2 || name.length > 64) {
    throw new Error("Organization name must be 2–64 characters.");
  }
  if (!key) throw new Error("Wallet address required to create an organization.");

  const existing = await getSeatContext(key);
  if (existing.organization) {
    throw new Error("This wallet already belongs to an organization. Leave it first.");
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        wallet_address: key,
        active_tier: "institutional",
        onboarding_completed: true,
        updated_at: now,
      },
      { onConflict: "wallet_address" },
    )
    .select("*")
    .single();
  if (profileError) throw new Error(profileError.message);
  const profileRow = profile as ProfileRow;

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      required_pack_mask: REQUIRED_PACK_INSTITUTIONAL,
    })
    .select("*")
    .single();
  if (orgError) throw new Error(orgError.message);
  const orgRow = organization as OrganizationRow;

  const { error: memberError } = await supabase.from("memberships").insert({
    profile_id: profileRow.id,
    organization_id: orgRow.id,
    role: "admin",
    wallet_address: key,
  });
  if (memberError) {
    await supabase.from("organizations").delete().eq("id", orgRow.id);
    throw new Error(memberError.message);
  }

  return {
    address: key,
    tier: "institutional",
    organization: {
      id: orgRow.id,
      name: orgRow.name,
      createdAt: orgRow.created_at,
      adminAddress: key,
      memberAddresses: [key],
      requiredPackMask: orgRow.required_pack_mask,
    },
    profile: toProfileSummary(profileRow),
    configured: true,
  };
}

/** Upgrade an existing sandbox seat to an institutional org (Identity page). */
export async function createOrganization(input: {
  name: string;
  adminAddress: string;
}): Promise<{ organization: Organization }> {
  const context = await onboardInstitutional(input);
  if (!context.organization) {
    throw new Error("Organization provisioning failed.");
  }
  return { organization: context.organization };
}

export async function leaveOrganization(address: string): Promise<SeatContext> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const key = normalizeAddress(address);
  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet_address", key)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("No profile for this wallet.");
  const profileRow = profile as ProfileRow;

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("*")
    .eq("profile_id", profileRow.id)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error("This wallet is not in an organization.");
  const membershipRow = membership as MembershipRow;

  const orgId = membershipRow.organization_id;
  const { error: deleteMemberError } = await supabase
    .from("memberships")
    .delete()
    .eq("id", membershipRow.id);
  if (deleteMemberError) throw new Error(deleteMemberError.message);

  const { count, error: countError } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);
  if (countError) throw new Error(countError.message);

  if ((count ?? 0) === 0) {
    await supabase.from("organizations").delete().eq("id", orgId);
  } else if (membershipRow.role === "admin") {
    const { data: nextAdmin } = await supabase
      .from("memberships")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .maybeSingle();
    if (nextAdmin) {
      await supabase
        .from("memberships")
        .update({ role: "admin" })
        .eq("id", (nextAdmin as { id: string }).id);
    }
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      active_tier: "sandbox",
      onboarding_completed: true,
      updated_at: now,
    })
    .eq("id", profileRow.id);
  if (updateError) throw new Error(updateError.message);

  return getSeatContext(key);
}

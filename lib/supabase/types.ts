export type ActiveTier = "sandbox" | "institutional";
export type MembershipRole = "admin" | "member";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          wallet_address: string;
          active_tier: ActiveTier;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          active_tier: ActiveTier;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          active_tier?: ActiveTier;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          required_pack_mask: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          required_pack_mask?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          required_pack_mask?: number;
        };
      };
      memberships: {
        Row: {
          id: string;
          profile_id: string;
          organization_id: string;
          role: MembershipRole;
          wallet_address: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          organization_id: string;
          role: MembershipRole;
          wallet_address: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          organization_id?: string;
          role?: MembershipRole;
          wallet_address?: string;
        };
      };
    };
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
export type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];

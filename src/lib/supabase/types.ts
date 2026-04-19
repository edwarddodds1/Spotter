import type { BadgeType, BreedRarity, FriendshipStatus } from "@/types/app";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          total_scans: number;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          total_scans?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      breeds: {
        Row: {
          id: string;
          name: string;
          rarity: BreedRarity;
          points: number;
          description: string;
          origin: string;
          temperament: string;
          size: string;
          lifespan: string;
          reference_photo_url: string | null;
        };
        Insert: Database["public"]["Tables"]["breeds"]["Row"];
        Update: Partial<Database["public"]["Tables"]["breeds"]["Insert"]>;
      };
      scans: {
        Row: {
          id: string;
          user_id: string;
          breed_id: string | null;
          photo_url: string;
          dog_name: string | null;
          dog_profile_id: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_label: string | null;
          scanned_at: string;
          is_pending_breed: boolean;
          points_awarded: number;
          matched_featured_breed: boolean;
          coat_colour_id: string | null;
          coat_colour_note: string | null;
          spot_comment: string | null;
          is_private: boolean;
        };
        Insert: Database["public"]["Tables"]["scans"]["Row"];
        Update: Partial<Database["public"]["Tables"]["scans"]["Insert"]>;
      };
      dog_profiles: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          breed_id: string;
          owner_id: string | null;
          total_scans: number;
        };
        Insert: Database["public"]["Tables"]["dog_profiles"]["Row"];
        Update: Partial<Database["public"]["Tables"]["dog_profiles"]["Insert"]>;
      };
      friendships: {
        Row: {
          user_id: string;
          friend_id: string;
          status: FriendshipStatus;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["friendships"]["Row"];
        Update: Partial<Database["public"]["Tables"]["friendships"]["Insert"]>;
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
          invite_code: string | null;
          max_members: number;
          ends_at: string | null;
        };
        Insert: Database["public"]["Tables"]["leagues"]["Row"];
        Update: Partial<Database["public"]["Tables"]["leagues"]["Insert"]>;
      };
      league_members: {
        Row: {
          league_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Database["public"]["Tables"]["league_members"]["Row"];
        Update: Partial<Database["public"]["Tables"]["league_members"]["Insert"]>;
      };
      weekly_scores: {
        Row: {
          id: string;
          user_id: string;
          league_id: string | null;
          points: number;
          week_start: string;
        };
        Insert: Database["public"]["Tables"]["weekly_scores"]["Row"];
        Update: Partial<Database["public"]["Tables"]["weekly_scores"]["Insert"]>;
      };
      badges: {
        Row: {
          id: string;
          user_id: string;
          badge_type: BadgeType;
          earned_at: string;
        };
        Insert: Database["public"]["Tables"]["badges"]["Row"];
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
      };
      featured_breeds: {
        Row: {
          id: string;
          breed_id: string;
          feature_date: string;
          is_active: boolean;
        };
        Insert: Database["public"]["Tables"]["featured_breeds"]["Row"];
        Update: Partial<Database["public"]["Tables"]["featured_breeds"]["Insert"]>;
      };
    };
  };
}

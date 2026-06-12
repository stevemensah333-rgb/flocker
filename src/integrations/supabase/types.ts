export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coops: {
        Row: {
          age_weeks: number
          breed: string | null
          count: number
          created_at: string
          farm_id: string
          id: string
          name: string
          owner_id: string
          production_type: string | null
        }
        Insert: {
          age_weeks?: number
          breed?: string | null
          count?: number
          created_at?: string
          farm_id: string
          id?: string
          name: string
          owner_id: string
          production_type?: string | null
        }
        Update: {
          age_weeks?: number
          breed?: string | null
          count?: number
          created_at?: string
          farm_id?: string
          id?: string
          name?: string
          owner_id?: string
          production_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coops_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_records: {
        Row: {
          coop_id: string | null
          created_at: string
          eggs_broken: number
          eggs_collected: number
          eggs_sold: number
          farm_id: string
          id: string
          note: string | null
          owner_id: string
          price_per_egg: number
          record_date: string
          updated_at: string
        }
        Insert: {
          coop_id?: string | null
          created_at?: string
          eggs_broken?: number
          eggs_collected?: number
          eggs_sold?: number
          farm_id: string
          id?: string
          note?: string | null
          owner_id: string
          price_per_egg?: number
          record_date?: string
          updated_at?: string
        }
        Update: {
          coop_id?: string | null
          created_at?: string
          eggs_broken?: number
          eggs_collected?: number
          eggs_sold?: number
          farm_id?: string
          id?: string
          note?: string | null
          owner_id?: string
          price_per_egg?: number
          record_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_records_coop_id_fkey"
            columns: ["coop_id"]
            isOneToOne: false
            referencedRelation: "coops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          country: string | null
          created_at: string
          egg_price: number
          id: string
          location: string | null
          name: string
          owner_id: string
          region: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          egg_price?: number
          id?: string
          location?: string | null
          name: string
          owner_id: string
          region?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          egg_price?: number
          id?: string
          location?: string | null
          name?: string
          owner_id?: string
          region?: string | null
        }
        Relationships: []
      }
      ingredient_prices: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          ingredient_name: string
          owner_id: string
          price_per_kg: number
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          ingredient_name: string
          owner_id: string
          price_per_kg?: number
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          ingredient_name?: string
          owner_id?: string
          price_per_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_prices_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarded: boolean
          phone: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarded?: boolean
          phone?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarded?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      saved_rations: {
        Row: {
          cost_per_kg: number
          created_at: string
          farm_id: string
          id: string
          name: string
          owner_id: string
          rows: Json
          stage: string | null
          updated_at: string
        }
        Insert: {
          cost_per_kg?: number
          created_at?: string
          farm_id: string
          id?: string
          name: string
          owner_id: string
          rows?: Json
          stage?: string | null
          updated_at?: string
        }
        Update: {
          cost_per_kg?: number
          created_at?: string
          farm_id?: string
          id?: string
          name?: string
          owner_id?: string
          rows?: Json
          stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_rations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

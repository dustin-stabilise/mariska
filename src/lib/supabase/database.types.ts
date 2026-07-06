export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      compliance_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          expiry_date: string | null
          id: string
          issue_date: string | null
          professional_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          professional_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          professional_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_documents_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          client_id: string
          created_at: string
          delta: number
          id: string
          note: string | null
          payment_id: string | null
          reason: Database["public"]["Enums"]["credit_reason"]
        }
        Insert: {
          client_id: string
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          payment_id?: string | null
          reason: Database["public"]["Enums"]["credit_reason"]
        }
        Update: {
          client_id?: string
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          payment_id?: string | null
          reason?: Database["public"]["Enums"]["credit_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_requests: {
        Row: {
          client_id: string
          client_notes: string | null
          created_at: string
          id: string
          payment_id: string | null
          professional_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["interview_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          client_notes?: string | null
          created_at?: string
          id?: string
          payment_id?: string | null
          professional_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_notes?: string | null
          created_at?: string
          id?: string
          payment_id?: string | null
          professional_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          metadata: Json
          paid_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          status: Database["public"]["Enums"]["payment_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          metadata?: Json
          paid_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          metadata?: Json
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          client_id: string
          created_at: string
          ended_at: string | null
          fee_amount: number
          id: string
          interview_id: string | null
          payment_id: string | null
          professional_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["placement_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          ended_at?: string | null
          fee_amount: number
          id?: string
          interview_id?: string | null
          payment_id?: string | null
          professional_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["placement_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          ended_at?: string | null
          fee_amount?: number
          id?: string
          interview_id?: string | null
          payment_id?: string | null
          professional_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["placement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interview_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          availability_confirmed_at: string
          availability_options: Database["public"]["Enums"]["availability_option"][]
          availability_status: Database["public"]["Enums"]["availability_status"]
          bio: string
          care_categories: Database["public"]["Enums"]["care_category"][]
          compliance_score: number
          compliance_status: Database["public"]["Enums"]["compliance_status"]
          created_at: string
          headline: string
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          interests: string[]
          interview_passed_at: string | null
          intro_video_url: string | null
          kind: Database["public"]["Enums"]["professional_kind"]
          languages: string[]
          location: string
          nmc_pin: string | null
          photo_url: string | null
          region: string
          status: Database["public"]["Enums"]["professional_status"]
          tier: Database["public"]["Enums"]["professional_tier"]
          updated_at: string
          years_experience: number
        }
        Insert: {
          availability_confirmed_at?: string
          availability_options?: Database["public"]["Enums"]["availability_option"][]
          availability_status?: Database["public"]["Enums"]["availability_status"]
          bio?: string
          care_categories?: Database["public"]["Enums"]["care_category"][]
          compliance_score?: number
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          headline?: string
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id: string
          interests?: string[]
          interview_passed_at?: string | null
          intro_video_url?: string | null
          kind: Database["public"]["Enums"]["professional_kind"]
          languages?: string[]
          location?: string
          nmc_pin?: string | null
          photo_url?: string | null
          region?: string
          status?: Database["public"]["Enums"]["professional_status"]
          tier?: Database["public"]["Enums"]["professional_tier"]
          updated_at?: string
          years_experience?: number
        }
        Update: {
          availability_confirmed_at?: string
          availability_options?: Database["public"]["Enums"]["availability_option"][]
          availability_status?: Database["public"]["Enums"]["availability_status"]
          bio?: string
          care_categories?: Database["public"]["Enums"]["care_category"][]
          compliance_score?: number
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          headline?: string
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          interests?: string[]
          interview_passed_at?: string | null
          intro_video_url?: string | null
          kind?: Database["public"]["Enums"]["professional_kind"]
          languages?: string[]
          location?: string
          nmc_pin?: string | null
          photo_url?: string | null
          region?: string
          status?: Database["public"]["Enums"]["professional_status"]
          tier?: Database["public"]["Enums"]["professional_tier"]
          updated_at?: string
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_unlocks: {
        Row: {
          client_id: string
          expires_at: string
          id: string
          professional_id: string
          unlocked_at: string
        }
        Insert: {
          client_id: string
          expires_at?: string
          id?: string
          professional_id: string
          unlocked_at?: string
        }
        Update: {
          client_id?: string
          expires_at?: string
          id?: string
          professional_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_unlocks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_unlocks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_unlocks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          id: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["referral_kind"]
          paid_at: string | null
          referred_email: string
          referred_professional_id: string | null
          referrer_id: string
          reward_amount: number | null
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["referral_kind"]
          paid_at?: string | null
          referred_email: string
          referred_professional_id?: string | null
          referrer_id: string
          reward_amount?: number | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["referral_kind"]
          paid_at?: string | null
          referred_email?: string
          referred_professional_id?: string | null
          referrer_id?: string
          reward_amount?: number | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_professional_id_fkey"
            columns: ["referred_professional_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_professional_id_fkey"
            columns: ["referred_professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          document_id: string | null
          id: string
          kind: string
          professional_id: string
          sent_at: string
        }
        Insert: {
          document_id?: string | null
          id?: string
          kind: string
          professional_id: string
          sent_at?: string
        }
        Update: {
          document_id?: string | null
          id?: string
          kind?: string
          professional_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_log_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_log_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      retainer_subscriptions: {
        Row: {
          cancelled_at: string | null
          client_id: string
          created_at: string
          current_period_end: string | null
          id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          provider: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retainer_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      safeguarding_flags: {
        Row: {
          created_at: string
          details: string
          id: string
          professional_id: string
          raised_by: string | null
          reason: Database["public"]["Enums"]["flag_reason"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["flag_status"]
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          professional_id: string
          raised_by?: string | null
          reason: Database["public"]["Enums"]["flag_reason"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["flag_status"]
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          professional_id?: string
          raised_by?: string | null
          reason?: Database["public"]["Enums"]["flag_reason"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["flag_status"]
        }
        Relationships: [
          {
            foreignKeyName: "safeguarding_flags_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safeguarding_flags_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safeguarding_flags_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      professional_cards: {
        Row: {
          availability_options:
            | Database["public"]["Enums"]["availability_option"][]
            | null
          availability_status:
            | Database["public"]["Enums"]["availability_status"]
            | null
          care_categories: Database["public"]["Enums"]["care_category"][] | null
          first_name: string | null
          headline: string | null
          id: string | null
          kind: Database["public"]["Enums"]["professional_kind"] | null
          languages: string[] | null
          location: string | null
          region: string | null
          tier: Database["public"]["Enums"]["professional_tier"] | null
          years_experience: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      compute_compliance: {
        Args: { p_professional_id: string }
        Returns: undefined
      }
      confirm_availability: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      my_credit_balance: { Args: never; Returns: number }
      unlock_profile: {
        Args: { p_professional_id: string }
        Returns: {
          client_id: string
          expires_at: string
          id: string
          professional_id: string
          unlocked_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profile_unlocks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      availability_option:
        | "live_in"
        | "full_time"
        | "part_time"
        | "day_shifts"
        | "night_shifts"
        | "weekends"
        | "temporary"
        | "long_term"
      availability_status: "available" | "limited" | "unavailable"
      care_category:
        | "live_in"
        | "day"
        | "night"
        | "dementia"
        | "end_of_life"
        | "complex"
        | "respite"
        | "companionship"
        | "general_nurse"
        | "community_nurse"
        | "dementia_nurse"
        | "palliative_nurse"
        | "complex_nurse"
        | "learning_disability_nurse"
        | "mental_health_nurse"
      compliance_status: "red" | "amber" | "green"
      credit_reason:
        | "purchase"
        | "retainer_grant"
        | "admin_grant"
        | "unlock"
        | "refund"
      document_status: "pending_review" | "approved" | "rejected"
      document_type:
        | "photo_id"
        | "proof_of_address"
        | "photo"
        | "dbs"
        | "right_to_work"
        | "cv"
        | "qualification"
        | "training_certificate"
        | "reference"
        | "insurance"
        | "nmc_registration"
        | "other"
      flag_reason:
        | "complaint"
        | "missed_interview"
        | "poor_reviews"
        | "safeguarding"
      flag_status: "open" | "in_review" | "resolved" | "dismissed"
      interview_status:
        | "requested"
        | "accepted"
        | "scheduled"
        | "completed"
        | "declined"
        | "cancelled"
      payment_kind:
        | "credit_pack"
        | "interview_fee"
        | "placement_fee"
        | "retainer"
      payment_provider: "stripe" | "test_bypass" | "manual"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      placement_status: "pending" | "active" | "ended" | "replaced"
      professional_kind: "carer" | "nurse"
      professional_status:
        | "applied"
        | "in_review"
        | "active"
        | "suspended"
        | "rejected"
      professional_tier: "none" | "bronze" | "silver" | "gold" | "platinum"
      referral_kind: "carer" | "specialist_carer" | "nurse"
      referral_status: "invited" | "registered" | "compliant" | "paid"
      subscription_status: "active" | "past_due" | "cancelled"
      user_role: "client" | "professional" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      availability_option: [
        "live_in",
        "full_time",
        "part_time",
        "day_shifts",
        "night_shifts",
        "weekends",
        "temporary",
        "long_term",
      ],
      availability_status: ["available", "limited", "unavailable"],
      care_category: [
        "live_in",
        "day",
        "night",
        "dementia",
        "end_of_life",
        "complex",
        "respite",
        "companionship",
        "general_nurse",
        "community_nurse",
        "dementia_nurse",
        "palliative_nurse",
        "complex_nurse",
        "learning_disability_nurse",
        "mental_health_nurse",
      ],
      compliance_status: ["red", "amber", "green"],
      credit_reason: [
        "purchase",
        "retainer_grant",
        "admin_grant",
        "unlock",
        "refund",
      ],
      document_status: ["pending_review", "approved", "rejected"],
      document_type: [
        "photo_id",
        "proof_of_address",
        "photo",
        "dbs",
        "right_to_work",
        "cv",
        "qualification",
        "training_certificate",
        "reference",
        "insurance",
        "nmc_registration",
        "other",
      ],
      flag_reason: [
        "complaint",
        "missed_interview",
        "poor_reviews",
        "safeguarding",
      ],
      flag_status: ["open", "in_review", "resolved", "dismissed"],
      interview_status: [
        "requested",
        "accepted",
        "scheduled",
        "completed",
        "declined",
        "cancelled",
      ],
      payment_kind: [
        "credit_pack",
        "interview_fee",
        "placement_fee",
        "retainer",
      ],
      payment_provider: ["stripe", "test_bypass", "manual"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      placement_status: ["pending", "active", "ended", "replaced"],
      professional_kind: ["carer", "nurse"],
      professional_status: [
        "applied",
        "in_review",
        "active",
        "suspended",
        "rejected",
      ],
      professional_tier: ["none", "bronze", "silver", "gold", "platinum"],
      referral_kind: ["carer", "specialist_carer", "nurse"],
      referral_status: ["invited", "registered", "compliant", "paid"],
      subscription_status: ["active", "past_due", "cancelled"],
      user_role: ["client", "professional", "admin"],
    },
  },
} as const


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
    PostgrestVersion: "14.4"
  }
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: number | null
          entity_type: string
          id: number
          tenant_id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id?: number | null
          entity_type: string
          id?: number
          tenant_id: number
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: number | null
          entity_type?: string
          id?: number
          tenant_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          content: Json
          created_at: string
          id: number
          position: number
          section_id: number
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: number
          position?: number
          section_id: number
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: number
          position?: number
          section_id?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string | null
          body: string | null
          created_at: string
          excerpt: string | null
          id: number
          image_id: number | null
          image_url: string | null
          is_published: boolean
          published_at: string | null
          slug: string | null
          tenant_id: number
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          slug?: string | null
          tenant_id: number
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          slug?: string | null
          tenant_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          party_size: number
          service_label: string | null
          special_notes: string | null
          status: string
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          service_label?: string | null
          special_notes?: string | null
          status?: string
          tenant_id: number
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          service_label?: string | null
          special_notes?: string | null
          status?: string
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_events: {
        Row: {
          city: string | null
          created_at: string
          date: string
          description: string | null
          id: number
          image_id: number | null
          image_url: string | null
          is_active: boolean
          name: string
          tenant_id: number
          ticket_url: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_active?: boolean
          name: string
          tenant_id: number
          ticket_url?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_active?: boolean
          name?: string
          tenant_id?: number
          ticket_url?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_events_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          data: Json
          event_type: string
          id: number
          tenant_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          event_type: string
          id?: number
          tenant_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          event_type?: string
          id?: number
          tenant_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_defaults: {
        Row: {
          default_enabled: boolean
          id: number
          key: string
          plan_tier: string
        }
        Insert: {
          default_enabled?: boolean
          id?: number
          key: string
          plan_tier: string
        }
        Update: {
          default_enabled?: boolean
          id?: number
          key?: string
          plan_tier?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          id: number
          key: string
          tenant_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: number
          key: string
          tenant_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: number
          key?: string
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          filename: string
          id: number
          metadata: Json
          tenant_id: number
          url: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: number
          metadata?: Json
          tenant_id: number
          url: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: number
          metadata?: Json
          tenant_id?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_page_associations: {
        Row: {
          created_at: string
          id: number
          media_id: number
          page_id: number
          position: number | null
          updated_at: string
          usage_type: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          media_id: number
          page_id: number
          position?: number | null
          updated_at?: string
          usage_type?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          media_id?: number
          page_id?: number
          position?: number | null
          updated_at?: string
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_page_associations_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_page_associations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: number
          role: string
          tenant_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role?: string
          tenant_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string
          tenant_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          feature_key: string | null
          id: number
          is_homepage: boolean | null
          is_published: boolean
          page_config: Json | null
          page_type: string | null
          slug: string
          sort_order: number | null
          tenant_id: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_key?: string | null
          id?: number
          is_homepage?: boolean | null
          is_published?: boolean
          page_config?: Json | null
          page_type?: string | null
          slug: string
          sort_order?: number | null
          tenant_id: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_key?: string | null
          id?: number
          is_homepage?: boolean | null
          is_published?: boolean
          page_config?: Json | null
          page_type?: string | null
          slug?: string
          sort_order?: number | null
          tenant_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: number
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: number
          namespace: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: number
          namespace: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: number
          namespace?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: number
          image_id: number | null
          image_url: string | null
          is_active: boolean
          link: string | null
          sort_order: number
          tenant_id: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort_order?: number
          tenant_id: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort_order?: number
          tenant_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          anchor_slug: string | null
          created_at: string
          id: number
          page_id: number
          position: number
          type: string
          updated_at: string
        }
        Insert: {
          anchor_slug?: string | null
          created_at?: string
          id?: number
          page_id: number
          position?: number
          type?: string
          updated_at?: string
        }
        Update: {
          anchor_slug?: string | null
          created_at?: string
          id?: number
          page_id?: number
          position?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: number
          namespace: string
          tenant_id: number
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: number
          namespace: string
          tenant_id: number
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: number
          namespace?: string
          tenant_id?: number
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: number
          price_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tenant_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: number
          price_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tenant_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: number
          price_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string
          id: number
          image_id: number | null
          image_url: string | null
          is_active: boolean
          name: string
          role: string | null
          sort_order: number
          tenant_id: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_active?: boolean
          name: string
          role?: string | null
          sort_order?: number
          tenant_id: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: number
          image_id?: number | null
          image_url?: string | null
          is_active?: boolean
          name?: string
          role?: string | null
          sort_order?: number
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: number
          integration_type: string
          tenant_id: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: number
          integration_type: string
          tenant_id: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: number
          integration_type?: string
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          admin_enabled: boolean
          branding: Json | null
          created_at: string
          domain: string
          from_email: string | null
          id: number
          name: string
          nav_config: Json | null
          plan: string
          slug: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          admin_enabled?: boolean
          branding?: Json | null
          created_at?: string
          domain: string
          from_email?: string | null
          id?: number
          name: string
          nav_config?: Json | null
          plan?: string
          slug?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_enabled?: boolean
          branding?: Json | null
          created_at?: string
          domain?: string
          from_email?: string | null
          id?: number
          name?: string
          nav_config?: Json | null
          plan?: string
          slug?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_id: number | null
          avatar_url: string | null
          content: string
          created_at: string
          id: number
          is_active: boolean
          name: string
          rating: number | null
          role: string | null
          tenant_id: number
          updated_at: string
        }
        Insert: {
          avatar_id?: number | null
          avatar_url?: string | null
          content: string
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          rating?: number | null
          role?: string | null
          tenant_id: number
          updated_at?: string
        }
        Update: {
          avatar_id?: number | null
          avatar_url?: string | null
          content?: string
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          rating?: number | null
          role?: string | null
          tenant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_of: { Args: { p_tenant_id: number }; Returns: boolean }
      is_member_of: { Args: { p_tenant_id: number }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: number;
          name: string;
          domain: string;
          from_email: string | null;
          stripe_customer_id: string | null;
          plan: string;
          admin_enabled: boolean;
          branding: Json;
          nav_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          domain: string;
          from_email?: string | null;
          stripe_customer_id?: string | null;
          plan?: string;
          admin_enabled?: boolean;
          branding?: Json;
          nav_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          domain?: string;
          from_email?: string | null;
          stripe_customer_id?: string | null;
          plan?: string;
          admin_enabled?: boolean;
          branding?: Json;
          nav_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: number;
          user_id: string;
          tenant_id: number;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          tenant_id: number;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          tenant_id?: number;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      pages: {
        Row: {
          id: number;
          tenant_id: number;
          slug: string;
          title: string;
          is_published: boolean;
          is_homepage: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: number;
          slug: string;
          title: string;
          is_published?: boolean;
          is_homepage?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: number;
          slug?: string;
          title?: string;
          is_published?: boolean;
          is_homepage?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      sections: {
        Row: {
          id: number;
          page_id: number;
          type: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          page_id: number;
          type?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          page_id?: number;
          type?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          }
        ];
      };
      blocks: {
        Row: {
          id: number;
          section_id: number;
          type: string;
          content: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          section_id: number;
          type: string;
          content?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          section_id?: number;
          type?: string;
          content?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          }
        ];
      };
      media: {
        Row: {
          id: number;
          tenant_id: number;
          url: string;
          filename: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: number;
          url: string;
          filename: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: number;
          url?: string;
          filename?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      media_page_associations: {
        Row: {
          id: number;
          media_id: number;
          page_id: number;
          usage_type: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          media_id: number;
          page_id: number;
          usage_type?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          media_id?: number;
          page_id?: number;
          usage_type?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_page_associations_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_page_associations_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          id: number;
          tenant_id: number;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status: string;
          price_id: string;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: number;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          status?: string;
          price_id: string;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: number;
          stripe_subscription_id?: string;
          stripe_customer_id?: string;
          status?: string;
          price_id?: string;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      feature_flags: {
        Row: {
          id: number;
          tenant_id: number;
          key: string;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: number;
          key: string;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: number;
          key?: string;
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      feature_flag_defaults: {
        Row: {
          id: number;
          plan_tier: string;
          key: string;
          default_enabled: boolean;
        };
        Insert: {
          id?: number;
          plan_tier: string;
          key: string;
          default_enabled?: boolean;
        };
        Update: {
          id?: number;
          plan_tier?: string;
          key?: string;
          default_enabled?: boolean;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: number;
          tenant_id: number;
          event_type: string;
          user_id: string | null;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: number;
          event_type: string;
          user_id?: string | null;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: number;
          event_type?: string;
          user_id?: string | null;
          data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: number;
          tenant_id: number;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: number | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: number;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: number | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: number;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: number | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      tenant_integrations: {
        Row: {
          id: number;
          tenant_id: number;
          integration_type: string;
          config: Json;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: number;
          integration_type: string;
          config?: Json;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: number;
          integration_type?: string;
          config?: Json;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      platform_admins: {
        Row: {
          id: number;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}

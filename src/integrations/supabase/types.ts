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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      action_audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      artisan_skills: {
        Row: {
          artisan_id: string
          created_at: string
          id: string
          level: string
          notes: string | null
          skill: string
        }
        Insert: {
          artisan_id: string
          created_at?: string
          id?: string
          level?: string
          notes?: string | null
          skill: string
        }
        Update: {
          artisan_id?: string
          created_at?: string
          id?: string
          level?: string
          notes?: string | null
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "artisan_skills_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
      }
      artisans: {
        Row: {
          bio: string
          craft: string
          created_at: string
          id: string
          name: string
          photo_public_id: string | null
          photo_url: string | null
          preferred_language: string
          shg_id: string
        }
        Insert: {
          bio?: string
          craft: string
          created_at?: string
          id?: string
          name: string
          photo_public_id?: string | null
          photo_url?: string | null
          preferred_language?: string
          shg_id: string
        }
        Update: {
          bio?: string
          craft?: string
          created_at?: string
          id?: string
          name?: string
          photo_public_id?: string | null
          photo_url?: string | null
          preferred_language?: string
          shg_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artisans_shg_id_fkey"
            columns: ["shg_id"]
            isOneToOne: false
            referencedRelation: "shgs"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_requests: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          request_code: string
          status: string
          structured: Json
          title: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          request_code: string
          status?: string
          structured?: Json
          title: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          request_code?: string
          status?: string
          structured?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          intended_use: string | null
          org_name: string
          region: string | null
          user_id: string | null
          verification_status: string
        }
        Insert: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intended_use?: string | null
          org_name: string
          region?: string | null
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intended_use?: string | null
          org_name?: string
          region?: string | null
          user_id?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      craft_guides: {
        Row: {
          category: string | null
          craft: string
          created_at: string
          id: string
          language: string
          source: string
          steps: Json
          title: string
        }
        Insert: {
          category?: string | null
          craft: string
          created_at?: string
          id?: string
          language?: string
          source?: string
          steps?: Json
          title: string
        }
        Update: {
          category?: string | null
          craft?: string
          created_at?: string
          id?: string
          language?: string
          source?: string
          steps?: Json
          title?: string
        }
        Relationships: []
      }
      craft_stories: {
        Row: {
          ai_assisted: boolean
          approved_at: string | null
          approved_by: string | null
          artisan_id: string | null
          body: string
          created_at: string
          id: string
          language: string
          original_notes: string | null
          product_id: string | null
          shg_id: string | null
          source_notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_assisted?: boolean
          approved_at?: string | null
          approved_by?: string | null
          artisan_id?: string | null
          body: string
          created_at?: string
          id?: string
          language?: string
          original_notes?: string | null
          product_id?: string | null
          shg_id?: string | null
          source_notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_assisted?: boolean
          approved_at?: string | null
          approved_by?: string | null
          artisan_id?: string | null
          body?: string
          created_at?: string
          id?: string
          language?: string
          original_notes?: string | null
          product_id?: string | null
          shg_id?: string | null
          source_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "craft_stories_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craft_stories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_requests: {
        Row: {
          brief: string
          created_at: string
          customer_reference: string
          id: string
          language: string
          request_code: string
          shg_id: string | null
          status: string
          structured: Json
          title: string
          updated_at: string
        }
        Insert: {
          brief: string
          created_at?: string
          customer_reference: string
          id?: string
          language?: string
          request_code: string
          shg_id?: string | null
          status?: string
          structured?: Json
          title: string
          updated_at?: string
        }
        Update: {
          brief?: string
          created_at?: string
          customer_reference?: string
          id?: string
          language?: string
          request_code?: string
          shg_id?: string | null
          status?: string
          structured?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_requests_shg_id_fkey"
            columns: ["shg_id"]
            isOneToOne: false
            referencedRelation: "shgs"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          artisan_id: string | null
          category: string
          id: string
          note: string | null
          order_id: string | null
          recorded_at: string
          recorded_by: string | null
          shg_id: string
        }
        Insert: {
          amount: number
          artisan_id?: string | null
          category: string
          id?: string
          note?: string | null
          order_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          shg_id: string
        }
        Update: {
          amount?: number
          artisan_id?: string | null
          category?: string
          id?: string
          note?: string | null
          order_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          shg_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shg_id_fkey"
            columns: ["shg_id"]
            isOneToOne: false
            referencedRelation: "shgs"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          artisan_id: string | null
          created_at: string
          id: string
          member_role: string
          shg_id: string
          user_id: string | null
        }
        Insert: {
          artisan_id?: string | null
          created_at?: string
          id?: string
          member_role?: string
          shg_id: string
          user_id?: string | null
        }
        Update: {
          artisan_id?: string | null
          created_at?: string
          id?: string
          member_role?: string
          shg_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_shg_id_fkey"
            columns: ["shg_id"]
            isOneToOne: false
            referencedRelation: "shgs"
            referencedColumns: ["id"]
          },
        ]
      }
      material_price_history: {
        Row: {
          id: string
          material_id: string | null
          material_name: string
          note: string | null
          recorded_at: string
          recorded_by: string | null
          shg_id: string
          source: string | null
          unit: string | null
          unit_price_inr: number
        }
        Insert: {
          id?: string
          material_id?: string | null
          material_name: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          shg_id: string
          source?: string | null
          unit?: string | null
          unit_price_inr: number
        }
        Update: {
          id?: string
          material_id?: string | null
          material_name?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          shg_id?: string
          source?: string | null
          unit?: string | null
          unit_price_inr?: number
        }
        Relationships: []
      }
      materials_inventory: {
        Row: {
          id: string
          low_stock_threshold: number | null
          name: string
          quantity: number
          shg_id: string
          unit: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          low_stock_threshold?: number | null
          name: string
          quantity?: number
          shg_id: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          low_stock_threshold?: number | null
          name?: string
          quantity?: number
          shg_id?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_inventory_shg_id_fkey"
            columns: ["shg_id"]
            isOneToOne: false
            referencedRelation: "shgs"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          public_id: string
          purpose: string
          secure_url: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          public_id: string
          purpose?: string
          secure_url: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          public_id?: string
          purpose?: string
          secure_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          audience_ref: string | null
          body: string | null
          created_at: string
          event_type: string
          id: string
          link: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          audience: string
          audience_ref?: string | null
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          audience?: string
          audience_ref?: string | null
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      order_assignments: {
        Row: {
          artisan_id: string
          assigned_at: string
          assigned_by: string
          id: string
          order_id: string
        }
        Insert: {
          artisan_id: string
          assigned_at?: string
          assigned_by?: string
          id?: string
          order_id: string
        }
        Update: {
          artisan_id?: string
          assigned_at?: string
          assigned_by?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          note: string | null
          order_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          order_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_request_id: string | null
          created_at: string
          customer_reference: string
          expected_dispatch_at: string | null
          id: string
          is_custom: boolean
          product_id: string
          proposal_id: string | null
          quantity: number
          source: string
          status: string
        }
        Insert: {
          buyer_request_id?: string | null
          created_at?: string
          customer_reference: string
          expected_dispatch_at?: string | null
          id?: string
          is_custom?: boolean
          product_id: string
          proposal_id?: string | null
          quantity?: number
          source?: string
          status?: string
        }
        Update: {
          buyer_request_id?: string | null
          created_at?: string
          customer_reference?: string
          expected_dispatch_at?: string | null
          id?: string
          is_custom?: boolean
          product_id?: string
          proposal_id?: string | null
          quantity?: number
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_request_id_fkey"
            columns: ["buyer_request_id"]
            isOneToOne: false
            referencedRelation: "buyer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          artisan_id: string | null
          created_at: string
          direction: string
          id: string
          method: string
          note: string | null
          order_id: string | null
          shg_id: string | null
          status: string
          upi_reference: string | null
        }
        Insert: {
          amount: number
          artisan_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          method?: string
          note?: string | null
          order_id?: string | null
          shg_id?: string | null
          status?: string
          upi_reference?: string | null
        }
        Update: {
          amount?: number
          artisan_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          method?: string
          note?: string | null
          order_id?: string | null
          shg_id?: string | null
          status?: string
          upi_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shg_id_fkey"
            columns: ["shg_id"]
            isOneToOne: false
            referencedRelation: "shgs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_inputs: {
        Row: {
          created_at: string
          id: string
          material_name: string
          product_id: string
          quantity_per_unit: number
          shg_id: string | null
          unit: string | null
          unit_cost_inr: number
          wastage_percent: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_name: string
          product_id: string
          quantity_per_unit?: number
          shg_id?: string | null
          unit?: string | null
          unit_cost_inr?: number
          wastage_percent?: number
        }
        Update: {
          created_at?: string
          id?: string
          material_name?: string
          product_id?: string
          quantity_per_unit?: number
          shg_id?: string | null
          unit?: string | null
          unit_cost_inr?: number
          wastage_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_inputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_snapshots: {
        Row: {
          breakdown: Json
          created_at: string
          created_by: string | null
          currency: string
          id: string
          product_id: string
          version: number
        }
        Insert: {
          breakdown: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          product_id: string
          version: number
        }
        Update: {
          breakdown?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          product_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_drafts: {
        Row: {
          artisan_id: string
          category: string | null
          description: string | null
          name: string | null
          price: number | null
          updated_at: string
        }
        Insert: {
          artisan_id: string
          category?: string | null
          description?: string | null
          name?: string | null
          price?: number | null
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          category?: string | null
          description?: string | null
          name?: string | null
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_drafts_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: true
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
      }
      product_labour_inputs: {
        Row: {
          created_at: string
          hours_per_unit: number
          id: string
          product_id: string
          rate_inr_per_hour: number | null
          rate_source: string | null
          stage_name: string
        }
        Insert: {
          created_at?: string
          hours_per_unit?: number
          id?: string
          product_id: string
          rate_inr_per_hour?: number | null
          rate_source?: string | null
          stage_name: string
        }
        Update: {
          created_at?: string
          hours_per_unit?: number
          id?: string
          product_id?: string
          rate_inr_per_hour?: number | null
          rate_source?: string | null
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_labour_inputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_signals: {
        Row: {
          created_at: string
          id: string
          product_id: string
          recorded_by: string
          signal_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          recorded_by?: string
          signal_type: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          recorded_by?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_signals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_events: {
        Row: {
          id: string
          note: string | null
          occurred_at: string
          plan_id: string
          recorded_by: string | null
          stage: string
        }
        Insert: {
          id?: string
          note?: string | null
          occurred_at?: string
          plan_id: string
          recorded_by?: string | null
          stage: string
        }
        Update: {
          id?: string
          note?: string | null
          occurred_at?: string
          plan_id?: string
          recorded_by?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "production_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plans: {
        Row: {
          created_at: string
          id: string
          order_id: string
          stages: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          stages?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          stages?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_plans_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          artisan_id: string
          availability: boolean
          category: string
          created_at: string
          description: string
          id: string
          image_public_id: string | null
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          artisan_id: string
          availability?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_public_id?: string | null
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          artisan_id?: string
          availability?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_public_id?: string | null
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          onboarding_status: string
          preferred_language: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_status?: string
          preferred_language?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_status?: string
          preferred_language?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      proposal_approvals: {
        Row: {
          approved_at: string
          approver_role: string
          id: string
          proposal_id: string
        }
        Insert: {
          approved_at?: string
          approver_role: string
          id?: string
          proposal_id: string
        }
        Update: {
          approved_at?: string
          approver_role?: string
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_approvals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string
          created_by: string
          id: string
          request_id: string
          spec: Json
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          request_id: string
          spec?: Json
          status?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          request_id?: string
          spec?: Json
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "custom_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_checks: {
        Row: {
          artisan_id: string | null
          checked_at: string
          checked_by: string | null
          id: string
          notes: string | null
          order_id: string
          result: string
        }
        Insert: {
          artisan_id?: string | null
          checked_at?: string
          checked_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          result: string
        }
        Update: {
          artisan_id?: string | null
          checked_at?: string
          checked_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_checks_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_versions: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          id: string
          quotation_id: string
          spec: Json
          status: string
          version: number
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          quotation_id: string
          spec: Json
          status?: string
          version: number
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          quotation_id?: string
          spec?: Json
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_versions_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          buyer_request_id: string
          created_at: string
          id: string
          shg_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_request_id: string
          created_at?: string
          id?: string
          shg_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_request_id?: string
          created_at?: string
          id?: string
          shg_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_buyer_request_id_fkey"
            columns: ["buyer_request_id"]
            isOneToOne: false
            referencedRelation: "buyer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_events: {
        Row: {
          event_type: string
          id: string
          note: string | null
          occurred_at: string
          sample_id: string
        }
        Insert: {
          event_type: string
          id?: string
          note?: string | null
          occurred_at?: string
          sample_id: string
        }
        Update: {
          event_type?: string
          id?: string
          note?: string | null
          occurred_at?: string
          sample_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_events_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "sample_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_requests: {
        Row: {
          buyer_id: string | null
          buyer_request_id: string | null
          created_at: string
          fee_inr: number
          feedback: string | null
          id: string
          quotation_id: string | null
          shg_id: string | null
          spec: Json
          spec_version: number
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          buyer_request_id?: string | null
          created_at?: string
          fee_inr?: number
          feedback?: string | null
          id?: string
          quotation_id?: string | null
          shg_id?: string | null
          spec?: Json
          spec_version?: number
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          buyer_request_id?: string | null
          created_at?: string
          fee_inr?: number
          feedback?: string | null
          id?: string
          quotation_id?: string | null
          shg_id?: string | null
          spec?: Json
          spec_version?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_requests_buyer_request_id_fkey"
            columns: ["buyer_request_id"]
            isOneToOne: false
            referencedRelation: "buyer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_requests_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      shgs: {
        Row: {
          created_at: string
          id: string
          monthly_capacity: number | null
          name: string
          preferred_language: string
          region: string
          upi_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_capacity?: number | null
          name: string
          preferred_language?: string
          region: string
          upi_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          monthly_capacity?: number | null
          name?: string
          preferred_language?: string
          region?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      shipment_events: {
        Row: {
          event_type: string
          id: string
          note: string | null
          occurred_at: string
          shipment_id: string
        }
        Insert: {
          event_type: string
          id?: string
          note?: string | null
          occurred_at?: string
          shipment_id: string
        }
        Update: {
          event_type?: string
          id?: string
          note?: string | null
          occurred_at?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          id: string
          order_id: string
          provider: string | null
          status: string
          tracking_ref: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          id?: string
          order_id: string
          provider?: string | null
          status?: string
          tracking_ref?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          id?: string
          order_id?: string
          provider?: string | null
          status?: string
          tracking_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      story_consents: {
        Row: {
          consent_type: string
          granted: boolean
          id: string
          story_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          consent_type: string
          granted?: boolean
          id?: string
          story_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          consent_type?: string
          granted?: boolean
          id?: string
          story_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_consents_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "craft_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount: number
          artisan_id: string
          created_at: string
          id: string
          payment_status: string
        }
        Insert: {
          amount: number
          artisan_id: string
          created_at?: string
          id?: string
          payment_status?: string
        }
        Update: {
          amount?: number
          artisan_id?: string
          created_at?: string
          id?: string
          payment_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_artisan: {
        Args: { _artisan_id: string; _user_id: string }
        Returns: boolean
      }
      is_shg_coordinator: {
        Args: { _shg_id: string; _user_id: string }
        Returns: boolean
      }
      owns_buyer: {
        Args: { _buyer_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "artisan" | "customer" | "buyer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordinator", "artisan", "customer", "buyer"],
    },
  },
} as const

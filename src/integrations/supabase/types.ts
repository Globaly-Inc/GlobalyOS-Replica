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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounting_audit_events: {
        Row: {
          action: string
          actor_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          idempotency_key: string | null
          ledger_id: string | null
          office_id: string | null
          organization_id: string
        }
        Insert: {
          action: string
          actor_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          idempotency_key?: string | null
          ledger_id?: string | null
          office_id?: string | null
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          idempotency_key?: string | null
          ledger_id?: string | null
          office_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_audit_events_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bill_lines: {
        Row: {
          account_id: string
          amount: number
          bill_id: string
          description: string
          id: string
          quantity: number
          sort_order: number
          tax_amount: number
          tax_rate_id: string | null
          unit_price: number
        }
        Insert: {
          account_id: string
          amount?: number
          bill_id: string
          description: string
          id?: string
          quantity?: number
          sort_order?: number
          tax_amount?: number
          tax_rate_id?: string | null
          unit_price?: number
        }
        Update: {
          account_id?: string
          amount?: number
          bill_id?: string
          description?: string
          id?: string
          quantity?: number
          sort_order?: number
          tax_amount?: number
          tax_rate_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "accounting_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bill_lines_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bill_payments: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          date: string
          id: string
          journal_id: string | null
          method: string
          reference: string | null
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          date?: string
          id?: string
          journal_id?: string | null
          method?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          date?: string
          id?: string
          journal_id?: string | null
          method?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "accounting_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bill_payments_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bills: {
        Row: {
          amount_due: number | null
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          bill_number: string
          contact_id: string | null
          created_at: string
          created_by: string
          currency: string
          date: string
          due_date: string
          id: string
          ledger_id: string
          notes: string | null
          office_id: string
          organization_id: string
          reference: string | null
          status: Database["public"]["Enums"]["accounting_bill_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          bill_number: string
          contact_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          date?: string
          due_date?: string
          id?: string
          ledger_id: string
          notes?: string | null
          office_id: string
          organization_id: string
          reference?: string | null
          status?: Database["public"]["Enums"]["accounting_bill_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          bill_number?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          date?: string
          due_date?: string
          id?: string
          ledger_id?: string
          notes?: string | null
          office_id?: string
          organization_id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["accounting_bill_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bills_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "accounting_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bills_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bills_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_contacts: {
        Row: {
          billing_address: Json | null
          contact_type: Database["public"]["Enums"]["accounting_contact_type"]
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: Json | null
          contact_type?: Database["public"]["Enums"]["accounting_contact_type"]
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: Json | null
          contact_type?: Database["public"]["Enums"]["accounting_contact_type"]
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_invoice_lines: {
        Row: {
          account_id: string
          amount: number
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          tax_amount: number
          tax_rate_id: string | null
          unit_price: number
        }
        Insert: {
          account_id: string
          amount?: number
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          tax_amount?: number
          tax_rate_id?: string | null
          unit_price?: number
        }
        Update: {
          account_id?: string
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          tax_amount?: number
          tax_rate_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "accounting_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoice_lines_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_invoice_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          invoice_id: string
          journal_id: string | null
          method: string
          reference: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          invoice_id: string
          journal_id?: string | null
          method?: string
          reference?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          invoice_id?: string
          journal_id?: string | null
          method?: string
          reference?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "accounting_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoice_payments_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          currency: string
          date: string
          due_date: string
          id: string
          invoice_number: string
          is_recurring: boolean
          ledger_id: string
          notes: string | null
          office_id: string
          organization_id: string
          recurrence_rule: Json | null
          reference: string | null
          status: Database["public"]["Enums"]["accounting_invoice_status"]
          stripe_payment_link_id: string | null
          subtotal: number
          tax_total: number
          terms: string | null
          total: number
          updated_at: string
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          date?: string
          due_date?: string
          id?: string
          invoice_number: string
          is_recurring?: boolean
          ledger_id: string
          notes?: string | null
          office_id: string
          organization_id: string
          recurrence_rule?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["accounting_invoice_status"]
          stripe_payment_link_id?: string | null
          subtotal?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          date?: string
          due_date?: string
          id?: string
          invoice_number?: string
          is_recurring?: boolean
          ledger_id?: string
          notes?: string | null
          office_id?: string
          organization_id?: string
          recurrence_rule?: Json | null
          reference?: string | null
          status?: Database["public"]["Enums"]["accounting_invoice_status"]
          stripe_payment_link_id?: string | null
          subtotal?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "accounting_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ledgers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          setup_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          setup_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ledgers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ledgers_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "accounting_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_setup_offices: {
        Row: {
          id: string
          office_id: string
          setup_id: string
        }
        Insert: {
          id?: string
          office_id: string
          setup_id: string
        }
        Update: {
          id?: string
          office_id?: string
          setup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_setup_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_setup_offices_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "accounting_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_setups: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          scope_type: Database["public"]["Enums"]["accounting_scope_type"]
          status: Database["public"]["Enums"]["accounting_setup_status"]
          tax_inclusive: boolean
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          scope_type: Database["public"]["Enums"]["accounting_scope_type"]
          status?: Database["public"]["Enums"]["accounting_setup_status"]
          tax_inclusive?: boolean
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          scope_type?: Database["public"]["Enums"]["accounting_scope_type"]
          status?: Database["public"]["Enums"]["accounting_setup_status"]
          tax_inclusive?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_setups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          achieved_at: string
          created_at: string
          description: string
          employee_id: string
          id: string
          organization_id: string | null
          title: string
        }
        Insert: {
          achieved_at: string
          created_at?: string
          description: string
          employee_id: string
          id?: string
          organization_id?: string | null
          title: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          organization_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_content_index: {
        Row: {
          access_entities: string[] | null
          access_scope: string | null
          content: string
          content_type: string
          id: string
          indexed_at: string | null
          last_updated: string | null
          metadata: Json | null
          organization_id: string
          source_id: string
          source_table: string
          title: string | null
        }
        Insert: {
          access_entities?: string[] | null
          access_scope?: string | null
          content: string
          content_type: string
          id?: string
          indexed_at?: string | null
          last_updated?: string | null
          metadata?: Json | null
          organization_id: string
          source_id: string
          source_table: string
          title?: string | null
        }
        Update: {
          access_entities?: string[] | null
          access_scope?: string | null
          content?: string
          content_type?: string
          id?: string
          indexed_at?: string | null
          last_updated?: string | null
          metadata?: Json | null
          organization_id?: string
          source_id?: string
          source_table?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_content_index_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_participants: {
        Row: {
          added_at: string | null
          added_by: string | null
          can_send_messages: boolean | null
          conversation_id: string
          employee_id: string
          id: string
          organization_id: string
          role: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          can_send_messages?: boolean | null
          conversation_id: string
          employee_id: string
          id?: string
          organization_id: string
          role?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          can_send_messages?: boolean | null
          conversation_id?: string
          employee_id?: string
          id?: string
          organization_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          is_shared: boolean | null
          last_message_at: string | null
          organization_id: string
          title: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          is_shared?: boolean | null
          last_message_at?: string | null
          organization_id: string
          title?: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          is_shared?: boolean | null
          last_message_at?: string | null
          organization_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_indexing_status: {
        Row: {
          created_at: string | null
          current_source: string | null
          id: string
          last_chat_index: string | null
          last_full_index: string | null
          last_team_index: string | null
          last_wiki_index: string | null
          next_scheduled_index: string | null
          organization_id: string
          records_indexed: number | null
          sources_completed: string[] | null
          status: string | null
          total_sources: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_source?: string | null
          id?: string
          last_chat_index?: string | null
          last_full_index?: string | null
          last_team_index?: string | null
          last_wiki_index?: string | null
          next_scheduled_index?: string | null
          organization_id: string
          records_indexed?: number | null
          sources_completed?: string[] | null
          status?: string | null
          total_sources?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_source?: string | null
          id?: string
          last_chat_index?: string | null
          last_full_index?: string | null
          last_team_index?: string | null
          last_wiki_index?: string | null
          next_scheduled_index?: string | null
          organization_id?: string
          records_indexed?: number | null
          sources_completed?: string[] | null
          status?: string | null
          total_sources?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_indexing_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_internal_notes: {
        Row: {
          author_employee_id: string
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          mentioned_employee_ids: string[] | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          author_employee_id: string
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          mentioned_employee_ids?: string[] | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          author_employee_id?: string
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          mentioned_employee_ids?: string[] | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_internal_notes_author_employee_id_fkey"
            columns: ["author_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_internal_notes_author_employee_id_fkey"
            columns: ["author_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_internal_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_settings: {
        Row: {
          allowed_models: string[] | null
          announcements_enabled: boolean
          attendance_enabled: boolean
          auto_reindex_enabled: boolean | null
          auto_reindex_hour: number | null
          calendar_enabled: boolean
          chat_enabled: boolean
          cost_alerts_enabled: boolean | null
          created_at: string | null
          default_model: string | null
          general_ai_enabled: boolean | null
          general_queries_enabled: boolean | null
          id: string
          kpis_enabled: boolean
          last_auto_reindex_at: string | null
          leave_enabled: boolean
          max_tokens_per_day_per_user: number | null
          max_tokens_per_query: number | null
          monthly_token_budget: number | null
          organization_id: string
          owner_restricted_models: string[] | null
          projects_enabled: boolean
          streaming_enabled: boolean | null
          team_directory_enabled: boolean
          updated_at: string | null
          wiki_enabled: boolean
        }
        Insert: {
          allowed_models?: string[] | null
          announcements_enabled?: boolean
          attendance_enabled?: boolean
          auto_reindex_enabled?: boolean | null
          auto_reindex_hour?: number | null
          calendar_enabled?: boolean
          chat_enabled?: boolean
          cost_alerts_enabled?: boolean | null
          created_at?: string | null
          default_model?: string | null
          general_ai_enabled?: boolean | null
          general_queries_enabled?: boolean | null
          id?: string
          kpis_enabled?: boolean
          last_auto_reindex_at?: string | null
          leave_enabled?: boolean
          max_tokens_per_day_per_user?: number | null
          max_tokens_per_query?: number | null
          monthly_token_budget?: number | null
          organization_id: string
          owner_restricted_models?: string[] | null
          projects_enabled?: boolean
          streaming_enabled?: boolean | null
          team_directory_enabled?: boolean
          updated_at?: string | null
          wiki_enabled?: boolean
        }
        Update: {
          allowed_models?: string[] | null
          announcements_enabled?: boolean
          attendance_enabled?: boolean
          auto_reindex_enabled?: boolean | null
          auto_reindex_hour?: number | null
          calendar_enabled?: boolean
          chat_enabled?: boolean
          cost_alerts_enabled?: boolean | null
          created_at?: string | null
          default_model?: string | null
          general_ai_enabled?: boolean | null
          general_queries_enabled?: boolean | null
          id?: string
          kpis_enabled?: boolean
          last_auto_reindex_at?: string | null
          leave_enabled?: boolean
          max_tokens_per_day_per_user?: number | null
          max_tokens_per_query?: number | null
          monthly_token_budget?: number | null
          organization_id?: string
          owner_restricted_models?: string[] | null
          projects_enabled?: boolean
          streaming_enabled?: boolean | null
          team_directory_enabled?: boolean
          updated_at?: string | null
          wiki_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_pinned: boolean
          metadata: Json | null
          organization_id: string
          role: string
          sender_employee_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean
          metadata?: Json | null
          organization_id: string
          role: string
          sender_employee_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean
          metadata?: Json | null
          organization_id?: string
          role?: string
          sender_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_sender_employee_id_fkey"
            columns: ["sender_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_sender_employee_id_fkey"
            columns: ["sender_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          conversation_id: string | null
          created_at: string | null
          employee_id: string | null
          estimated_cost: number | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          model: string
          organization_id: string
          prompt_length: number | null
          prompt_tokens: number | null
          query_type: string
          response_length: number | null
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          conversation_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          estimated_cost?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model?: string
          organization_id: string
          prompt_length?: number | null
          prompt_tokens?: number | null
          query_type?: string
          response_length?: number | null
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          conversation_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          estimated_cost?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model?: string
          organization_id?: string
          prompt_length?: number | null
          prompt_tokens?: number | null
          query_type?: string
          response_length?: number | null
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_documentation: {
        Row: {
          created_at: string | null
          description: string | null
          example_request: Json | null
          example_response: Json | null
          function_name: string
          id: string
          is_active: boolean | null
          is_public: boolean | null
          last_scanned_at: string | null
          method: string | null
          request_schema: Json | null
          response_schema: Json | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          example_request?: Json | null
          example_response?: Json | null
          function_name: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_scanned_at?: string | null
          method?: string | null
          request_schema?: Json | null
          response_schema?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          example_request?: Json | null
          example_response?: Json | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_scanned_at?: string | null
          method?: string | null
          request_schema?: Json | null
          response_schema?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      asset_handovers: {
        Row: {
          asset_id: string | null
          asset_name: string
          assigned_date: string | null
          category: string | null
          created_at: string | null
          employee_id: string
          id: string
          notes: string | null
          organization_id: string
          returned_date: string | null
          status: string | null
          updated_at: string | null
          verified_by: string | null
          workflow_id: string | null
        }
        Insert: {
          asset_id?: string | null
          asset_name: string
          assigned_date?: string | null
          category?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          organization_id: string
          returned_date?: string | null
          status?: string | null
          updated_at?: string | null
          verified_by?: string | null
          workflow_id?: string | null
        }
        Update: {
          asset_id?: string | null
          asset_name?: string
          assigned_date?: string | null
          category?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          returned_date?: string | null
          status?: string | null
          updated_at?: string | null
          verified_by?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_handovers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_handovers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_handovers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_handovers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_handovers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_handovers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "employee_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_instances: {
        Row: {
          assigned_by: string | null
          candidate_application_id: string
          created_at: string | null
          deadline: string
          expected_deliverables: Json | null
          id: string
          instructions: string
          organization_id: string
          rating: number | null
          reminder_sent_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_comments: string | null
          secure_token: string
          status: Database["public"]["Enums"]["assignment_status"] | null
          submission_data: Json | null
          submitted_at: string | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          candidate_application_id: string
          created_at?: string | null
          deadline: string
          expected_deliverables?: Json | null
          id?: string
          instructions: string
          organization_id: string
          rating?: number | null
          reminder_sent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          secure_token: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          submission_data?: Json | null
          submitted_at?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          candidate_application_id?: string
          created_at?: string | null
          deadline?: string
          expected_deliverables?: Json | null
          id?: string
          instructions?: string
          organization_id?: string
          rating?: number | null
          reminder_sent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          secure_token?: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          submission_data?: Json | null
          submitted_at?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_instances_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_instances_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_instances_candidate_application_id_fkey"
            columns: ["candidate_application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_instances_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_instances_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assignment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_deadline_hours: number | null
          expected_deliverables: Json | null
          id: string
          instructions: string
          is_active: boolean | null
          name: string
          organization_id: string
          position_ids: string[] | null
          recommended_effort: string | null
          role_tags: string[] | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_deadline_hours?: number | null
          expected_deliverables?: Json | null
          id?: string
          instructions: string
          is_active?: boolean | null
          name: string
          organization_id: string
          position_ids?: string[] | null
          recommended_effort?: string | null
          role_tags?: string[] | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_deadline_hours?: number | null
          expected_deliverables?: Json | null
          id?: string
          instructions?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          position_ids?: string[] | null
          recommended_effort?: string | null
          role_tags?: string[] | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_type_options: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          organization_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_type_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_hour_balances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          overtime_minutes: number
          undertime_minutes: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          overtime_minutes?: number
          undertime_minutes?: number
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          overtime_minutes?: number
          undertime_minutes?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_hour_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_hour_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_hour_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_leave_adjustments: {
        Row: {
          adjustment_type: string
          attendance_date: string
          created_at: string
          days_adjusted: number
          employee_id: string
          id: string
          leave_type_id: string
          minutes_converted: number
          notes: string | null
          organization_id: string
        }
        Insert: {
          adjustment_type: string
          attendance_date: string
          created_at?: string
          days_adjusted: number
          employee_id: string
          id?: string
          leave_type_id: string
          minutes_converted: number
          notes?: string | null
          organization_id: string
        }
        Update: {
          adjustment_type?: string
          attendance_date?: string
          created_at?: string
          days_adjusted?: number
          employee_id?: string
          id?: string
          leave_type_id?: string
          minutes_converted?: number
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_leave_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_leave_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_leave_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_not_checked_in: {
        Row: {
          created_at: string | null
          date: string
          employee_id: string
          expected_start_time: string | null
          id: string
          organization_id: string
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          work_location: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          employee_id: string
          expected_start_time?: string | null
          id?: string
          organization_id: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          work_location?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          employee_id?: string
          expected_start_time?: string | null
          id?: string
          organization_id?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_not_checked_in_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_not_checked_in_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_not_checked_in_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_latitude: number | null
          check_in_location_name: string | null
          check_in_longitude: number | null
          check_in_office_id: string | null
          check_in_time: string | null
          check_out_latitude: number | null
          check_out_location_name: string | null
          check_out_longitude: number | null
          check_out_time: string | null
          created_at: string
          date: string
          early_checkout_reason: string | null
          employee_id: string
          id: string
          notes: string | null
          organization_id: string | null
          status: string
          updated_at: string
          work_hours: number | null
        }
        Insert: {
          check_in_latitude?: number | null
          check_in_location_name?: string | null
          check_in_longitude?: number | null
          check_in_office_id?: string | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_location_name?: string | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          early_checkout_reason?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          work_hours?: number | null
        }
        Update: {
          check_in_latitude?: number | null
          check_in_location_name?: string | null
          check_in_longitude?: number | null
          check_in_office_id?: string | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_location_name?: string | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          early_checkout_reason?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_check_in_office_id_fkey"
            columns: ["check_in_office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_reminders: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          reminder_date: string
          reminder_type: string
          sent_at: string
          sent_by_employee_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          reminder_date?: string
          reminder_type?: string
          sent_at?: string
          sent_by_employee_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          reminder_date?: string
          reminder_type?: string
          sent_at?: string
          sent_by_employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_reminders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reminders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reminders_sent_by_employee_id_fkey"
            columns: ["sent_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reminders_sent_by_employee_id_fkey"
            columns: ["sent_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_report_schedules: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          enabled: boolean | null
          frequency: string | null
          id: string
          include_ai_summary: boolean | null
          include_charts: boolean | null
          include_summary_cards: boolean | null
          last_sent_at: string | null
          organization_id: string
          recipients: Json | null
          schedules: Json | null
          time_of_day: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          include_ai_summary?: boolean | null
          include_charts?: boolean | null
          include_summary_cards?: boolean | null
          last_sent_at?: string | null
          organization_id: string
          recipients?: Json | null
          schedules?: Json | null
          time_of_day?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          include_ai_summary?: boolean | null
          include_charts?: boolean | null
          include_summary_cards?: boolean | null
          last_sent_at?: string | null
          organization_id?: string
          recipients?: Json | null
          schedules?: Json | null
          time_of_day?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_report_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          bsb: string | null
          chart_account_id: string
          created_at: string
          currency: string
          current_balance: number
          id: string
          is_active: boolean
          ledger_id: string
          name: string
          office_id: string
          organization_id: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          bsb?: string | null
          chart_account_id: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          ledger_id: string
          name: string
          office_id: string
          organization_id: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          bsb?: string | null
          chart_account_id?: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          ledger_id?: string
          name?: string
          office_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_rules: {
        Row: {
          actions: Json
          auto_add: boolean
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          ledger_id: string
          name: string
          office_id: string | null
          organization_id: string
          priority: number
        }
        Insert: {
          actions?: Json
          auto_add?: boolean
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          ledger_id: string
          name: string
          office_id?: string | null
          organization_id: string
          priority?: number
        }
        Update: {
          actions?: Json
          auto_add?: boolean
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          ledger_id?: string
          name?: string
          office_id?: string | null
          organization_id?: string
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_rules_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_rules_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_lines: {
        Row: {
          amount: number
          balance: number | null
          categorized_account_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          matched_bill_id: string | null
          matched_invoice_id: string | null
          matched_journal_id: string | null
          payee: string | null
          reference: string | null
          statement_id: string
          status: Database["public"]["Enums"]["bank_statement_line_status"]
        }
        Insert: {
          amount: number
          balance?: number | null
          categorized_account_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          matched_bill_id?: string | null
          matched_invoice_id?: string | null
          matched_journal_id?: string | null
          payee?: string | null
          reference?: string | null
          statement_id: string
          status?: Database["public"]["Enums"]["bank_statement_line_status"]
        }
        Update: {
          amount?: number
          balance?: number | null
          categorized_account_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          matched_bill_id?: string | null
          matched_invoice_id?: string | null
          matched_journal_id?: string | null
          payee?: string | null
          reference?: string | null
          statement_id?: string
          status?: Database["public"]["Enums"]["bank_statement_line_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_lines_categorized_account_id_fkey"
            columns: ["categorized_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_matched_bill_id_fkey"
            columns: ["matched_bill_id"]
            isOneToOne: false
            referencedRelation: "accounting_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "accounting_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_matched_journal_id_fkey"
            columns: ["matched_journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          bank_account_id: string
          created_at: string
          end_date: string | null
          file_name: string
          id: string
          idempotency_key: string | null
          import_date: string
          row_count: number
          start_date: string | null
        }
        Insert: {
          bank_account_id: string
          created_at?: string
          end_date?: string | null
          file_name: string
          id?: string
          idempotency_key?: string | null
          import_date?: string
          row_count?: number
          start_date?: string | null
        }
        Update: {
          bank_account_id?: string
          created_at?: string
          end_date?: string | null
          file_name?: string
          id?: string
          idempotency_key?: string | null
          import_date?: string
          row_count?: number
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_contacts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_primary: boolean | null
          name: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_primary?: boolean | null
          name?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_primary?: boolean | null
          name?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_keywords: {
        Row: {
          category: string | null
          created_at: string | null
          difficulty: string | null
          id: string
          is_active: boolean | null
          keyword: string
          last_analyzed_at: string | null
          relevance_score: number | null
          search_volume: number | null
          suggested_by_ai: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          keyword: string
          last_analyzed_at?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          suggested_by_ai?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          last_analyzed_at?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          suggested_by_ai?: boolean | null
        }
        Relationships: []
      }
      blog_post_keywords: {
        Row: {
          blog_post_id: string | null
          created_at: string | null
          id: string
          keyword_id: string | null
        }
        Insert: {
          blog_post_id?: string | null
          created_at?: string | null
          id?: string
          keyword_id?: string | null
        }
        Update: {
          blog_post_id?: string | null
          created_at?: string | null
          id?: string
          keyword_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_keywords_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_keywords_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "public_blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "blog_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          ai_generated: boolean | null
          author_avatar_url: string | null
          author_name: string
          canonical_url: string | null
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          focus_keyword: string | null
          generation_metadata: Json | null
          generation_status: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          published_at: string | null
          reading_time_minutes: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          seo_score: number | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          author_avatar_url?: string | null
          author_name: string
          canonical_url?: string | null
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          generation_metadata?: Json | null
          generation_status?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_score?: number | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          author_avatar_url?: string | null
          author_name?: string
          canonical_url?: string | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          generation_metadata?: Json | null
          generation_status?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_score?: number | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      broken_link_reports: {
        Row: {
          created_at: string
          email_sent: boolean
          id: string
          organization_id: string | null
          path: string
          referrer: string | null
          reported_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          id?: string
          organization_id?: string | null
          path: string
          referrer?: string | null
          reported_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          id?: string
          organization_id?: string | null
          path?: string
          referrer?: string | null
          reported_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broken_link_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_offices: {
        Row: {
          calendar_event_id: string
          created_at: string
          id: string
          office_id: string
        }
        Insert: {
          calendar_event_id: string
          created_at?: string
          id?: string
          office_id: string
        }
        Update: {
          calendar_event_id?: string
          created_at?: string
          id?: string
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_offices_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          applies_to_all_offices: boolean
          created_at: string
          created_by: string
          end_date: string
          end_time: string | null
          event_type: string
          id: string
          is_recurring: boolean
          organization_id: string
          start_date: string
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          applies_to_all_offices?: boolean
          created_at?: string
          created_by: string
          end_date: string
          end_time?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean
          organization_id: string
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          applies_to_all_offices?: boolean
          created_at?: string
          created_by?: string
          end_date?: string
          end_time?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean
          organization_id?: string
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_campaign_contacts: {
        Row: {
          call_sid: string | null
          called_at: string | null
          campaign_id: string
          contact_name: string | null
          created_at: string
          crm_contact_id: string | null
          duration_seconds: number | null
          id: string
          notes: string | null
          organization_id: string
          outcome: string | null
          phone_number: string
          status: string
        }
        Insert: {
          call_sid?: string | null
          called_at?: string | null
          campaign_id: string
          contact_name?: string | null
          created_at?: string
          crm_contact_id?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          outcome?: string | null
          phone_number: string
          status?: string
        }
        Update: {
          call_sid?: string | null
          called_at?: string | null
          campaign_id?: string
          contact_name?: string | null
          created_at?: string
          crm_contact_id?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          outcome?: string | null
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_campaign_contacts_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_campaign_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_campaigns: {
        Row: {
          avg_duration_seconds: number | null
          completed_at: string | null
          completed_calls: number | null
          connected_calls: number | null
          created_at: string
          created_by: string | null
          description: string | null
          failed_calls: number | null
          id: string
          name: string
          organization_id: string
          phone_number_id: string | null
          started_at: string | null
          status: string
          total_contacts: number | null
          updated_at: string
          voicemail_drop_text: string | null
        }
        Insert: {
          avg_duration_seconds?: number | null
          completed_at?: string | null
          completed_calls?: number | null
          connected_calls?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          failed_calls?: number | null
          id?: string
          name: string
          organization_id: string
          phone_number_id?: string | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
          updated_at?: string
          voicemail_drop_text?: string | null
        }
        Update: {
          avg_duration_seconds?: number | null
          completed_at?: string | null
          completed_calls?: number | null
          connected_calls?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          failed_calls?: number | null
          id?: string
          name?: string
          organization_id?: string
          phone_number_id?: string | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
          updated_at?: string
          voicemail_drop_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_campaigns_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "org_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      call_queue_members: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_available: boolean | null
          organization_id: string
          priority: number | null
          queue_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_available?: boolean | null
          organization_id: string
          priority?: number | null
          queue_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_available?: boolean | null
          organization_id?: string
          priority?: number | null
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_queue_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_members_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "call_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      call_queues: {
        Row: {
          created_at: string
          description: string | null
          hold_message: string | null
          hold_music_url: string | null
          id: string
          is_active: boolean | null
          max_queue_size: number | null
          max_wait_seconds: number | null
          name: string
          organization_id: string
          strategy: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hold_message?: string | null
          hold_music_url?: string | null
          id?: string
          is_active?: boolean | null
          max_queue_size?: number | null
          max_wait_seconds?: number | null
          name: string
          organization_id: string
          strategy?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hold_message?: string | null
          hold_music_url?: string | null
          id?: string
          is_active?: boolean | null
          max_queue_size?: number | null
          max_wait_seconds?: number | null
          name?: string
          organization_id?: string
          strategy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_queues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recording_settings: {
        Row: {
          auto_record_all: boolean | null
          auto_record_inbound: boolean | null
          auto_record_outbound: boolean | null
          auto_summarize: boolean | null
          auto_transcribe: boolean | null
          created_at: string
          id: string
          organization_id: string
          retention_days: number | null
          updated_at: string
        }
        Insert: {
          auto_record_all?: boolean | null
          auto_record_inbound?: boolean | null
          auto_record_outbound?: boolean | null
          auto_summarize?: boolean | null
          auto_transcribe?: boolean | null
          created_at?: string
          id?: string
          organization_id: string
          retention_days?: number | null
          updated_at?: string
        }
        Update: {
          auto_record_all?: boolean | null
          auto_record_inbound?: boolean | null
          auto_record_outbound?: boolean | null
          auto_summarize?: boolean | null
          auto_transcribe?: boolean | null
          created_at?: string
          id?: string
          organization_id?: string
          retention_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recording_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recordings: {
        Row: {
          ai_summary: string | null
          ai_summary_generated_at: string | null
          ai_topics: string[] | null
          call_sid: string
          created_at: string
          direction: string
          duration_seconds: number | null
          from_number: string | null
          id: string
          metadata: Json | null
          organization_id: string
          phone_number_id: string | null
          recording_sid: string | null
          recording_url: string | null
          status: string
          to_number: string | null
          transcription_status: string | null
          transcription_text: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_topics?: string[] | null
          call_sid: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          phone_number_id?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          status?: string
          to_number?: string | null
          transcription_status?: string | null
          transcription_text?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          ai_topics?: string[] | null
          call_sid?: string
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          from_number?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          phone_number_id?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          status?: string
          to_number?: string | null
          transcription_status?: string | null
          transcription_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_recordings_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "org_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string
          email: string
          events: Json
          full_name: string | null
          id: string
          organization_id: string
          provider_message_id: string | null
          status: string
          unsubscribe_token: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          email: string
          events?: Json
          full_name?: string | null
          id?: string
          organization_id: string
          provider_message_id?: string | null
          status?: string
          unsubscribe_token?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          email?: string
          events?: Json
          full_name?: string | null
          id?: string
          organization_id?: string
          provider_message_id?: string | null
          status?: string
          unsubscribe_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_applications: {
        Row: {
          application_answers: Json | null
          candidate_id: string
          cover_letter: string | null
          created_at: string | null
          custom_fields: Json | null
          cv_file_path: string | null
          hired_at: string | null
          id: string
          is_internal: boolean | null
          job_id: string
          organization_id: string
          rating: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          source_of_application: string | null
          stage: Database["public"]["Enums"]["application_stage"] | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string | null
        }
        Insert: {
          application_answers?: Json | null
          candidate_id: string
          cover_letter?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          cv_file_path?: string | null
          hired_at?: string | null
          id?: string
          is_internal?: boolean | null
          job_id: string
          organization_id: string
          rating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          source_of_application?: string | null
          stage?: Database["public"]["Enums"]["application_stage"] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
        }
        Update: {
          application_answers?: Json | null
          candidate_id?: string
          cover_letter?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          cv_file_path?: string | null
          hired_at?: string | null
          id?: string
          is_internal?: boolean | null
          job_id?: string
          organization_id?: string
          rating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          source_of_application?: string | null
          stage?: Database["public"]["Enums"]["application_stage"] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          employee_id: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          name: string
          notes: string | null
          organization_id: string
          other_urls: Json | null
          phone: string | null
          portfolio_url: string | null
          referred_by_employee_id: string | null
          source: Database["public"]["Enums"]["candidate_source"] | null
          source_details: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          employee_id?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name: string
          notes?: string | null
          organization_id: string
          other_urls?: Json | null
          phone?: string | null
          portfolio_url?: string | null
          referred_by_employee_id?: string | null
          source?: Database["public"]["Enums"]["candidate_source"] | null
          source_details?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          employee_id?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          other_urls?: Json | null
          phone?: string | null
          portfolio_url?: string | null
          referred_by_employee_id?: string | null
          source?: Database["public"]["Enums"]["candidate_source"] | null
          source_details?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_referred_by_employee_id_fkey"
            columns: ["referred_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_referred_by_employee_id_fkey"
            columns: ["referred_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          ledger_id: string
          name: string
          parent_id: string | null
          sort_order: number
          sub_type: string | null
          type: Database["public"]["Enums"]["accounting_account_type"]
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          ledger_id: string
          name: string
          parent_id?: string | null
          sort_order?: number
          sub_type?: string | null
          type: Database["public"]["Enums"]["accounting_account_type"]
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          ledger_id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          sub_type?: string | null
          type?: Database["public"]["Enums"]["accounting_account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          created_by: string
          icon_url: string | null
          id: string
          is_group: boolean
          name: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          icon_url?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          icon_url?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_favorites: {
        Row: {
          conversation_id: string | null
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          sort_order: number | null
          space_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          sort_order?: number | null
          space_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          sort_order?: number | null
          space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_favorites_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_favorites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_favorites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_favorites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_favorites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mentions: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          message_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          message_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          message_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mentions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          employee_id: string
          id: string
          message_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          employee_id: string
          id?: string
          message_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          employee_id?: string
          id?: string
          message_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_read_receipts: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          message_id: string
          organization_id: string
          read_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          message_id: string
          organization_id: string
          read_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          message_id?: string
          organization_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_read_receipts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_read_receipts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_read_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_stars: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          message_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          message_id: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          message_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_stars_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_stars_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_stars_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_stars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          content_type: string
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          id: string
          is_pinned: boolean
          organization_id: string
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          space_id: string | null
          status: string
          system_event_data: Json | null
          updated_at: string
        }
        Insert: {
          content: string
          content_type?: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_pinned?: boolean
          organization_id: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          space_id?: string | null
          status?: string
          system_event_data?: Json | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_pinned?: boolean
          organization_id?: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          space_id?: string | null
          status?: string
          system_event_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          employee_id: string
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          organization_id: string
          role: string
        }
        Insert: {
          conversation_id: string
          employee_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          organization_id: string
          role?: string
        }
        Update: {
          conversation_id?: string
          employee_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_pinned_resources: {
        Row: {
          conversation_id: string | null
          created_at: string
          file_path: string | null
          id: string
          organization_id: string
          pinned_by: string
          space_id: string | null
          title: string
          url: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          organization_id: string
          pinned_by: string
          space_id?: string | null
          title: string
          url?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          organization_id?: string
          pinned_by?: string
          space_id?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_pinned_resources_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_resources_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_resources_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_resources_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_presence: {
        Row: {
          employee_id: string
          id: string
          is_online: boolean
          last_seen_at: string
          organization_id: string
          typing_in_conversation_id: string | null
          typing_in_space_id: string | null
        }
        Insert: {
          employee_id: string
          id?: string
          is_online?: boolean
          last_seen_at?: string
          organization_id: string
          typing_in_conversation_id?: string | null
          typing_in_space_id?: string | null
        }
        Update: {
          employee_id?: string
          id?: string
          is_online?: boolean
          last_seen_at?: string
          organization_id?: string
          typing_in_conversation_id?: string | null
          typing_in_space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_presence_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_presence_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_presence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_presence_typing_in_conversation_id_fkey"
            columns: ["typing_in_conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_presence_typing_in_space_id_fkey"
            columns: ["typing_in_space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_space_departments: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          organization_id: string
          space_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          organization_id: string
          space_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          organization_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_space_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_departments_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_space_member_logs: {
        Row: {
          action_type: string
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          performed_by: string | null
          source: string
          space_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          performed_by?: string | null
          source?: string
          space_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          performed_by?: string | null
          source?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_space_member_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_member_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_member_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_member_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_member_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_member_logs_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_space_members: {
        Row: {
          employee_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          notification_setting: string
          organization_id: string
          role: string
          source: string
          space_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notification_setting?: string
          organization_id: string
          role?: string
          source?: string
          space_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          notification_setting?: string
          organization_id?: string
          role?: string
          source?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_space_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_space_offices: {
        Row: {
          created_at: string
          id: string
          office_id: string
          organization_id: string
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_id: string
          organization_id: string
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          office_id?: string
          organization_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_space_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_offices_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_space_projects: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          project_id: string
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          project_id: string
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_space_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_space_projects_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "chat_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_spaces: {
        Row: {
          access_scope:
            | Database["public"]["Enums"]["chat_space_access_scope"]
            | null
          access_type: Database["public"]["Enums"]["chat_space_access"]
          archived_at: string | null
          archived_by: string | null
          auto_sync_members: boolean | null
          created_at: string
          created_by: string
          description: string | null
          history_enabled: boolean
          icon_url: string | null
          id: string
          name: string
          organization_id: string
          space_type: Database["public"]["Enums"]["chat_space_type"]
          updated_at: string
        }
        Insert: {
          access_scope?:
            | Database["public"]["Enums"]["chat_space_access_scope"]
            | null
          access_type?: Database["public"]["Enums"]["chat_space_access"]
          archived_at?: string | null
          archived_by?: string | null
          auto_sync_members?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          history_enabled?: boolean
          icon_url?: string | null
          id?: string
          name: string
          organization_id: string
          space_type?: Database["public"]["Enums"]["chat_space_type"]
          updated_at?: string
        }
        Update: {
          access_scope?:
            | Database["public"]["Enums"]["chat_space_access_scope"]
            | null
          access_type?: Database["public"]["Enums"]["chat_space_access"]
          archived_at?: string | null
          archived_by?: string | null
          auto_sync_members?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          history_enabled?: boolean
          icon_url?: string | null
          id?: string
          name?: string
          organization_id?: string
          space_type?: Database["public"]["Enums"]["chat_space_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_spaces_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_spaces_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_spaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ai_interactions: {
        Row: {
          case_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          interaction_type: string
          organization_id: string
          prompt_summary: string | null
          response: string | null
          sources_used: Json | null
          staff_feedback: string | null
          staff_rating: number | null
          thread_id: string | null
          was_sent_to_client: boolean
        }
        Insert: {
          case_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          interaction_type: string
          organization_id: string
          prompt_summary?: string | null
          response?: string | null
          sources_used?: Json | null
          staff_feedback?: string | null
          staff_rating?: number | null
          thread_id?: string | null
          was_sent_to_client?: boolean
        }
        Update: {
          case_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          interaction_type?: string
          organization_id?: string
          prompt_summary?: string | null
          response?: string | null
          sources_used?: Json | null
          staff_feedback?: string | null
          staff_rating?: number | null
          thread_id?: string | null
          was_sent_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_ai_interactions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "client_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ai_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ai_interactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "client_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_case_milestones: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          sort_order: number
          status: string
          title: string
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: string
          title: string
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_case_milestones_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "client_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      client_case_status_history: {
        Row: {
          case_id: string
          client_visible: boolean
          created_at: string
          created_by_id: string | null
          created_by_type: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          case_id: string
          client_visible?: boolean
          created_at?: string
          created_by_id?: string | null
          created_by_type?: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          case_id?: string
          client_visible?: boolean
          created_at?: string
          created_by_id?: string | null
          created_by_type?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_case_status_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "client_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      client_cases: {
        Row: {
          assigned_to: string | null
          client_user_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          office_id: string | null
          organization_id: string
          priority: string
          status: string
          title: string
          updated_at: string
          workflow_template_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_user_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          office_id?: string | null
          organization_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          workflow_template_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_user_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          office_id?: string | null
          organization_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_cases_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_cases_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          case_id: string
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          organization_id: string
          parent_document_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          uploaded_by_id: string | null
          uploaded_by_type: string | null
          version: number
        }
        Insert: {
          case_id: string
          created_at?: string
          document_type?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          organization_id: string
          parent_document_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_by_id?: string | null
          uploaded_by_type?: string | null
          version?: number
        }
        Update: {
          case_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string
          parent_document_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_by_id?: string | null
          uploaded_by_type?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "client_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_messages: {
        Row: {
          ai_confidence: number | null
          ai_sources: Json | null
          attachments: Json | null
          client_visible: boolean
          created_at: string
          id: string
          is_internal_note: boolean
          message: string
          sender_id: string | null
          sender_type: string
          thread_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_sources?: Json | null
          attachments?: Json | null
          client_visible?: boolean
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message: string
          sender_id?: string | null
          sender_type: string
          thread_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_sources?: Json | null
          attachments?: Json | null
          client_visible?: boolean
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message?: string
          sender_id?: string | null
          sender_type?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "client_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          body: string | null
          client_user_id: string
          created_at: string
          emailed_at: string | null
          id: string
          link: string | null
          organization_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          client_user_id: string
          created_at?: string
          emailed_at?: string | null
          id?: string
          link?: string | null
          organization_id: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          client_user_id?: string
          created_at?: string
          emailed_at?: string | null
          id?: string
          link?: string | null
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          office_id: string | null
          organization_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          office_id?: string | null
          organization_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          office_id?: string | null
          organization_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_audit_logs_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_offices: {
        Row: {
          created_at: string
          id: string
          office_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          office_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_hash: string | null
          locked_until: string | null
          max_attempts: number
          organization_id: string
          user_agent_hash: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip_hash?: string | null
          locked_until?: string | null
          max_attempts?: number
          organization_id: string
          user_agent_hash?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          locked_until?: string | null
          max_attempts?: number
          organization_id?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_otp_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_sessions: {
        Row: {
          client_user_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          organization_id: string
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          client_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          organization_id: string
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          client_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_sessions_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_portal_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_settings: {
        Row: {
          ai_auto_reply_enabled: boolean
          ai_confidence_threshold: number
          branding_company_name: string | null
          branding_logo_url: string | null
          branding_primary_color: string | null
          created_at: string
          id: string
          is_enabled: boolean
          organization_id: string
          otp_expiry_minutes: number
          otp_lockout_minutes: number
          otp_max_attempts: number
          updated_at: string
        }
        Insert: {
          ai_auto_reply_enabled?: boolean
          ai_confidence_threshold?: number
          branding_company_name?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id: string
          otp_expiry_minutes?: number
          otp_lockout_minutes?: number
          otp_max_attempts?: number
          updated_at?: string
        }
        Update: {
          ai_auto_reply_enabled?: boolean
          ai_confidence_threshold?: number
          branding_company_name?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          otp_expiry_minutes?: number
          otp_lockout_minutes?: number
          otp_max_attempts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          organization_id: string
          phone: string | null
          primary_office_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          organization_id: string
          phone?: string | null
          primary_office_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          organization_id?: string
          phone?: string | null
          primary_office_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_primary_office_id_fkey"
            columns: ["primary_office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json | null
          status: string
          task_type: string
          title: string
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          task_type?: string
          title: string
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          task_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "client_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      client_threads: {
        Row: {
          case_id: string
          created_at: string
          id: string
          last_message_at: string | null
          organization_id: string
          subject: string | null
          unread_by_client: number
          unread_by_staff: number
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          organization_id: string
          subject?: string | null
          unread_by_client?: number
          unread_by_staff?: number
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          organization_id?: string
          subject?: string | null
          unread_by_client?: number
          unread_by_staff?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_threads_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "client_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          employee_id: string
          id: string
          organization_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          organization_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          emoji: string
          employee_id: string
          id: string
          organization_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          emoji: string
          employee_id: string
          id?: string
          organization_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          emoji?: string
          employee_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      coverage_reports: {
        Row: {
          created_at: string | null
          file_coverage: Json
          generated_at: string | null
          id: string
          meets_thresholds: boolean | null
          summary: Json
          test_run_id: string | null
          thresholds: Json | null
          trend_data: Json | null
          uncovered_lines: Json | null
        }
        Insert: {
          created_at?: string | null
          file_coverage: Json
          generated_at?: string | null
          id?: string
          meets_thresholds?: boolean | null
          summary: Json
          test_run_id?: string | null
          thresholds?: Json | null
          trend_data?: Json | null
          uncovered_lines?: Json | null
        }
        Update: {
          created_at?: string | null
          file_coverage?: Json
          generated_at?: string | null
          id?: string
          meets_thresholds?: boolean | null
          summary?: Json
          test_run_id?: string | null
          thresholds?: Json | null
          trend_data?: Json | null
          uncovered_lines?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "coverage_reports_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          applied_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          organization_id: string
          reason: string | null
          status: string | null
          stripe_credit_note_id: string | null
          updated_at: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          applied_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          organization_id: string
          reason?: string | null
          status?: string | null
          stripe_credit_note_id?: string | null
          updated_at?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          applied_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          organization_id?: string
          reason?: string | null
          status?: string | null
          stripe_credit_note_id?: string | null
          updated_at?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activity_log: {
        Row: {
          company_id: string | null
          contact_id: string | null
          content: string | null
          created_at: string
          duration_minutes: number | null
          employee_id: string
          id: string
          metadata: Json | null
          organization_id: string
          subject: string | null
          type: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          id?: string
          metadata?: Json | null
          organization_id: string
          subject?: string | null
          type: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_postcode: string | null
          address_state: string | null
          address_street: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          rating: string | null
          source: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_postcode?: string | null
          address_state?: string | null
          address_street?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          rating?: string | null
          source?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_postcode?: string | null
          address_state?: string | null
          address_street?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          rating?: string | null
          source?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_postcode: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          is_archived: boolean
          job_title: string | null
          last_name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          rating: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_postcode?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_archived?: boolean
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          rating?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_postcode?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_archived?: boolean
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          rating?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_fields: {
        Row: {
          created_at: string | null
          entity_type: string
          field_key: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          organization_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          field_key: string
          field_name: string
          field_type: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          organization_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          field_key?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          organization_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_horoscopes: {
        Row: {
          aspects: Json | null
          content: string
          created_at: string | null
          horoscope_date: string
          id: string
          provider: string | null
          source_text: string | null
          summary_paragraph: string | null
          title: string | null
          zodiac_sign: string
        }
        Insert: {
          aspects?: Json | null
          content: string
          created_at?: string | null
          horoscope_date?: string
          id?: string
          provider?: string | null
          source_text?: string | null
          summary_paragraph?: string | null
          title?: string | null
          zodiac_sign: string
        }
        Update: {
          aspects?: Json | null
          content?: string
          created_at?: string | null
          horoscope_date?: string
          id?: string
          provider?: string | null
          source_text?: string | null
          summary_paragraph?: string | null
          title?: string | null
          zodiac_sign?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_filters: Json | null
          audience_source: string
          content_html_cache: string | null
          content_json: Json | null
          created_at: string
          created_by: string | null
          from_email: string | null
          from_name: string | null
          id: string
          name: string
          organization_id: string
          preview_text: string | null
          recipient_count: number
          reply_to: string | null
          schedule_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          track_clicks: boolean
          track_opens: boolean
          updated_at: string
        }
        Insert: {
          audience_filters?: Json | null
          audience_source?: string
          content_html_cache?: string | null
          content_json?: Json | null
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          name?: string
          organization_id: string
          preview_text?: string | null
          recipient_count?: number
          reply_to?: string | null
          schedule_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          track_clicks?: boolean
          track_opens?: boolean
          updated_at?: string
        }
        Update: {
          audience_filters?: Json | null
          audience_source?: string
          content_html_cache?: string | null
          content_json?: Json | null
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          name?: string
          organization_id?: string
          preview_text?: string | null
          recipient_count?: number
          reply_to?: string | null
          schedule_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          track_clicks?: boolean
          track_opens?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_log: {
        Row: {
          created_at: string | null
          email_type: string
          employee_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          organization_id: string
          recipient_email: string
          resend_id: string | null
          sent_at: string | null
          status: string | null
          template_name: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          recipient_email: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string
          id: string
          organization_id: string
          reason: string | null
          type: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email: string
          id?: string
          organization_id: string
          reason?: string | null
          type?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string
          id?: string
          organization_id?: string
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_suppressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_suppressions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          content_json: Json
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          content_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          content_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          employee_id: string
          id: string
          is_primary: boolean
          organization_id: string
          routing_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          employee_id: string
          id?: string
          is_primary?: boolean
          organization_id: string
          routing_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          routing_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          folder: string
          id: string
          organization_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder: string
          id?: string
          organization_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder?: string
          id?: string
          organization_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding_data: {
        Row: {
          completed_at: string | null
          completed_slides: boolean | null
          created_at: string | null
          current_step: number | null
          employee_id: string
          guides_viewed: Json | null
          id: string
          organization_id: string
          personal_info: Json | null
          skipped: boolean | null
          timezone_setup_completed: boolean | null
          tour_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_slides?: boolean | null
          created_at?: string | null
          current_step?: number | null
          employee_id: string
          guides_viewed?: Json | null
          id?: string
          organization_id: string
          personal_info?: Json | null
          skipped?: boolean | null
          timezone_setup_completed?: boolean | null
          tour_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_slides?: boolean | null
          created_at?: string | null
          current_step?: number | null
          employee_id?: string
          guides_viewed?: Json | null
          id?: string
          organization_id?: string
          personal_info?: Json | null
          skipped?: boolean | null
          timezone_setup_completed?: boolean | null
          tour_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_data_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_data_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_projects: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_projects_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_projects_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          created_at: string
          day_schedules: Json | null
          employee_id: string
          id: string
          late_threshold_minutes: number
          organization_id: string | null
          timezone: string | null
          updated_at: string
          work_days: number[] | null
          work_end_time: string
          work_location: string
          work_start_time: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          day_schedules?: Json | null
          employee_id: string
          id?: string
          late_threshold_minutes?: number
          organization_id?: string | null
          timezone?: string | null
          updated_at?: string
          work_days?: number[] | null
          work_end_time?: string
          work_location?: string
          work_start_time?: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          day_schedules?: Json | null
          employee_id?: string
          id?: string
          late_threshold_minutes?: number
          organization_id?: string | null
          timezone?: string | null
          updated_at?: string
          work_days?: number[] | null
          work_end_time?: string
          work_location?: string
          work_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_workflow_tasks: {
        Row: {
          assignee_id: string | null
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          is_archived: boolean | null
          is_required: boolean | null
          notes: string | null
          organization_id: string
          sort_order: number | null
          stage_id: string
          status: string | null
          title: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          assignee_id?: string | null
          category: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          is_archived?: boolean | null
          is_required?: boolean | null
          notes?: string | null
          organization_id: string
          sort_order?: number | null
          stage_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          assignee_id?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          is_archived?: boolean | null
          is_required?: boolean | null
          notes?: string | null
          organization_id?: string
          sort_order?: number | null
          stage_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_workflow_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflow_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "employee_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_workflows: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_stage_id: string | null
          employee_id: string
          id: string
          organization_id: string
          start_date: string
          status: string | null
          target_date: string
          template_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          employee_id: string
          id?: string
          organization_id: string
          start_date: string
          status?: string | null
          target_date: string
          template_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stage_id?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          start_date?: string
          status?: string | null
          target_date?: string
          template_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflows_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_details: string | null
          checkin_exempt: boolean
          city: string | null
          contract_end_date: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          department: string
          department_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_onboarding_completed: boolean | null
          employee_onboarding_step: number | null
          employment_type: string | null
          gender: string | null
          google_maps_url: string | null
          id: string
          id_number: string | null
          is_new_hire: boolean | null
          join_date: string
          last_working_day: string | null
          latitude: number | null
          legal_entity_id: string | null
          linkedin_url: string | null
          longitude: number | null
          manager_id: string | null
          office_id: string | null
          organization_id: string | null
          payroll_profile_id: string | null
          personal_email: string | null
          phone: string | null
          place_id: string | null
          position: string
          position_effective_date: string | null
          position_id: string | null
          postcode: string | null
          remuneration: number | null
          remuneration_currency: string | null
          resignation_submitted_at: string | null
          role_description: string | null
          role_description_generated_at: string | null
          salary: number | null
          state: string | null
          status: string
          street: string | null
          superpowers: string[] | null
          tax_number: string | null
          tax_profile: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_details?: string | null
          checkin_exempt?: boolean
          city?: string | null
          contract_end_date?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department: string
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_onboarding_completed?: boolean | null
          employee_onboarding_step?: number | null
          employment_type?: string | null
          gender?: string | null
          google_maps_url?: string | null
          id?: string
          id_number?: string | null
          is_new_hire?: boolean | null
          join_date: string
          last_working_day?: string | null
          latitude?: number | null
          legal_entity_id?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          manager_id?: string | null
          office_id?: string | null
          organization_id?: string | null
          payroll_profile_id?: string | null
          personal_email?: string | null
          phone?: string | null
          place_id?: string | null
          position: string
          position_effective_date?: string | null
          position_id?: string | null
          postcode?: string | null
          remuneration?: number | null
          remuneration_currency?: string | null
          resignation_submitted_at?: string | null
          role_description?: string | null
          role_description_generated_at?: string | null
          salary?: number | null
          state?: string | null
          status?: string
          street?: string | null
          superpowers?: string[] | null
          tax_number?: string | null
          tax_profile?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_details?: string | null
          checkin_exempt?: boolean
          city?: string | null
          contract_end_date?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_onboarding_completed?: boolean | null
          employee_onboarding_step?: number | null
          employment_type?: string | null
          gender?: string | null
          google_maps_url?: string | null
          id?: string
          id_number?: string | null
          is_new_hire?: boolean | null
          join_date?: string
          last_working_day?: string | null
          latitude?: number | null
          legal_entity_id?: string | null
          linkedin_url?: string | null
          longitude?: number | null
          manager_id?: string | null
          office_id?: string | null
          organization_id?: string | null
          payroll_profile_id?: string | null
          personal_email?: string | null
          phone?: string | null
          place_id?: string | null
          position?: string
          position_effective_date?: string | null
          position_id?: string | null
          postcode?: string | null
          remuneration?: number | null
          remuneration_currency?: string | null
          resignation_submitted_at?: string | null
          role_description?: string | null
          role_description_generated_at?: string | null
          salary?: number | null
          state?: string | null
          status?: string
          street?: string | null
          superpowers?: string[] | null
          tax_number?: string | null
          tax_profile?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_payroll_profile_id_fkey"
            columns: ["payroll_profile_id"]
            isOneToOne: false
            referencedRelation: "payroll_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_contributions: {
        Row: {
          amount: number
          contribution_type: string
          created_at: string
          description: string
          id: string
          organization_id: string
          run_item_id: string
        }
        Insert: {
          amount: number
          contribution_type: string
          created_at?: string
          description: string
          id?: string
          organization_id: string
          run_item_id: string
        }
        Update: {
          amount?: number
          contribution_type?: string
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          run_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_contributions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_contributions_run_item_id_fkey"
            columns: ["run_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_types: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          label: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_notification_throttle: {
        Row: {
          created_at: string
          error_type: string
          id: string
          last_notified_at: string
          notification_count: number
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          error_type: string
          id?: string
          last_notified_at?: string
          notification_count?: number
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          error_type?: string
          id?: string
          last_notified_at?: string
          notification_count?: number
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_notification_throttle_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_patterns: {
        Row: {
          action_attempted: string | null
          affected_orgs_count: number
          affected_users_count: number
          component_name: string | null
          created_at: string
          error_type: string
          first_occurrence_at: string
          id: string
          is_trending: boolean | null
          last_occurrence_at: string
          notes: string | null
          occurrence_count: number
          pattern_key: string
          sample_error_id: string | null
          sample_error_message: string | null
          status: string
          trending_score: number | null
          updated_at: string
        }
        Insert: {
          action_attempted?: string | null
          affected_orgs_count?: number
          affected_users_count?: number
          component_name?: string | null
          created_at?: string
          error_type: string
          first_occurrence_at?: string
          id?: string
          is_trending?: boolean | null
          last_occurrence_at?: string
          notes?: string | null
          occurrence_count?: number
          pattern_key: string
          sample_error_id?: string | null
          sample_error_message?: string | null
          status?: string
          trending_score?: number | null
          updated_at?: string
        }
        Update: {
          action_attempted?: string | null
          affected_orgs_count?: number
          affected_users_count?: number
          component_name?: string | null
          created_at?: string
          error_type?: string
          first_occurrence_at?: string
          id?: string
          is_trending?: boolean | null
          last_occurrence_at?: string
          notes?: string | null
          occurrence_count?: number
          pattern_key?: string
          sample_error_id?: string | null
          sample_error_message?: string | null
          status?: string
          trending_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      error_support_links: {
        Row: {
          created_at: string
          error_log_id: string
          id: string
          linked_by: string | null
          notes: string | null
          support_request_id: string
        }
        Insert: {
          created_at?: string
          error_log_id: string
          id?: string
          linked_by?: string | null
          notes?: string | null
          support_request_id: string
        }
        Update: {
          created_at?: string
          error_log_id?: string
          id?: string
          linked_by?: string | null
          notes?: string | null
          support_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_support_links_error_log_id_fkey"
            columns: ["error_log_id"]
            isOneToOne: false
            referencedRelation: "user_error_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_support_links_support_request_id_fkey"
            columns: ["support_request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_interviews: {
        Row: {
          conducted_at: string | null
          conducted_by: string | null
          created_at: string | null
          employee_id: string
          feedback_compensation: string | null
          feedback_culture: string | null
          feedback_management: string | null
          feedback_role: string | null
          id: string
          is_confidential: boolean | null
          organization_id: string
          overall_rating: number | null
          reason_for_leaving: string | null
          suggestions: string | null
          updated_at: string | null
          workflow_id: string | null
          would_recommend: boolean | null
          would_return: boolean | null
        }
        Insert: {
          conducted_at?: string | null
          conducted_by?: string | null
          created_at?: string | null
          employee_id: string
          feedback_compensation?: string | null
          feedback_culture?: string | null
          feedback_management?: string | null
          feedback_role?: string | null
          id?: string
          is_confidential?: boolean | null
          organization_id: string
          overall_rating?: number | null
          reason_for_leaving?: string | null
          suggestions?: string | null
          updated_at?: string | null
          workflow_id?: string | null
          would_recommend?: boolean | null
          would_return?: boolean | null
        }
        Update: {
          conducted_at?: string | null
          conducted_by?: string | null
          created_at?: string | null
          employee_id?: string
          feedback_compensation?: string | null
          feedback_culture?: string | null
          feedback_management?: string | null
          feedback_role?: string | null
          id?: string
          is_confidential?: boolean | null
          organization_id?: string
          overall_rating?: number | null
          reason_for_leaving?: string | null
          suggestions?: string | null
          updated_at?: string | null
          workflow_id?: string | null
          would_recommend?: boolean | null
          would_return?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "exit_interviews_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_interviews_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_interviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_interviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_interviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_interviews_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "employee_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_reactions: {
        Row: {
          created_at: string
          emoji: string
          employee_id: string
          id: string
          organization_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          emoji: string
          employee_id: string
          id?: string
          organization_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          emoji?: string
          employee_id?: string
          id?: string
          organization_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_reactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          form_id: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          form_id: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          form_id?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_audit_logs_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submission_files: {
        Row: {
          created_at: string
          field_id: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          organization_id: string
          storage_path: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          field_id: string
          file_name: string
          file_size?: number
          id?: string
          mime_type: string
          organization_id: string
          storage_path: string
          submission_id: string
        }
        Update: {
          created_at?: string
          field_id?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          organization_id?: string
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submission_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          answers: Json
          assignee_user_id: string | null
          computed: Json
          created_at: string
          form_id: string
          form_version_id: string
          id: string
          notes: Json
          organization_id: string
          payment: Json | null
          status: string
          submitted_at: string
          submitter_meta: Json
          tags: string[]
          updated_at: string
        }
        Insert: {
          answers?: Json
          assignee_user_id?: string | null
          computed?: Json
          created_at?: string
          form_id: string
          form_version_id: string
          id?: string
          notes?: Json
          organization_id: string
          payment?: Json | null
          status?: string
          submitted_at?: string
          submitter_meta?: Json
          tags?: string[]
          updated_at?: string
        }
        Update: {
          answers?: Json
          assignee_user_id?: string | null
          computed?: Json
          created_at?: string
          form_id?: string
          form_version_id?: string
          id?: string
          notes?: Json
          organization_id?: string
          payment?: Json | null
          status?: string
          submitted_at?: string
          submitter_meta?: Json
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_versions: {
        Row: {
          calculations: Json
          created_at: string
          created_by: string
          form_id: string
          id: string
          layout_tree: Json
          logic_rules: Json
          organization_id: string
          version_number: number
        }
        Insert: {
          calculations?: Json
          created_at?: string
          created_by: string
          form_id: string
          id?: string
          layout_tree?: Json
          logic_rules?: Json
          organization_id: string
          version_number?: number
        }
        Update: {
          calculations?: Json
          created_at?: string
          created_by?: string
          form_id?: string
          id?: string
          layout_tree?: Json
          logic_rules?: Json
          organization_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          published_version_id: string | null
          settings: Json
          slug: string
          status: string
          theme: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          published_version_id?: string | null
          settings?: Json
          slug: string
          status?: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          published_version_id?: string | null
          settings?: Json
          slug?: string
          status?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_published_version_id_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_activity_logs: {
        Row: {
          action: Database["public"]["Enums"]["hiring_activity_action"]
          actor_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["hiring_activity_action"]
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["hiring_activity_action"]
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiring_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_email_templates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          stage_id: string | null
          subject: string
          template_type: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          stage_id?: string | null
          subject: string
          template_type: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          stage_id?: string | null
          subject?: string
          template_type?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_email_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "org_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_interviews: {
        Row: {
          application_id: string
          calendar_event_id: string | null
          created_at: string | null
          created_by: string | null
          duration_minutes: number | null
          id: string
          interview_type: string
          interviewer_ids: string[] | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          organization_id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["interview_status"] | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          calendar_event_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          interview_type?: string
          interviewer_ids?: string[] | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          organization_id: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["interview_status"] | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          calendar_event_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          interview_type?: string
          interviewer_ids?: string[] | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          organization_id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["interview_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_interviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_interviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_interviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_offers: {
        Row: {
          application_id: string
          approved_at: string | null
          approved_by: string | null
          base_salary: number | null
          bonuses: Json | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          employment_type:
            | Database["public"]["Enums"]["hiring_employment_type"]
            | null
          equity: string | null
          expires_at: string | null
          id: string
          level: string | null
          notes: string | null
          offer_letter_path: string | null
          office_id: string | null
          organization_id: string
          responded_at: string | null
          sent_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["offer_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_id: string
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number | null
          bonuses?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          employment_type?:
            | Database["public"]["Enums"]["hiring_employment_type"]
            | null
          equity?: string | null
          expires_at?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          offer_letter_path?: string | null
          office_id?: string | null
          organization_id: string
          responded_at?: string | null
          sent_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number | null
          bonuses?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          employment_type?:
            | Database["public"]["Enums"]["hiring_employment_type"]
            | null
          equity?: string | null
          expires_at?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          offer_letter_path?: string | null
          office_id?: string | null
          organization_id?: string
          responded_at?: string | null
          sent_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_offers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_offers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_offers_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_offers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          conversation_id: string
          created_at: string
          details: Json | null
          id: string
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          conversation_id: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          conversation_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_ai_events: {
        Row: {
          citations: Json
          confidence: number | null
          conversation_id: string | null
          created_at: string
          event_type: string
          feedback_label: string | null
          id: string
          inputs: Json
          model_version: string | null
          organization_id: string
          outputs: Json
          reviewer_feedback: string | null
          reviewer_id: string | null
        }
        Insert: {
          citations?: Json
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          event_type: string
          feedback_label?: string | null
          id?: string
          inputs?: Json
          model_version?: string | null
          organization_id: string
          outputs?: Json
          reviewer_feedback?: string | null
          reviewer_id?: string | null
        }
        Update: {
          citations?: Json
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          feedback_label?: string | null
          id?: string
          inputs?: Json
          model_version?: string | null
          organization_id?: string
          outputs?: Json
          reviewer_feedback?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_ai_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_ai_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_channels: {
        Row: {
          ai_auto_reply_enabled: boolean
          ai_blocked_intents: string[]
          ai_confidence_threshold: number
          ai_safe_intents: string[]
          channel_type: Database["public"]["Enums"]["inbox_channel_type"]
          config: Json
          created_at: string
          credentials: Json
          display_name: string
          id: string
          is_active: boolean
          last_error: string | null
          last_webhook_at: string | null
          organization_id: string
          team_id: string | null
          updated_at: string
          webhook_secret: string | null
          webhook_status: string
        }
        Insert: {
          ai_auto_reply_enabled?: boolean
          ai_blocked_intents?: string[]
          ai_confidence_threshold?: number
          ai_safe_intents?: string[]
          channel_type: Database["public"]["Enums"]["inbox_channel_type"]
          config?: Json
          created_at?: string
          credentials?: Json
          display_name: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_webhook_at?: string | null
          organization_id: string
          team_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_status?: string
        }
        Update: {
          ai_auto_reply_enabled?: boolean
          ai_blocked_intents?: string[]
          ai_confidence_threshold?: number
          ai_safe_intents?: string[]
          channel_type?: Database["public"]["Enums"]["inbox_channel_type"]
          config?: Json
          created_at?: string
          credentials?: Json
          display_name?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_webhook_at?: string | null
          organization_id?: string
          team_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_contacts: {
        Row: {
          avatar_url: string | null
          consent: Json
          created_at: string
          crm_contact_id: string | null
          custom_fields: Json
          email: string | null
          handles: Json
          id: string
          last_seen_at: string | null
          name: string | null
          organization_id: string
          phone: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          consent?: Json
          created_at?: string
          crm_contact_id?: string | null
          custom_fields?: Json
          email?: string | null
          handles?: Json
          id?: string
          last_seen_at?: string | null
          name?: string | null
          organization_id: string
          phone?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          consent?: Json
          created_at?: string
          crm_contact_id?: string | null
          custom_fields?: Json
          email?: string | null
          handles?: Json
          id?: string
          last_seen_at?: string | null
          name?: string | null
          organization_id?: string
          phone?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_contacts_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_conversations: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          channel_id: string | null
          channel_thread_ref: string | null
          channel_type: Database["public"]["Enums"]["inbox_channel_type"]
          contact_id: string
          created_at: string
          first_response_at: string | null
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          last_outbound_at: string | null
          metadata: Json
          notes: string | null
          organization_id: string
          priority: string
          resolved_at: string | null
          sla_breach_at: string | null
          snoozed_until: string | null
          status: Database["public"]["Enums"]["inbox_conversation_status"]
          subject: string | null
          tags: string[]
          team_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          channel_id?: string | null
          channel_thread_ref?: string | null
          channel_type: Database["public"]["Enums"]["inbox_channel_type"]
          contact_id: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          metadata?: Json
          notes?: string | null
          organization_id: string
          priority?: string
          resolved_at?: string | null
          sla_breach_at?: string | null
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["inbox_conversation_status"]
          subject?: string | null
          tags?: string[]
          team_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          channel_id?: string | null
          channel_thread_ref?: string | null
          channel_type?: Database["public"]["Enums"]["inbox_channel_type"]
          contact_id?: string
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          metadata?: Json
          notes?: string | null
          organization_id?: string
          priority?: string
          resolved_at?: string | null
          sla_breach_at?: string | null
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["inbox_conversation_status"]
          subject?: string | null
          tags?: string[]
          team_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "inbox_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "inbox_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_gmail_sync_state: {
        Row: {
          created_at: string
          gmail_email: string | null
          gmail_history_id: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          sync_errors: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gmail_email?: string | null
          gmail_history_id?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          sync_errors?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gmail_email?: string | null
          gmail_history_id?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          sync_errors?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_gmail_sync_state_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_gmail_thread_map: {
        Row: {
          conversation_id: string
          created_at: string
          gmail_message_ids: string[] | null
          gmail_thread_id: string
          id: string
          organization_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          gmail_message_ids?: string[] | null
          gmail_thread_id: string
          id?: string
          organization_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          gmail_message_ids?: string[] | null
          gmail_thread_id?: string
          id?: string
          organization_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_gmail_thread_map_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_gmail_thread_map_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_macros: {
        Row: {
          category: string | null
          channel_compatibility: Database["public"]["Enums"]["inbox_channel_type"][]
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          category?: string | null
          channel_compatibility?: Database["public"]["Enums"]["inbox_channel_type"][]
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          category?: string | null
          channel_compatibility?: Database["public"]["Enums"]["inbox_channel_type"][]
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "inbox_macros_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          created_by: string | null
          created_by_type: string
          delivery_status: Database["public"]["Enums"]["inbox_delivery_status"]
          delivery_status_updated_at: string | null
          direction: Database["public"]["Enums"]["inbox_message_direction"]
          error_code: string | null
          error_message: string | null
          id: string
          media_urls: string[]
          msg_type: Database["public"]["Enums"]["inbox_message_type"]
          organization_id: string
          provider_message_id: string | null
          template_id: string | null
        }
        Insert: {
          content?: Json
          conversation_id: string
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          delivery_status?: Database["public"]["Enums"]["inbox_delivery_status"]
          delivery_status_updated_at?: string | null
          direction: Database["public"]["Enums"]["inbox_message_direction"]
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_urls?: string[]
          msg_type?: Database["public"]["Enums"]["inbox_message_type"]
          organization_id: string
          provider_message_id?: string | null
          template_id?: string | null
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          created_by_type?: string
          delivery_status?: Database["public"]["Enums"]["inbox_delivery_status"]
          delivery_status_updated_at?: string | null
          direction?: Database["public"]["Enums"]["inbox_message_direction"]
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_urls?: string[]
          msg_type?: Database["public"]["Enums"]["inbox_message_type"]
          organization_id?: string
          provider_message_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_webhook_events: {
        Row: {
          channel_type: Database["public"]["Enums"]["inbox_channel_type"]
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          organization_id: string | null
          processed: boolean
          processed_at: string | null
          raw_payload: Json
          retry_count: number
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["inbox_channel_type"]
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          organization_id?: string | null
          processed?: boolean
          processed_at?: string | null
          raw_payload: Json
          retry_count?: number
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["inbox_channel_type"]
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string | null
          processed?: boolean
          processed_at?: string | null
          raw_payload?: Json
          retry_count?: number
        }
        Relationships: []
      }
      interview_scorecards: {
        Row: {
          concerns: string | null
          created_at: string | null
          id: string
          interview_id: string
          interviewer_id: string
          notes: string | null
          organization_id: string
          overall_rating: number | null
          ratings: Json | null
          recommendation:
            | Database["public"]["Enums"]["interview_recommendation"]
            | null
          strengths: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          concerns?: string | null
          created_at?: string | null
          id?: string
          interview_id: string
          interviewer_id: string
          notes?: string | null
          organization_id: string
          overall_rating?: number | null
          ratings?: Json | null
          recommendation?:
            | Database["public"]["Enums"]["interview_recommendation"]
            | null
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          concerns?: string | null
          created_at?: string | null
          id?: string
          interview_id?: string
          interviewer_id?: string
          notes?: string | null
          organization_id?: string
          overall_rating?: number | null
          ratings?: Json | null
          recommendation?:
            | Database["public"]["Enums"]["interview_recommendation"]
            | null
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_scorecards_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "hiring_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_scorecards_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_scorecards_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_scorecards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string
          line_items: Json | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          job_id: string
          name: string
          organization_id: string
          sort_order: number
          stage_key: Database["public"]["Enums"]["application_stage"]
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_id: string
          name: string
          organization_id: string
          sort_order?: number
          stage_key: Database["public"]["Enums"]["application_stage"]
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          job_id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          stage_key?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_close_date: string | null
          application_form_config: Json | null
          approved_at: string | null
          approved_by: string | null
          auto_close_on_deadline: boolean | null
          benefits: string | null
          closed_at: string | null
          closed_reason: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          employment_type:
            | Database["public"]["Enums"]["hiring_employment_type"]
            | null
          headcount: number | null
          hiring_manager_id: string | null
          id: string
          is_internal_apply: boolean | null
          is_internal_visible: boolean | null
          is_public_visible: boolean | null
          justification: string | null
          location: string | null
          office_id: string | null
          organization_id: string
          pipeline_id: string | null
          published_at: string | null
          recruiter_id: string | null
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_visible: boolean | null
          salary_visible_internal: boolean | null
          slug: string
          status: Database["public"]["Enums"]["job_status"] | null
          target_start_date: string | null
          title: string
          updated_at: string | null
          work_model: Database["public"]["Enums"]["work_model"] | null
        }
        Insert: {
          application_close_date?: string | null
          application_form_config?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          auto_close_on_deadline?: boolean | null
          benefits?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?:
            | Database["public"]["Enums"]["hiring_employment_type"]
            | null
          headcount?: number | null
          hiring_manager_id?: string | null
          id?: string
          is_internal_apply?: boolean | null
          is_internal_visible?: boolean | null
          is_public_visible?: boolean | null
          justification?: string | null
          location?: string | null
          office_id?: string | null
          organization_id: string
          pipeline_id?: string | null
          published_at?: string | null
          recruiter_id?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_visible?: boolean | null
          salary_visible_internal?: boolean | null
          slug: string
          status?: Database["public"]["Enums"]["job_status"] | null
          target_start_date?: string | null
          title: string
          updated_at?: string | null
          work_model?: Database["public"]["Enums"]["work_model"] | null
        }
        Update: {
          application_close_date?: string | null
          application_form_config?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          auto_close_on_deadline?: boolean | null
          benefits?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?:
            | Database["public"]["Enums"]["hiring_employment_type"]
            | null
          headcount?: number | null
          hiring_manager_id?: string | null
          id?: string
          is_internal_apply?: boolean | null
          is_internal_visible?: boolean | null
          is_public_visible?: boolean | null
          justification?: string | null
          location?: string | null
          office_id?: string | null
          organization_id?: string
          pipeline_id?: string | null
          published_at?: string | null
          recruiter_id?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_visible?: boolean | null
          salary_visible_internal?: boolean | null
          slug?: string
          status?: Database["public"]["Enums"]["job_status"] | null
          target_start_date?: string | null
          title?: string
          updated_at?: string | null
          work_model?: Database["public"]["Enums"]["work_model"] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_hiring_manager_id_fkey"
            columns: ["hiring_manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_hiring_manager_id_fkey"
            columns: ["hiring_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "org_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          contact_id: string | null
          credit: number
          debit: number
          description: string | null
          id: string
          journal_id: string
          sort_order: number
          tax_amount: number
          tax_rate_id: string | null
        }
        Insert: {
          account_id: string
          contact_id?: string | null
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id: string
          sort_order?: number
          tax_amount?: number
          tax_rate_id?: string | null
        }
        Update: {
          account_id?: string
          contact_id?: string | null
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id?: string
          sort_order?: number
          tax_amount?: number
          tax_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "accounting_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          is_adjusting: boolean
          journal_number: number
          ledger_id: string
          memo: string | null
          office_id: string
          organization_id: string
          posted_at: string | null
          source_id: string | null
          source_type: string
          status: Database["public"]["Enums"]["journal_status"]
        }
        Insert: {
          created_at?: string
          created_by: string
          date?: string
          id?: string
          is_adjusting?: boolean
          journal_number?: number
          ledger_id: string
          memo?: string | null
          office_id: string
          organization_id: string
          posted_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["journal_status"]
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          is_adjusting?: boolean
          journal_number?: number
          ledger_id?: string
          memo?: string | null
          office_id?: string
          organization_id?: string
          posted_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: Database["public"]["Enums"]["journal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "journals_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          access_entities: string[] | null
          access_level: string
          chunk_index: number | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          organization_id: string
          source_id: string
          source_type: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          access_entities?: string[] | null
          access_level?: string
          chunk_index?: number | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          source_id: string
          source_type: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          access_entities?: string[] | null
          access_level?: string
          chunk_index?: number | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          source_id?: string
          source_type?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_transfers: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          employee_id: string
          id: string
          notes: string | null
          organization_id: string
          recipient_id: string | null
          scheduled_date: string | null
          status: string | null
          topic: string
          updated_at: string | null
          wiki_page_id: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          organization_id: string
          recipient_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          topic: string
          updated_at?: string | null
          wiki_page_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          recipient_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          topic?: string
          updated_at?: string | null
          wiki_page_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_transfers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_transfers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_transfers_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_transfers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "employee_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          employee_id: string
          id: string
          kpi_id: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          kpi_id: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          kpi_id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_activity_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_activity_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_activity_logs_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_ai_insights: {
        Row: {
          employee_id: string
          generated_at: string
          id: string
          insights: Json
          organization_id: string
          quarter: number
          year: number
        }
        Insert: {
          employee_id: string
          generated_at?: string
          id?: string
          insights: Json
          organization_id: string
          quarter: number
          year: number
        }
        Update: {
          employee_id?: string
          generated_at?: string
          id?: string
          insights?: Json
          organization_id?: string
          quarter?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_ai_insights_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_ai_insights_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_ai_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_generation_jobs: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          created_by: string
          error_message: string | null
          generated_kpis: Json | null
          id: string
          last_heartbeat: string | null
          organization_id: string
          progress: number | null
          progress_message: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          config: Json
          created_at?: string
          created_by: string
          error_message?: string | null
          generated_kpis?: Json | null
          id?: string
          last_heartbeat?: string | null
          organization_id: string
          progress?: number | null
          progress_message?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          created_by?: string
          error_message?: string | null
          generated_kpis?: Json | null
          id?: string
          last_heartbeat?: string | null
          organization_id?: string
          progress?: number | null
          progress_message?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_generation_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_generation_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_generation_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_owners: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          is_primary: boolean | null
          kpi_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          is_primary?: boolean | null
          kpi_id: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          is_primary?: boolean | null
          kpi_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_owners_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_owners_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_owners_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          organization_id: string
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organization_id?: string
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_update_settings: {
        Row: {
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_enabled: boolean
          kpi_id: string
          last_reminder_at: string | null
          next_reminder_at: string | null
          organization_id: string
          reminder_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_enabled?: boolean
          kpi_id: string
          last_reminder_at?: string | null
          next_reminder_at?: string | null
          organization_id: string
          reminder_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_enabled?: boolean
          kpi_id?: string
          last_reminder_at?: string | null
          next_reminder_at?: string | null
          organization_id?: string
          reminder_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_update_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_update_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_update_settings_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: true
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_update_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_updates: {
        Row: {
          attachments: Json | null
          created_at: string
          employee_id: string
          id: string
          kpi_id: string
          new_value: number | null
          notes: string
          organization_id: string
          previous_value: number | null
          status_after: string | null
          status_before: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          employee_id: string
          id?: string
          kpi_id: string
          new_value?: number | null
          notes: string
          organization_id: string
          previous_value?: number | null
          status_after?: string | null
          status_before?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          employee_id?: string
          id?: string
          kpi_id?: string
          new_value?: number | null
          notes?: string
          organization_id?: string
          previous_value?: number | null
          status_after?: string | null
          status_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_updates_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          auto_rollup: boolean | null
          child_contribution_weight: number | null
          created_at: string
          current_value: number | null
          description: string | null
          employee_id: string | null
          id: string
          milestones: Json | null
          organization_id: string
          parent_kpi_id: string | null
          quarter: number | null
          scope_department: string | null
          scope_office_id: string | null
          scope_project_id: string | null
          scope_type: string
          status: string
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          year: number
        }
        Insert: {
          auto_rollup?: boolean | null
          child_contribution_weight?: number | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          employee_id?: string | null
          id?: string
          milestones?: Json | null
          organization_id: string
          parent_kpi_id?: string | null
          quarter?: number | null
          scope_department?: string | null
          scope_office_id?: string | null
          scope_project_id?: string | null
          scope_type?: string
          status?: string
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          auto_rollup?: boolean | null
          child_contribution_weight?: number | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          employee_id?: string | null
          id?: string
          milestones?: Json | null
          organization_id?: string
          parent_kpi_id?: string | null
          quarter?: number | null
          scope_department?: string | null
          scope_office_id?: string | null
          scope_project_id?: string | null
          scope_type?: string
          status?: string
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_parent_kpi_id_fkey"
            columns: ["parent_kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_scope_office_id_fkey"
            columns: ["scope_office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_scope_project_id_fkey"
            columns: ["scope_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos: {
        Row: {
          access_scope: string | null
          batch_id: string | null
          comment: string
          created_at: string
          employee_id: string
          given_by_id: string
          id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_scope?: string | null
          batch_id?: string | null
          comment: string
          created_at?: string
          employee_id: string
          given_by_id: string
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_scope?: string | null
          batch_id?: string | null
          comment?: string
          created_at?: string
          employee_id?: string
          given_by_id?: string
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kudos_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_given_by_id_fkey"
            columns: ["given_by_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_given_by_id_fkey"
            columns: ["given_by_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos_departments: {
        Row: {
          created_at: string | null
          department: string
          id: string
          kudos_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          department: string
          id?: string
          kudos_id: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          department?: string
          id?: string
          kudos_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_departments_kudos_id_fkey"
            columns: ["kudos_id"]
            isOneToOne: false
            referencedRelation: "kudos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos_offices: {
        Row: {
          created_at: string | null
          id: string
          kudos_id: string
          office_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kudos_id: string
          office_id: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kudos_id?: string
          office_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_offices_kudos_id_fkey"
            columns: ["kudos_id"]
            isOneToOne: false
            referencedRelation: "kudos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos_projects: {
        Row: {
          created_at: string | null
          id: string
          kudos_id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kudos_id: string
          organization_id: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kudos_id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_projects_kudos_id_fkey"
            columns: ["kudos_id"]
            isOneToOne: false
            referencedRelation: "kudos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_development: {
        Row: {
          completion_date: string | null
          cost: number | null
          created_at: string
          description: string | null
          employee_id: string
          expiry_date: string | null
          id: string
          organization_id: string | null
          provider: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
          organization_id?: string | null
          provider?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
          organization_id?: string | null
          provider?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_development_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_development_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_development_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balance_logs: {
        Row: {
          action: string | null
          change_amount: number
          created_at: string
          created_by: string
          effective_date: string | null
          employee_id: string
          id: string
          leave_request_id: string | null
          leave_type: string
          new_balance: number
          office_leave_type_id: string | null
          organization_id: string | null
          previous_balance: number
          reason: string | null
          updated_at: string | null
          updated_by: string | null
          year: number | null
        }
        Insert: {
          action?: string | null
          change_amount: number
          created_at?: string
          created_by: string
          effective_date?: string | null
          employee_id: string
          id?: string
          leave_request_id?: string | null
          leave_type: string
          new_balance: number
          office_leave_type_id?: string | null
          organization_id?: string | null
          previous_balance?: number
          reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
          year?: number | null
        }
        Update: {
          action?: string | null
          change_amount?: number
          created_at?: string
          created_by?: string
          effective_date?: string | null
          employee_id?: string
          id?: string
          leave_request_id?: string | null
          leave_type?: string
          new_balance?: number
          office_leave_type_id?: string | null
          organization_id?: string | null
          previous_balance?: number
          reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_balance_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_office_leave_type_id_fkey"
            columns: ["office_leave_type_id"]
            isOneToOne: false
            referencedRelation: "office_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string | null
          pto_days: number
          sick_days: number
          updated_at: string
          vacation_days: number
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id?: string | null
          pto_days?: number
          sick_days?: number
          updated_at?: string
          vacation_days?: number
          year?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string | null
          pto_days?: number
          sick_days?: number
          updated_at?: string
          vacation_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          days_count: number
          employee_id: string
          end_date: string
          half_day_type: string
          id: string
          leave_type: string
          office_id: string | null
          office_leave_type_id: string | null
          organization_id: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          skip_notification: boolean | null
          start_date: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          days_count: number
          employee_id: string
          end_date: string
          half_day_type?: string
          id?: string
          leave_type: string
          office_id?: string | null
          office_leave_type_id?: string | null
          organization_id?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skip_notification?: boolean | null
          start_date: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          days_count?: number
          employee_id?: string
          end_date?: string
          half_day_type?: string
          id?: string
          leave_type?: string
          office_id?: string | null
          office_leave_type_id?: string | null
          organization_id?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skip_notification?: boolean | null
          start_date?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_office_leave_type_id_fkey"
            columns: ["office_leave_type_id"]
            isOneToOne: false
            referencedRelation: "office_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_type_balances: {
        Row: {
          balance: number
          created_at: string
          employee_id: string
          id: string
          office_leave_type_id: string
          organization_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          balance?: number
          created_at?: string
          employee_id: string
          id?: string
          office_leave_type_id: string
          organization_id?: string | null
          updated_at?: string
          year?: number
        }
        Update: {
          balance?: number
          created_at?: string
          employee_id?: string
          id?: string
          office_leave_type_id?: string
          organization_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_type_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_type_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_type_balances_office_leave_type_id_fkey"
            columns: ["office_leave_type_id"]
            isOneToOne: false
            referencedRelation: "office_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_type_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          balance_delta: number | null
          created_at: string
          credit: number
          date: string
          debit: number
          id: string
          journal_id: string
          journal_line_id: string
          ledger_id: string
          office_id: string
          organization_id: string
        }
        Insert: {
          account_id: string
          balance_delta?: number | null
          created_at?: string
          credit?: number
          date: string
          debit?: number
          id?: string
          journal_id: string
          journal_line_id: string
          ledger_id: string
          office_id: string
          organization_id: string
        }
        Update: {
          account_id?: string
          balance_delta?: number | null
          created_at?: string
          credit?: number
          date?: string
          debit?: number
          id?: string
          journal_id?: string
          journal_line_id?: string
          ledger_id?: string
          office_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_journal_line_id_fkey"
            columns: ["journal_line_id"]
            isOneToOne: false
            referencedRelation: "journal_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "accounting_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entities: {
        Row: {
          address: Json | null
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          registration_number: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          country: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_type: string
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_attendance_exemptions: {
        Row: {
          created_at: string
          employee_id: string
          exempted_at: string
          exempted_by: string | null
          id: string
          office_id: string
          organization_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          exempted_at?: string
          exempted_by?: string | null
          id?: string
          office_id: string
          organization_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          exempted_at?: string
          exempted_by?: string | null
          id?: string
          office_id?: string
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_attendance_exemptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_exemptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_exemptions_exempted_by_fkey"
            columns: ["exempted_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_exemptions_exempted_by_fkey"
            columns: ["exempted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_exemptions_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_exemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_attendance_settings: {
        Row: {
          attendance_enabled: boolean
          auto_adjustments_enabled: boolean
          auto_checkout_after_minutes: number
          auto_checkout_enabled: boolean
          auto_checkout_status: string
          created_at: string
          early_checkout_reason_required: boolean
          hybrid_checkin_methods: string[]
          id: string
          location_radius_meters: number
          max_dil_days: number | null
          max_sessions_per_day: number
          min_overtime_minutes: number
          min_undertime_minutes: number
          multi_session_enabled: boolean
          office_checkin_methods: string[]
          office_id: string
          organization_id: string
          overtime_credit_leave_type_id: string | null
          remote_checkin_methods: string[]
          require_location_for_hybrid: boolean
          require_location_for_office: boolean
          undertime_debit_leave_type_id: string | null
          undertime_fallback_leave_type_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_enabled?: boolean
          auto_adjustments_enabled?: boolean
          auto_checkout_after_minutes?: number
          auto_checkout_enabled?: boolean
          auto_checkout_status?: string
          created_at?: string
          early_checkout_reason_required?: boolean
          hybrid_checkin_methods?: string[]
          id?: string
          location_radius_meters?: number
          max_dil_days?: number | null
          max_sessions_per_day?: number
          min_overtime_minutes?: number
          min_undertime_minutes?: number
          multi_session_enabled?: boolean
          office_checkin_methods?: string[]
          office_id: string
          organization_id: string
          overtime_credit_leave_type_id?: string | null
          remote_checkin_methods?: string[]
          require_location_for_hybrid?: boolean
          require_location_for_office?: boolean
          undertime_debit_leave_type_id?: string | null
          undertime_fallback_leave_type_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_enabled?: boolean
          auto_adjustments_enabled?: boolean
          auto_checkout_after_minutes?: number
          auto_checkout_enabled?: boolean
          auto_checkout_status?: string
          created_at?: string
          early_checkout_reason_required?: boolean
          hybrid_checkin_methods?: string[]
          id?: string
          location_radius_meters?: number
          max_dil_days?: number | null
          max_sessions_per_day?: number
          min_overtime_minutes?: number
          min_undertime_minutes?: number
          multi_session_enabled?: boolean
          office_checkin_methods?: string[]
          office_id?: string
          organization_id?: string
          overtime_credit_leave_type_id?: string | null
          remote_checkin_methods?: string[]
          require_location_for_hybrid?: boolean
          require_location_for_office?: boolean
          undertime_debit_leave_type_id?: string | null
          undertime_fallback_leave_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_attendance_settings_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: true
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_settings_overtime_credit_leave_type_id_fkey"
            columns: ["overtime_credit_leave_type_id"]
            isOneToOne: false
            referencedRelation: "office_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_settings_undertime_debit_leave_type_id_fkey"
            columns: ["undertime_debit_leave_type_id"]
            isOneToOne: false
            referencedRelation: "office_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_attendance_settings_undertime_fallback_leave_type_i_fkey"
            columns: ["undertime_fallback_leave_type_id"]
            isOneToOne: false
            referencedRelation: "office_leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      office_leave_types: {
        Row: {
          applies_to_employment_types: string[] | null
          applies_to_gender: string | null
          carry_forward_mode: string | null
          category: string
          created_at: string | null
          default_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          max_negative_days: number | null
          min_days_advance: number | null
          name: string
          office_id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          applies_to_employment_types?: string[] | null
          applies_to_gender?: string | null
          carry_forward_mode?: string | null
          category?: string
          created_at?: string | null
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_negative_days?: number | null
          min_days_advance?: number | null
          name: string
          office_id: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          applies_to_employment_types?: string[] | null
          applies_to_gender?: string | null
          carry_forward_mode?: string | null
          category?: string
          created_at?: string | null
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_negative_days?: number | null
          min_days_advance?: number | null
          name?: string
          office_id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_leave_types_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_leave_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_qr_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          office_id: string
          organization_id: string
          radius_meters: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          office_id: string
          organization_id: string
          radius_meters?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          office_id?: string
          organization_id?: string
          radius_meters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "office_qr_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_qr_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_qr_codes_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_qr_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_schedules: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          created_at: string
          day_schedules: Json | null
          id: string
          late_threshold_minutes: number
          office_id: string
          organization_id: string
          timezone: string | null
          updated_at: string
          work_days: number[] | null
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          day_schedules?: Json | null
          id?: string
          late_threshold_minutes?: number
          office_id: string
          organization_id: string
          timezone?: string | null
          updated_at?: string
          work_days?: number[] | null
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          day_schedules?: Json | null
          id?: string
          late_threshold_minutes?: number
          office_id?: string
          organization_id?: string
          timezone?: string | null
          updated_at?: string
          work_days?: number[] | null
          work_end_time?: string
          work_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_schedules_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: true
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          google_maps_url: string | null
          id: string
          latitude: number | null
          leave_enabled: boolean | null
          leave_year_start_day: number | null
          leave_year_start_month: number | null
          longitude: number | null
          name: string
          organization_id: string
          place_id: string | null
          public_holidays_enabled: boolean | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          google_maps_url?: string | null
          id?: string
          latitude?: number | null
          leave_enabled?: boolean | null
          leave_year_start_day?: number | null
          leave_year_start_month?: number | null
          longitude?: number | null
          name: string
          organization_id: string
          place_id?: string | null
          public_holidays_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          google_maps_url?: string | null
          id?: string
          latitude?: number | null
          leave_enabled?: boolean | null
          leave_year_start_day?: number | null
          leave_year_start_month?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string
          place_id?: string | null
          public_holidays_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          checklist_items: Json | null
          completed_at: string | null
          completed_steps: Json | null
          current_step: number | null
          id: string
          is_completed: boolean | null
          organization_id: string
          role: string
          started_at: string
          survey_completed: boolean | null
          tour_completed: boolean | null
          user_id: string
        }
        Insert: {
          checklist_items?: Json | null
          completed_at?: string | null
          completed_steps?: Json | null
          current_step?: number | null
          id?: string
          is_completed?: boolean | null
          organization_id: string
          role: string
          started_at?: string
          survey_completed?: boolean | null
          tour_completed?: boolean | null
          user_id: string
        }
        Update: {
          checklist_items?: Json | null
          completed_at?: string | null
          completed_steps?: Json | null
          current_step?: number | null
          id?: string
          is_completed?: boolean | null
          organization_id?: string
          role?: string
          started_at?: string
          survey_completed?: boolean | null
          tour_completed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_onboarding_data: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          departments_roles: Json | null
          enabled_features: Json | null
          hr_settings: Json | null
          id: string
          offices: Json | null
          organization_id: string
          organization_info: Json | null
          owner_profile: Json | null
          owner_user_id: string | null
          skipped: boolean | null
          team_members: Json | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          departments_roles?: Json | null
          enabled_features?: Json | null
          hr_settings?: Json | null
          id?: string
          offices?: Json | null
          organization_id: string
          organization_info?: Json | null
          owner_profile?: Json | null
          owner_user_id?: string | null
          skipped?: boolean | null
          team_members?: Json | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          departments_roles?: Json | null
          enabled_features?: Json | null
          hr_settings?: Json | null
          id?: string
          offices?: Json | null
          organization_id?: string
          organization_info?: Json | null
          owner_profile?: Json | null
          owner_user_id?: string | null
          skipped?: boolean | null
          team_members?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_onboarding_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_phone_numbers: {
        Row: {
          capabilities: Json
          country_code: string
          created_at: string
          friendly_name: string | null
          id: string
          ivr_config: Json | null
          monthly_cost: number
          organization_id: string
          phone_number: string
          status: string
          twilio_sid: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          country_code?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          ivr_config?: Json | null
          monthly_cost?: number
          organization_id: string
          phone_number: string
          status?: string
          twilio_sid: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          country_code?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          ivr_config?: Json | null
          monthly_cost?: number
          organization_id?: string
          phone_number?: string
          status?: string
          twilio_sid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_phone_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          pipeline_id: string
          sort_order: number
          stage_key: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          pipeline_id: string
          sort_order?: number
          stage_key: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          pipeline_id?: string
          sort_order?: number
          stage_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "org_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      org_pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_structure_learning: {
        Row: {
          action: string
          added_to_templates: boolean | null
          business_category: string
          created_at: string | null
          department_name: string | null
          id: string
          organization_id: string
          position_department: string | null
          position_name: string | null
          processed_at: string | null
        }
        Insert: {
          action: string
          added_to_templates?: boolean | null
          business_category: string
          created_at?: string | null
          department_name?: string | null
          id?: string
          organization_id: string
          position_department?: string | null
          position_name?: string | null
          processed_at?: string | null
        }
        Update: {
          action?: string
          added_to_templates?: boolean | null
          business_category?: string
          created_at?: string | null
          department_name?: string | null
          id?: string
          organization_id?: string
          position_department?: string | null
          position_name?: string | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_structure_learning_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_structure_templates: {
        Row: {
          approval_count: number | null
          business_category: string
          company_size: string
          created_at: string | null
          departments: Json
          id: string
          organization_id: string | null
          positions: Json
          source: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          approval_count?: number | null
          business_category: string
          company_size?: string
          created_at?: string | null
          departments?: Json
          id?: string
          organization_id?: string | null
          positions?: Json
          source?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          approval_count?: number | null
          business_category?: string
          company_size?: string
          created_at?: string | null
          departments?: Json
          id?: string
          organization_id?: string | null
          positions?: Json
          source?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_structure_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_coupons: {
        Row: {
          applied_at: string
          applied_by: string | null
          coupon_id: string
          discount_amount: number | null
          id: string
          organization_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          coupon_id: string
          discount_amount?: number | null
          id?: string
          organization_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          coupon_id?: string
          discount_amount?: number | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_features: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          is_enabled: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          organization_id: string
          stripe_payment_method_id: string
          updated_at: string | null
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          organization_id: string
          stripe_payment_method_id: string
          updated_at?: string | null
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string
          stripe_payment_method_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          auto_attendance_adjustments_enabled: boolean
          billing_cycle: string | null
          business_address: string | null
          business_address_components: Json | null
          business_email: string | null
          business_phone: string | null
          business_registration_number: string | null
          careers_header_color: string | null
          careers_page_subtitle: string | null
          careers_page_title: string | null
          company_size: string | null
          country: string | null
          created_at: string
          early_checkout_reason_required: boolean | null
          google_maps_url: string | null
          id: string
          industry: string | null
          latitude: number | null
          legal_business_name: string | null
          logo_url: string | null
          longitude: number | null
          max_day_in_lieu_days: number | null
          max_sessions_per_day: number | null
          multi_session_enabled: boolean | null
          name: string
          org_onboarding_completed: boolean | null
          org_onboarding_step: number | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          place_id: string | null
          plan: string
          rejected_at: string | null
          rejection_reason: string | null
          slug: string
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string
          website: string | null
          workday_hours: number
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_attendance_adjustments_enabled?: boolean
          billing_cycle?: string | null
          business_address?: string | null
          business_address_components?: Json | null
          business_email?: string | null
          business_phone?: string | null
          business_registration_number?: string | null
          careers_header_color?: string | null
          careers_page_subtitle?: string | null
          careers_page_title?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          early_checkout_reason_required?: boolean | null
          google_maps_url?: string | null
          id?: string
          industry?: string | null
          latitude?: number | null
          legal_business_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_day_in_lieu_days?: number | null
          max_sessions_per_day?: number | null
          multi_session_enabled?: boolean | null
          name: string
          org_onboarding_completed?: boolean | null
          org_onboarding_step?: number | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          place_id?: string | null
          plan?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          slug: string
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
          workday_hours?: number
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_attendance_adjustments_enabled?: boolean
          billing_cycle?: string | null
          business_address?: string | null
          business_address_components?: Json | null
          business_email?: string | null
          business_phone?: string | null
          business_registration_number?: string | null
          careers_header_color?: string | null
          careers_page_subtitle?: string | null
          careers_page_title?: string | null
          company_size?: string | null
          country?: string | null
          created_at?: string
          early_checkout_reason_required?: boolean | null
          google_maps_url?: string | null
          id?: string
          industry?: string | null
          latitude?: number | null
          legal_business_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          max_day_in_lieu_days?: number | null
          max_sessions_per_day?: number | null
          multi_session_enabled?: boolean | null
          name?: string
          org_onboarding_completed?: boolean | null
          org_onboarding_step?: number | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          place_id?: string | null
          plan?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          slug?: string
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
          workday_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "organizations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          failed_attempts: number | null
          id: string
          ip_address: string | null
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          failed_attempts?: number | null
          id?: string
          ip_address?: string | null
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          failed_attempts?: number | null
          id?: string
          ip_address?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          organization_id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          reference_number: string | null
          status: string
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          reference_number?: string | null
          status?: string
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_number?: string | null
          status?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_type: string
          description: string
          id: string
          is_manual: boolean
          organization_id: string
          run_item_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deduction_type: string
          description: string
          id?: string
          is_manual?: boolean
          organization_id: string
          run_item_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_type?: string
          description?: string
          id?: string
          is_manual?: boolean
          organization_id?: string
          run_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_deductions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_deductions_run_item_id_fkey"
            columns: ["run_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_earnings: {
        Row: {
          amount: number
          created_at: string
          description: string
          earning_type: string
          id: string
          is_manual: boolean
          is_taxable: boolean
          organization_id: string
          run_item_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          earning_type: string
          id?: string
          is_manual?: boolean
          is_taxable?: boolean
          organization_id: string
          run_item_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          earning_type?: string
          id?: string
          is_manual?: boolean
          is_taxable?: boolean
          organization_id?: string
          run_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_earnings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_earnings_run_item_id_fkey"
            columns: ["run_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_profiles: {
        Row: {
          country: string
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          is_default: boolean
          legal_entity_id: string
          name: string
          organization_id: string
          pay_frequency: string
          standard_hours_per_week: number
          timezone: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          currency?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          is_default?: boolean
          legal_entity_id: string
          name: string
          organization_id: string
          pay_frequency?: string
          standard_hours_per_week?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_default?: boolean
          legal_entity_id?: string
          name?: string
          organization_id?: string
          pay_frequency?: string
          standard_hours_per_week?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_profiles_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_items: {
        Row: {
          adjustment_notes: string | null
          calculation_snapshot: Json | null
          created_at: string
          currency: string
          employee_id: string
          employer_contributions_total: number
          gross_earnings: number
          has_manual_adjustment: boolean
          id: string
          net_pay: number
          organization_id: string
          payroll_run_id: string
          total_deductions: number
          updated_at: string
        }
        Insert: {
          adjustment_notes?: string | null
          calculation_snapshot?: Json | null
          created_at?: string
          currency: string
          employee_id: string
          employer_contributions_total?: number
          gross_earnings?: number
          has_manual_adjustment?: boolean
          id?: string
          net_pay?: number
          organization_id: string
          payroll_run_id: string
          total_deductions?: number
          updated_at?: string
        }
        Update: {
          adjustment_notes?: string | null
          calculation_snapshot?: Json | null
          created_at?: string
          currency?: string
          employee_id?: string
          employer_contributions_total?: number
          gross_earnings?: number
          has_manual_adjustment?: boolean
          id?: string
          net_pay?: number
          organization_id?: string
          payroll_run_id?: string
          total_deductions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          pay_date: string
          payroll_profile_id: string
          period_end: string
          period_start: string
          status: string
          summary_totals: Json | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          pay_date: string
          payroll_profile_id: string
          period_end: string
          period_start: string
          status?: string
          summary_totals?: Json | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          pay_date?: string
          payroll_profile_id?: string
          period_end?: string
          period_start?: string
          status?: string
          summary_totals?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_payroll_profile_id_fkey"
            columns: ["payroll_profile_id"]
            isOneToOne: false
            referencedRelation: "payroll_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          created_at: string
          emailed_at: string | null
          employee_id: string
          generated_at: string
          id: string
          organization_id: string
          payroll_run_item_id: string
          payslip_number: string
          pdf_url: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          emailed_at?: string | null
          employee_id: string
          generated_at?: string
          id?: string
          organization_id: string
          payroll_run_item_id: string
          payslip_number: string
          pdf_url?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          emailed_at?: string | null
          employee_id?: string
          generated_at?: string
          id?: string
          organization_id?: string
          payroll_run_item_id?: string
          payslip_number?: string
          pdf_url?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_item_id_fkey"
            columns: ["payroll_run_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          ai_draft: Json | null
          ai_draft_generated_at: string | null
          competencies: Json | null
          created_at: string
          employee_comments: string | null
          employee_id: string
          goals_next_period: string | null
          id: string
          last_reminder_sent_at: string | null
          manager_submitted_at: string | null
          needs_improvement: string | null
          organization_id: string
          overall_rating: number | null
          reminder_count: number | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          self_goals_next_period: string | null
          self_needs_improvement: string | null
          self_overall_rating: number | null
          self_submitted_at: string | null
          self_what_went_well: string | null
          status: string
          submitted_at: string | null
          template_id: string | null
          updated_at: string
          what_went_well: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          ai_draft?: Json | null
          ai_draft_generated_at?: string | null
          competencies?: Json | null
          created_at?: string
          employee_comments?: string | null
          employee_id: string
          goals_next_period?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          manager_submitted_at?: string | null
          needs_improvement?: string | null
          organization_id: string
          overall_rating?: number | null
          reminder_count?: number | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          self_goals_next_period?: string | null
          self_needs_improvement?: string | null
          self_overall_rating?: number | null
          self_submitted_at?: string | null
          self_what_went_well?: string | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
          what_went_well?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          ai_draft?: Json | null
          ai_draft_generated_at?: string | null
          competencies?: Json | null
          created_at?: string
          employee_comments?: string | null
          employee_id?: string
          goals_next_period?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          manager_submitted_at?: string | null
          needs_improvement?: string | null
          organization_id?: string
          overall_rating?: number | null
          reminder_count?: number | null
          review_period_end?: string
          review_period_start?: string
          reviewer_id?: string
          self_goals_next_period?: string | null
          self_needs_improvement?: string | null
          self_overall_rating?: number | null
          self_submitted_at?: string | null
          self_what_went_well?: string | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
          what_went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "review_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_rules: {
        Row: {
          auto_assign_enabled: boolean
          auto_assignment_template_id: string | null
          auto_reject_after_hours: number | null
          auto_reject_on_deadline: boolean
          created_at: string
          email_trigger_type: string | null
          id: string
          is_active: boolean
          job_id: string | null
          notify_employee_ids: string[] | null
          organization_id: string
          stage_key: string
          updated_at: string
        }
        Insert: {
          auto_assign_enabled?: boolean
          auto_assignment_template_id?: string | null
          auto_reject_after_hours?: number | null
          auto_reject_on_deadline?: boolean
          created_at?: string
          email_trigger_type?: string | null
          id?: string
          is_active?: boolean
          job_id?: string | null
          notify_employee_ids?: string[] | null
          organization_id: string
          stage_key: string
          updated_at?: string
        }
        Update: {
          auto_assign_enabled?: boolean
          auto_assignment_template_id?: string | null
          auto_reject_after_hours?: number | null
          auto_reject_on_deadline?: boolean
          created_at?: string
          email_trigger_type?: string | null
          id?: string
          is_active?: boolean
          job_id?: string | null
          notify_employee_ids?: string[] | null
          organization_id?: string
          stage_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_rules_auto_assignment_template_id_fkey"
            columns: ["auto_assignment_template_id"]
            isOneToOne: false
            referencedRelation: "assignment_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stage_rules_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stage_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          created_at: string
          feature: string
          feature_description: string | null
          feature_name: string | null
          id: string
          is_active: boolean | null
          monthly_limit: number | null
          overage_rate: number | null
          plan: string
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          feature: string
          feature_description?: string | null
          feature_name?: string | null
          id?: string
          is_active?: boolean | null
          monthly_limit?: number | null
          overage_rate?: number | null
          plan: string
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          feature?: string
          feature_description?: string | null
          feature_name?: string | null
          id?: string
          is_active?: boolean | null
          monthly_limit?: number | null
          overage_rate?: number | null
          plan?: string
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string | null
          id: string
          option_text: string
          organization_id: string
          poll_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_text: string
          organization_id: string
          poll_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_text?: string
          organization_id?: string
          poll_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "post_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          option_id: string
          organization_id: string
          poll_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          option_id: string
          organization_id: string
          poll_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          option_id?: string
          organization_id?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "post_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      position_history: {
        Row: {
          change_type: string
          created_at: string
          department: string
          effective_date: string
          employee_id: string
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          manager_id: string | null
          notes: string | null
          organization_id: string | null
          position: string
          salary: number | null
          updated_at: string
        }
        Insert: {
          change_type: string
          created_at?: string
          department: string
          effective_date: string
          employee_id: string
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          manager_id?: string | null
          notes?: string | null
          organization_id?: string | null
          position: string
          salary?: number | null
          updated_at?: string
        }
        Update: {
          change_type?: string
          created_at?: string
          department?: string
          effective_date?: string
          employee_id?: string
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          manager_id?: string | null
          notes?: string | null
          organization_id?: string | null
          position?: string
          salary?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_history_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_history_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          ai_generated_at: string | null
          created_at: string
          department: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          responsibilities: string[] | null
        }
        Insert: {
          ai_generated_at?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          responsibilities?: string[] | null
        }
        Update: {
          ai_generated_at?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          responsibilities?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      post_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          employee_id: string
          id: string
          organization_id: string
          post_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          organization_id: string
          post_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_acknowledgments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_acknowledgments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          employee_id: string
          id: string
          is_deleted: boolean | null
          organization_id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          employee_id: string
          id?: string
          is_deleted?: boolean | null
          organization_id: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          is_deleted?: boolean | null
          organization_id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_departments: {
        Row: {
          created_at: string | null
          department: string
          id: string
          organization_id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          department: string
          id?: string
          organization_id: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          department?: string
          id?: string
          organization_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_departments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_link_previews: {
        Row: {
          created_at: string | null
          description: string | null
          favicon_url: string | null
          id: string
          image_url: string | null
          organization_id: string
          post_id: string
          site_name: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          favicon_url?: string | null
          id?: string
          image_url?: string | null
          organization_id: string
          post_id: string
          site_name?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          favicon_url?: string | null
          id?: string
          image_url?: string | null
          organization_id?: string
          post_id?: string
          site_name?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_link_previews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_link_previews_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string | null
          embed_metadata: Json | null
          embed_type: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          media_type: string
          organization_id: string
          post_id: string
          sort_order: number | null
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string | null
          embed_metadata?: Json | null
          embed_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          media_type: string
          organization_id: string
          post_id: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string | null
          embed_metadata?: Json | null
          embed_type?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          media_type?: string
          organization_id?: string
          post_id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_mentions: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          organization_id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          organization_id: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mentions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_offices: {
        Row: {
          created_at: string | null
          id: string
          office_id: string
          organization_id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          office_id: string
          organization_id: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          office_id?: string
          organization_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_offices_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_polls: {
        Row: {
          allow_multiple: boolean | null
          created_at: string | null
          ends_at: string | null
          id: string
          is_anonymous: boolean | null
          organization_id: string
          post_id: string
          question: string
        }
        Insert: {
          allow_multiple?: boolean | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          organization_id: string
          post_id: string
          question: string
        }
        Update: {
          allow_multiple?: boolean | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          organization_id?: string
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_polls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_projects: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          post_id: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          post_id: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          post_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_projects_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          employee_id: string
          id: string
          organization_id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          employee_id: string
          id?: string
          organization_id: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          employee_id?: string
          id?: string
          organization_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          access_scope: string | null
          ack_reminder_count: number | null
          acknowledgment_deadline: string | null
          content: string
          created_at: string | null
          employee_id: string
          id: string
          is_deleted: boolean | null
          is_pinned: boolean | null
          is_published: boolean | null
          kudos_recipient_ids: string[] | null
          last_ack_reminder_sent_at: string | null
          organization_id: string
          pinned_at: string | null
          pinned_by: string | null
          post_type: string
          requires_acknowledgment: boolean | null
          scheduled_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_scope?: string | null
          ack_reminder_count?: number | null
          acknowledgment_deadline?: string | null
          content: string
          created_at?: string | null
          employee_id: string
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          kudos_recipient_ids?: string[] | null
          last_ack_reminder_sent_at?: string | null
          organization_id: string
          pinned_at?: string | null
          pinned_by?: string | null
          post_type: string
          requires_acknowledgment?: boolean | null
          scheduled_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_scope?: string | null
          ack_reminder_count?: number | null
          acknowledgment_deadline?: string | null
          content?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          kudos_recipient_ids?: string[] | null
          last_ack_reminder_sent_at?: string | null
          organization_id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          post_type?: string
          requires_acknowledgment?: boolean | null
          scheduled_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_summaries: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string | null
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id?: string | null
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string | null
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string
          parsed_content: string | null
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id: string
          parsed_content?: string | null
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string
          parsed_content?: string | null
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          project_lead_id: string | null
          secondary_lead_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          project_lead_id?: string | null
          secondary_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          project_lead_id?: string | null
          secondary_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_lead_id_fkey"
            columns: ["project_lead_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_lead_id_fkey"
            columns: ["project_lead_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_secondary_lead_id_fkey"
            columns: ["secondary_lead_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_secondary_lead_id_fkey"
            columns: ["secondary_lead_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_templates: {
        Row: {
          competencies: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          goals_prompts: string[] | null
          id: string
          is_default: boolean | null
          name: string
          needs_improvement_prompts: string[] | null
          organization_id: string
          updated_at: string
          what_went_well_prompts: string[] | null
        }
        Insert: {
          competencies?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          goals_prompts?: string[] | null
          id?: string
          is_default?: boolean | null
          name: string
          needs_improvement_prompts?: string[] | null
          organization_id: string
          updated_at?: string
          what_went_well_prompts?: string[] | null
        }
        Update: {
          competencies?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          goals_prompts?: string[] | null
          id?: string
          is_default?: boolean | null
          name?: string
          needs_improvement_prompts?: string[] | null
          organization_id?: string
          updated_at?: string
          what_went_well_prompts?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "review_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_components: {
        Row: {
          calculation_method: string
          component_type: string
          created_at: string
          formula: string | null
          id: string
          is_pf_applicable: boolean
          is_ssf_applicable: boolean
          is_super_applicable: boolean
          is_taxable: boolean
          name: string
          organization_id: string
          salary_structure_id: string
          sort_order: number
          value: number
        }
        Insert: {
          calculation_method: string
          component_type: string
          created_at?: string
          formula?: string | null
          id?: string
          is_pf_applicable?: boolean
          is_ssf_applicable?: boolean
          is_super_applicable?: boolean
          is_taxable?: boolean
          name: string
          organization_id: string
          salary_structure_id: string
          sort_order?: number
          value: number
        }
        Update: {
          calculation_method?: string
          component_type?: string
          created_at?: string
          formula?: string | null
          id?: string
          is_pf_applicable?: boolean
          is_ssf_applicable?: boolean
          is_super_applicable?: boolean
          is_taxable?: boolean
          name?: string
          organization_id?: string
          salary_structure_id?: string
          sort_order?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_components_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_components_salary_structure_id_fkey"
            columns: ["salary_structure_id"]
            isOneToOne: false
            referencedRelation: "salary_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structures: {
        Row: {
          base_salary_amount: number
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          organization_id: string
          salary_period: string
          salary_type: string
          updated_at: string
        }
        Insert: {
          base_salary_amount: number
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          organization_id: string
          salary_period?: string
          salary_type?: string
          updated_at?: string
        }
        Update: {
          base_salary_amount?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          salary_period?: string
          salary_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_bookings: {
        Row: {
          answers_json: Json | null
          cancel_token: string
          created_at: string
          end_at_utc: string
          event_type_id: string
          google_event_id: string | null
          google_meet_link: string | null
          host_employee_id: string | null
          id: string
          invitee_contact_id: string | null
          invitee_email: string
          invitee_name: string
          invitee_timezone: string
          notes: string | null
          organization_id: string
          start_at_utc: string
          status: string
          updated_at: string
        }
        Insert: {
          answers_json?: Json | null
          cancel_token?: string
          created_at?: string
          end_at_utc: string
          event_type_id: string
          google_event_id?: string | null
          google_meet_link?: string | null
          host_employee_id?: string | null
          id?: string
          invitee_contact_id?: string | null
          invitee_email: string
          invitee_name: string
          invitee_timezone?: string
          notes?: string | null
          organization_id: string
          start_at_utc: string
          status?: string
          updated_at?: string
        }
        Update: {
          answers_json?: Json | null
          cancel_token?: string
          created_at?: string
          end_at_utc?: string
          event_type_id?: string
          google_event_id?: string | null
          google_meet_link?: string | null
          host_employee_id?: string | null
          id?: string
          invitee_contact_id?: string | null
          invitee_email?: string
          invitee_name?: string
          invitee_timezone?: string
          notes?: string | null
          organization_id?: string
          start_at_utc?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_bookings_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "scheduler_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_bookings_host_employee_id_fkey"
            columns: ["host_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_bookings_host_employee_id_fkey"
            columns: ["host_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_bookings_invitee_contact_id_fkey"
            columns: ["invitee_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_event_hosts: {
        Row: {
          created_at: string
          employee_id: string
          event_type_id: string
          id: string
          is_primary: boolean
          routing_weight: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          event_type_id: string
          id?: string
          is_primary?: boolean
          routing_weight?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          event_type_id?: string
          id?: string
          is_primary?: boolean
          routing_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_event_hosts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_event_hosts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_event_hosts_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "scheduler_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_event_types: {
        Row: {
          config_json: Json
          created_at: string
          creator_user_id: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          location_type: string
          location_value: string | null
          name: string
          organization_id: string
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          creator_user_id: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_type?: string
          location_value?: string | null
          name: string
          organization_id: string
          slug: string
          type?: string
          updated_at?: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          creator_user_id?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_type?: string
          location_value?: string | null
          name?: string
          organization_id?: string
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_event_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_integration_settings: {
        Row: {
          availability_calendar_ids: string[] | null
          created_at: string
          google_access_token: string | null
          google_calendar_connected: boolean
          google_email: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          is_google_meet_enabled: boolean
          organization_id: string
          primary_calendar_id: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_calendar_ids?: string[] | null
          created_at?: string
          google_access_token?: string | null
          google_calendar_connected?: boolean
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          is_google_meet_enabled?: boolean
          organization_id: string
          primary_calendar_id?: string | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_calendar_ids?: string[] | null
          created_at?: string
          google_access_token?: string | null
          google_calendar_connected?: boolean
          google_email?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          is_google_meet_enabled?: boolean
          organization_id?: string
          primary_calendar_id?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_integration_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_test_results: {
        Row: {
          actual_result: string | null
          attack_vector: string | null
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          expected_result: string | null
          id: string
          policy_name: string | null
          recommendation: string | null
          run_id: string
          severity: string | null
          status: string
          table_name: string | null
          test_category: string
          test_name: string
        }
        Insert: {
          actual_result?: string | null
          attack_vector?: string | null
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          expected_result?: string | null
          id?: string
          policy_name?: string | null
          recommendation?: string | null
          run_id: string
          severity?: string | null
          status: string
          table_name?: string | null
          test_category: string
          test_name: string
        }
        Update: {
          actual_result?: string | null
          attack_vector?: string | null
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          expected_result?: string | null
          id?: string
          policy_name?: string | null
          recommendation?: string | null
          run_id?: string
          severity?: string | null
          status?: string
          table_name?: string | null
          test_category?: string
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "security_test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_test_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          critical_failures: number | null
          failed_tests: number | null
          id: string
          passed_tests: number | null
          started_at: string | null
          status: string | null
          summary: Json | null
          test_type: string
          total_tests: number | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          critical_failures?: number | null
          failed_tests?: number | null
          id?: string
          passed_tests?: number | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          test_type: string
          total_tests?: number | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          critical_failures?: number | null
          failed_tests?: number | null
          id?: string
          passed_tests?: number | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          test_type?: string
          total_tests?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      sender_identities: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          from_email: string
          id: string
          is_default: boolean
          is_verified: boolean
          organization_id: string
          reply_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          from_email: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          organization_id: string
          reply_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          from_email?: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          organization_id?: string
          reply_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sender_identities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sender_identities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sender_identities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_security_rules: {
        Row: {
          base_type: string
          caps: Json | null
          country: string
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_rate_percent: number
          employer_rate_percent: number
          id: string
          organization_id: string | null
          payroll_profile_id: string | null
          rule_type: string
        }
        Insert: {
          base_type?: string
          caps?: Json | null
          country: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          employee_rate_percent?: number
          employer_rate_percent?: number
          id?: string
          organization_id?: string | null
          payroll_profile_id?: string | null
          rule_type: string
        }
        Update: {
          base_type?: string
          caps?: Json | null
          country?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_rate_percent?: number
          employer_rate_percent?: number
          id?: string
          organization_id?: string | null
          payroll_profile_id?: string | null
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_security_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_security_rules_payroll_profile_id_fkey"
            columns: ["payroll_profile_id"]
            isOneToOne: false
            referencedRelation: "payroll_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      statutory_rules: {
        Row: {
          config: Json
          country: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          organization_id: string | null
          payroll_profile_id: string | null
          rule_type: string
        }
        Insert: {
          config: Json
          country: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          organization_id?: string | null
          payroll_profile_id?: string | null
          rule_type: string
        }
        Update: {
          config?: Json
          country?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          organization_id?: string | null
          payroll_profile_id?: string | null
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "statutory_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statutory_rules_payroll_profile_id_fkey"
            columns: ["payroll_profile_id"]
            isOneToOne: false
            referencedRelation: "payroll_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          annual_price: number
          created_at: string | null
          currency: string
          description: string | null
          feature_highlights: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          is_public: boolean | null
          monthly_price: number
          name: string
          slug: string
          sort_order: number | null
          stripe_annual_price_id: string | null
          stripe_monthly_price_id: string | null
          tagline: string | null
          trial_days: number
          updated_at: string | null
        }
        Insert: {
          annual_price?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          feature_highlights?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_public?: boolean | null
          monthly_price?: number
          name: string
          slug: string
          sort_order?: number | null
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          tagline?: string | null
          trial_days?: number
          updated_at?: string | null
        }
        Update: {
          annual_price?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          feature_highlights?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_public?: boolean | null
          monthly_price?: number
          name?: string
          slug?: string
          sort_order?: number | null
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          tagline?: string | null
          trial_days?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          dunning_attempts: number | null
          dunning_ends_at: string | null
          dunning_started_at: string | null
          id: string
          last_dunning_attempt_at: string | null
          organization_id: string
          original_trial_ends_at: string | null
          payment_method_type: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_extended_at: string | null
          trial_extended_by: string | null
          trial_extension_reason: string | null
          trial_starts_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dunning_attempts?: number | null
          dunning_ends_at?: string | null
          dunning_started_at?: string | null
          id?: string
          last_dunning_attempt_at?: string | null
          organization_id: string
          original_trial_ends_at?: string | null
          payment_method_type?: string | null
          plan: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_extended_at?: string | null
          trial_extended_by?: string | null
          trial_extension_reason?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dunning_attempts?: number | null
          dunning_ends_at?: string | null
          dunning_started_at?: string | null
          id?: string
          last_dunning_attempt_at?: string | null
          organization_id?: string
          original_trial_ends_at?: string | null
          payment_method_type?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_extended_at?: string | null
          trial_extended_by?: string | null
          trial_extension_reason?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_activity_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_master_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          id: string
          last_used_at: string | null
          target_email: string
          target_user_id: string
          use_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          id?: string
          last_used_at?: string | null
          target_email: string
          target_user_id: string
          use_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          id?: string
          last_used_at?: string | null
          target_email?: string
          target_user_id?: string
          use_count?: number | null
        }
        Relationships: []
      }
      support_articles: {
        Row: {
          category_id: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          helpful_no: number | null
          helpful_yes: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          module: string
          screenshots: Json | null
          slug: string
          sort_order: number | null
          target_roles: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          helpful_no?: number | null
          helpful_yes?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          module: string
          screenshots?: Json | null
          slug: string
          sort_order?: number | null
          target_roles?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          category_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          helpful_no?: number | null
          helpful_yes?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          module?: string
          screenshots?: Json | null
          slug?: string
          sort_order?: number | null
          target_roles?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "support_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_request_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          request_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          request_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_request_activity_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_request_comments: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean
          request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          request_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_request_subscribers: {
        Row: {
          id: string
          request_id: string
          subscribed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          request_id: string
          subscribed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          request_id?: string
          subscribed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_request_subscribers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          admin_notes: string | null
          ai_improved_description: string | null
          assigned_to: string | null
          browser_info: string
          created_at: string
          description: string
          device_type: string
          id: string
          organization_id: string | null
          page_url: string
          priority: Database["public"]["Enums"]["support_request_priority"]
          resolved_at: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["support_request_status"]
          title: string
          type: Database["public"]["Enums"]["support_request_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ai_improved_description?: string | null
          assigned_to?: string | null
          browser_info: string
          created_at?: string
          description: string
          device_type: string
          id?: string
          organization_id?: string | null
          page_url: string
          priority?: Database["public"]["Enums"]["support_request_priority"]
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["support_request_status"]
          title: string
          type?: Database["public"]["Enums"]["support_request_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ai_improved_description?: string | null
          assigned_to?: string | null
          browser_info?: string
          created_at?: string
          description?: string
          device_type?: string
          id?: string
          organization_id?: string | null
          page_url?: string
          priority?: Database["public"]["Enums"]["support_request_priority"]
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["support_request_status"]
          title?: string
          type?: Database["public"]["Enums"]["support_request_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_screenshot_routes: {
        Row: {
          created_at: string
          description: string | null
          feature_name: string
          flow_name: string | null
          flow_order: number | null
          highlight_selector: string | null
          id: string
          is_active: boolean | null
          is_flow_step: boolean | null
          module: string
          requires_auth: boolean | null
          requires_data: boolean | null
          route_template: string
          sample_data_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_name: string
          flow_name?: string | null
          flow_order?: number | null
          highlight_selector?: string | null
          id?: string
          is_active?: boolean | null
          is_flow_step?: boolean | null
          module: string
          requires_auth?: boolean | null
          requires_data?: boolean | null
          route_template: string
          sample_data_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_name?: string
          flow_name?: string | null
          flow_order?: number | null
          highlight_selector?: string | null
          id?: string
          is_active?: boolean | null
          is_flow_step?: boolean | null
          module?: string
          requires_auth?: boolean | null
          requires_data?: boolean | null
          route_template?: string
          sample_data_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_screenshots: {
        Row: {
          ai_description: string | null
          analyzed_at: string | null
          article_id: string | null
          captured_at: string | null
          created_at: string | null
          description: string | null
          error_message: string | null
          feature_context: string | null
          flow_group: string | null
          flow_order: number | null
          highlight_annotation: string | null
          highlight_selector: string | null
          highlight_style: string | null
          id: string
          is_analyzed: boolean | null
          module: string | null
          route_path: string
          status: string | null
          storage_path: string | null
          ui_elements: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_description?: string | null
          analyzed_at?: string | null
          article_id?: string | null
          captured_at?: string | null
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          feature_context?: string | null
          flow_group?: string | null
          flow_order?: number | null
          highlight_annotation?: string | null
          highlight_selector?: string | null
          highlight_style?: string | null
          id?: string
          is_analyzed?: boolean | null
          module?: string | null
          route_path: string
          status?: string | null
          storage_path?: string | null
          ui_elements?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_description?: string | null
          analyzed_at?: string | null
          article_id?: string | null
          captured_at?: string | null
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          feature_context?: string | null
          flow_group?: string | null
          flow_order?: number | null
          highlight_annotation?: string | null
          highlight_selector?: string | null
          highlight_style?: string | null
          id?: string
          is_analyzed?: boolean | null
          module?: string | null
          route_path?: string
          status?: string | null
          storage_path?: string | null
          ui_elements?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_screenshots_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "support_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          task_id: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          task_id: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number | null
          space_id: string
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number | null
          space_id: string
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number | null
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_categories_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "task_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklists: {
        Row: {
          assignee_id: string | null
          created_at: string
          due_date: string | null
          id: string
          is_done: boolean | null
          organization_id: string
          sort_order: number | null
          task_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          organization_id: string
          sort_order?: number | null
          task_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_done?: boolean | null
          organization_id?: string
          sort_order?: number | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklists_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_followers: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_followers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_followers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_followers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_followers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_lists: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          organization_id: string
          sort_order: number
          space_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          organization_id: string
          sort_order?: number
          space_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_lists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "task_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_spaces: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          owner_id: string | null
          parent_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          owner_id?: string | null
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          owner_id?: string | null
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_spaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_spaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_spaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_spaces_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          color: string | null
          id: string
          is_closed: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
          space_id: string
          status_group: string
        }
        Insert: {
          color?: string | null
          id?: string
          is_closed?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
          space_id: string
          status_group?: string
        }
        Update: {
          color?: string | null
          id?: string
          is_closed?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
          space_id?: string
          status_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_statuses_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "task_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_archived: boolean | null
          list_id: string | null
          notification_enabled: boolean | null
          organization_id: string
          priority: string
          recurrence: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          reporter_id: string | null
          sort_order: number | null
          space_id: string
          start_date: string | null
          status_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          list_id?: string | null
          notification_enabled?: boolean | null
          organization_id: string
          priority?: string
          recurrence?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reporter_id?: string | null
          sort_order?: number | null
          space_id: string
          start_date?: string | null
          status_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          list_id?: string | null
          notification_enabled?: boolean | null
          organization_id?: string
          priority?: string
          recurrence?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reporter_id?: string | null
          sort_order?: number | null
          space_id?: string
          start_date?: string | null
          status_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "task_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          organization_id: string
          rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          organization_id: string
          rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          organization_id?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_slabs: {
        Row: {
          country: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          payroll_profile_id: string | null
          rate_percent: number
          slab_max: number | null
          slab_min: number
        }
        Insert: {
          country: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payroll_profile_id?: string | null
          rate_percent: number
          slab_max?: number | null
          slab_min: number
        }
        Update: {
          country?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payroll_profile_id?: string | null
          rate_percent?: number
          slab_max?: number | null
          slab_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_slabs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_slabs_payroll_profile_id_fkey"
            columns: ["payroll_profile_id"]
            isOneToOne: false
            referencedRelation: "payroll_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telephony_usage_logs: {
        Row: {
          cost: number | null
          created_at: string
          direction: string
          duration_seconds: number | null
          event_type: string
          from_number: string | null
          id: string
          metadata: Json | null
          organization_id: string
          phone_number_id: string
          segments: number | null
          to_number: string | null
          twilio_sid: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          direction: string
          duration_seconds?: number | null
          event_type: string
          from_number?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          phone_number_id: string
          segments?: number | null
          to_number?: string | null
          twilio_sid?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          event_type?: string
          from_number?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          phone_number_id?: string
          segments?: number | null
          to_number?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telephony_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telephony_usage_logs_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "org_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      template_departments: {
        Row: {
          business_category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          business_category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          business_category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_employment_types: {
        Row: {
          country_code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_holiday_generations: {
        Row: {
          country_code: string
          generated_at: string | null
          generated_by: string | null
          id: string
          notes: string | null
          status: string | null
          year: number
        }
        Insert: {
          country_code: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          year: number
        }
        Update: {
          country_code?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          year?: number
        }
        Relationships: []
      }
      template_holidays: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          day: number | null
          id: string
          is_active: boolean | null
          is_movable: boolean | null
          month: number
          movable_rule: string | null
          sort_order: number | null
          title: string
          title_local: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          day?: number | null
          id?: string
          is_active?: boolean | null
          is_movable?: boolean | null
          month: number
          movable_rule?: string | null
          sort_order?: number | null
          title: string
          title_local?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          day?: number | null
          id?: string
          is_active?: boolean | null
          is_movable?: boolean | null
          month?: number
          movable_rule?: string | null
          sort_order?: number | null
          title?: string
          title_local?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      template_leave_type_country_defaults: {
        Row: {
          country_code: string
          created_at: string | null
          default_days: number
          id: string
          template_leave_type_id: string
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          default_days?: number
          id?: string
          template_leave_type_id: string
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          default_days?: number
          id?: string
          template_leave_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_leave_type_country_default_template_leave_type_id_fkey"
            columns: ["template_leave_type_id"]
            isOneToOne: false
            referencedRelation: "template_leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      template_leave_types: {
        Row: {
          applies_to_employment_types: string[] | null
          applies_to_gender: string | null
          carry_forward_mode: string | null
          category: string
          country_code: string | null
          created_at: string | null
          default_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_negative_days: number | null
          min_days_advance: number | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          applies_to_employment_types?: string[] | null
          applies_to_gender?: string | null
          carry_forward_mode?: string | null
          category?: string
          country_code?: string | null
          created_at?: string | null
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_negative_days?: number | null
          min_days_advance?: number | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          applies_to_employment_types?: string[] | null
          applies_to_gender?: string | null
          carry_forward_mode?: string | null
          category?: string
          country_code?: string | null
          created_at?: string | null
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_negative_days?: number | null
          min_days_advance?: number | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_positions: {
        Row: {
          business_category: string
          created_at: string | null
          department_name: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          responsibilities: string[] | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          business_category: string
          created_at?: string | null
          department_name: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          responsibilities?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          business_category?: string
          created_at?: string | null
          department_name?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          responsibilities?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_wiki_documents: {
        Row: {
          business_category: string | null
          category: Database["public"]["Enums"]["wiki_template_category"]
          content: string | null
          country_code: string | null
          created_at: string
          description: string | null
          folder_id: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          business_category?: string | null
          category: Database["public"]["Enums"]["wiki_template_category"]
          content?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          business_category?: string | null
          category?: Database["public"]["Enums"]["wiki_template_category"]
          content?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          folder_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_wiki_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "template_wiki_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      template_wiki_folders: {
        Row: {
          business_category: string | null
          country_code: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          business_category?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          business_category?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_wiki_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "template_wiki_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          retry_count: number | null
          run_id: string
          stack_trace: string | null
          status: string
          test_category: string
          test_file: string
          test_name: string
          test_suite: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          retry_count?: number | null
          run_id: string
          stack_trace?: string | null
          status: string
          test_category: string
          test_file: string
          test_name: string
          test_suite?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          retry_count?: number | null
          run_id?: string
          stack_trace?: string | null
          status?: string
          test_category?: string
          test_file?: string
          test_name?: string
          test_suite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          environment: string | null
          failed_tests: number | null
          git_branch: string | null
          git_commit: string | null
          id: string
          passed_tests: number | null
          skipped_tests: number | null
          started_at: string | null
          status: string | null
          summary: Json | null
          test_type: string
          total_tests: number | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          environment?: string | null
          failed_tests?: number | null
          git_branch?: string | null
          git_commit?: string | null
          id?: string
          passed_tests?: number | null
          skipped_tests?: number | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          test_type: string
          total_tests?: number | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          environment?: string | null
          failed_tests?: number | null
          git_branch?: string | null
          git_commit?: string | null
          id?: string
          passed_tests?: number | null
          skipped_tests?: number | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          test_type?: string
          total_tests?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      token_balances: {
        Row: {
          available_tokens: number | null
          created_at: string | null
          id: string
          included_tokens: number | null
          last_reset_at: string | null
          organization_id: string
          period_start: string | null
          purchased_tokens: number | null
          updated_at: string | null
          used_tokens_this_period: number | null
        }
        Insert: {
          available_tokens?: number | null
          created_at?: string | null
          id?: string
          included_tokens?: number | null
          last_reset_at?: string | null
          organization_id: string
          period_start?: string | null
          purchased_tokens?: number | null
          updated_at?: string | null
          used_tokens_this_period?: number | null
        }
        Update: {
          available_tokens?: number | null
          created_at?: string | null
          id?: string
          included_tokens?: number | null
          last_reset_at?: string | null
          organization_id?: string
          period_start?: string | null
          purchased_tokens?: number | null
          updated_at?: string | null
          used_tokens_this_period?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      token_packages: {
        Row: {
          bonus_percentage: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_cents: number
          sort_order: number | null
          tokens: number
        }
        Insert: {
          bonus_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_cents: number
          sort_order?: number | null
          tokens: number
        }
        Update: {
          bonus_percentage?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_cents?: number
          sort_order?: number | null
          tokens?: number
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          amount_cents: number
          bonus_tokens: number | null
          completed_at: string | null
          currency: string | null
          id: string
          organization_id: string
          package_id: string | null
          payment_method: string | null
          payment_reference: string | null
          purchased_at: string | null
          purchased_by: string | null
          status: string | null
          tokens_purchased: number
        }
        Insert: {
          amount_cents: number
          bonus_tokens?: number | null
          completed_at?: string | null
          currency?: string | null
          id?: string
          organization_id: string
          package_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string | null
          tokens_purchased: number
        }
        Update: {
          amount_cents?: number
          bonus_tokens?: number | null
          completed_at?: string | null
          currency?: string | null
          id?: string
          organization_id?: string
          package_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string | null
          tokens_purchased?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "token_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_purchases_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage_daily: {
        Row: {
          completion_tokens: number | null
          date: string
          employee_id: string | null
          estimated_cost_cents: number | null
          id: string
          model: string
          organization_id: string
          prompt_tokens: number | null
          query_count: number | null
          total_tokens: number | null
        }
        Insert: {
          completion_tokens?: number | null
          date?: string
          employee_id?: string | null
          estimated_cost_cents?: number | null
          id?: string
          model: string
          organization_id: string
          prompt_tokens?: number | null
          query_count?: number | null
          total_tokens?: number | null
        }
        Update: {
          completion_tokens?: number | null
          date?: string
          employee_id?: string | null
          estimated_cost_cents?: number | null
          id?: string
          model?: string
          organization_id?: string
          prompt_tokens?: number | null
          query_count?: number | null
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_daily_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_daily_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_daily_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      update_departments: {
        Row: {
          created_at: string | null
          department: string
          id: string
          organization_id: string
          update_id: string
        }
        Insert: {
          created_at?: string | null
          department: string
          id?: string
          organization_id: string
          update_id: string
        }
        Update: {
          created_at?: string | null
          department?: string
          id?: string
          organization_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_departments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_mentions: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string | null
          update_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id?: string | null
          update_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string | null
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_mentions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_mentions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_mentions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_offices: {
        Row: {
          created_at: string | null
          id: string
          office_id: string
          organization_id: string
          update_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          office_id: string
          organization_id: string
          update_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          office_id?: string
          organization_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_offices_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_projects: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          project_id: string
          update_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          update_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_projects_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          access_scope: string | null
          content: string
          created_at: string
          employee_id: string
          id: string
          image_url: string | null
          organization_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          access_scope?: string | null
          content: string
          created_at?: string
          employee_id: string
          id?: string
          image_url?: string | null
          organization_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          access_scope?: string | null
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          image_url?: string | null
          organization_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_alerts: {
        Row: {
          billing_period_start: string
          created_at: string | null
          feature: string
          id: string
          notified_at: string | null
          organization_id: string
          threshold_percent: number
        }
        Insert: {
          billing_period_start: string
          created_at?: string | null
          feature: string
          id?: string
          notified_at?: string | null
          organization_id: string
          threshold_percent: number
        }
        Update: {
          billing_period_start?: string
          created_at?: string | null
          feature?: string
          id?: string
          notified_at?: string | null
          organization_id?: string
          threshold_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_records: {
        Row: {
          billing_period: string
          feature: string
          id: string
          metadata: Json | null
          organization_id: string
          quantity: number
          recorded_at: string
        }
        Insert: {
          billing_period: string
          feature: string
          id?: string
          metadata?: Json | null
          organization_id: string
          quantity?: number
          recorded_at?: string
        }
        Update: {
          billing_period?: string
          feature?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          quantity?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_error_logs: {
        Row: {
          action_attempted: string | null
          breadcrumbs: Json | null
          browser_info: string | null
          component_name: string | null
          console_logs: Json | null
          created_at: string
          device_type: string | null
          error_message: string
          error_pattern_id: string | null
          error_stack: string | null
          error_type: string
          id: string
          linked_support_request_id: string | null
          metadata: Json | null
          network_requests: Json | null
          organization_id: string | null
          page_url: string
          performance_metrics: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          route_history: Json | null
          session_duration_ms: number | null
          severity: string
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_attempted?: string | null
          breadcrumbs?: Json | null
          browser_info?: string | null
          component_name?: string | null
          console_logs?: Json | null
          created_at?: string
          device_type?: string | null
          error_message: string
          error_pattern_id?: string | null
          error_stack?: string | null
          error_type: string
          id?: string
          linked_support_request_id?: string | null
          metadata?: Json | null
          network_requests?: Json | null
          organization_id?: string | null
          page_url: string
          performance_metrics?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_history?: Json | null
          session_duration_ms?: number | null
          severity?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_attempted?: string | null
          breadcrumbs?: Json | null
          browser_info?: string | null
          component_name?: string | null
          console_logs?: Json | null
          created_at?: string
          device_type?: string | null
          error_message?: string
          error_pattern_id?: string | null
          error_stack?: string | null
          error_type?: string
          id?: string
          linked_support_request_id?: string | null
          metadata?: Json | null
          network_requests?: Json | null
          organization_id?: string | null
          page_url?: string
          performance_metrics?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          route_history?: Json | null
          session_duration_ms?: number | null
          severity?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_error_logs_linked_support_request_id_fkey"
            columns: ["linked_support_request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_error_logs_pattern_fk"
            columns: ["error_pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_visits: {
        Row: {
          browser_info: string | null
          device_type: string | null
          id: string
          organization_id: string | null
          page_path: string
          page_title: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          browser_info?: string | null
          device_type?: string | null
          id?: string
          organization_id?: string | null
          page_path: string
          page_title?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          browser_info?: string | null
          device_type?: string | null
          id?: string
          organization_id?: string | null
          page_path?: string
          page_title?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_snapshots: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          baseline_image_path: string | null
          browser: string | null
          created_at: string | null
          current_image_path: string | null
          diff_image_path: string | null
          diff_percentage: number | null
          id: string
          page_name: string
          page_path: string
          status: string | null
          test_run_id: string | null
          viewport: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          baseline_image_path?: string | null
          browser?: string | null
          created_at?: string | null
          current_image_path?: string | null
          diff_image_path?: string | null
          diff_percentage?: number | null
          id?: string
          page_name: string
          page_path: string
          status?: string | null
          test_run_id?: string | null
          viewport?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          baseline_image_path?: string | null
          browser?: string | null
          created_at?: string | null
          current_image_path?: string | null
          diff_image_path?: string | null
          diff_percentage?: number | null
          id?: string
          page_name?: string
          page_path?: string
          status?: string | null
          test_run_id?: string | null
          viewport?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_snapshots_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_accounts: {
        Row: {
          auto_assign_mode: string | null
          business_hours: Json | null
          connected_at: string | null
          created_at: string
          display_name: string | null
          display_phone: string | null
          frequency_cap_per_day: number | null
          id: string
          organization_id: string
          phone_number_id: string
          sla_first_response_target: number | null
          sla_resolution_target: number | null
          status: string
          updated_at: string
          waba_id: string
          webhook_secret: string | null
        }
        Insert: {
          auto_assign_mode?: string | null
          business_hours?: Json | null
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          display_phone?: string | null
          frequency_cap_per_day?: number | null
          id?: string
          organization_id: string
          phone_number_id: string
          sla_first_response_target?: number | null
          sla_resolution_target?: number | null
          status?: string
          updated_at?: string
          waba_id: string
          webhook_secret?: string | null
        }
        Update: {
          auto_assign_mode?: string | null
          business_hours?: Json | null
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          display_phone?: string | null
          frequency_cap_per_day?: number | null
          id?: string
          organization_id?: string
          phone_number_id?: string
          sla_first_response_target?: number | null
          sla_resolution_target?: number | null
          status?: string
          updated_at?: string
          waba_id?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_automations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          edges: Json | null
          id: string
          name: string
          nodes: Json | null
          organization_id: string
          status: Database["public"]["Enums"]["wa_automation_status"]
          trigger_config: Json | null
          trigger_type: Database["public"]["Enums"]["wa_automation_trigger"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          name: string
          nodes?: Json | null
          organization_id: string
          status?: Database["public"]["Enums"]["wa_automation_status"]
          trigger_config?: Json | null
          trigger_type?: Database["public"]["Enums"]["wa_automation_trigger"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          name?: string
          nodes?: Json | null
          organization_id?: string
          status?: Database["public"]["Enums"]["wa_automation_status"]
          trigger_config?: Json | null
          trigger_type?: Database["public"]["Enums"]["wa_automation_trigger"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_campaigns: {
        Row: {
          audience_filters: Json | null
          audience_source: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          scheduled_at: string | null
          started_at: string | null
          stats: Json | null
          status: Database["public"]["Enums"]["wa_campaign_status"]
          template_id: string | null
          throttle_per_second: number | null
          updated_at: string
          variable_mapping: Json | null
        }
        Insert: {
          audience_filters?: Json | null
          audience_source?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json | null
          status?: Database["public"]["Enums"]["wa_campaign_status"]
          template_id?: string | null
          throttle_per_second?: number | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Update: {
          audience_filters?: Json | null
          audience_source?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json | null
          status?: Database["public"]["Enums"]["wa_campaign_status"]
          template_id?: string | null
          throttle_per_second?: number | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_contacts: {
        Row: {
          created_at: string
          crm_contact_id: string | null
          custom_fields: Json | null
          id: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          name: string | null
          opt_in_at: string | null
          opt_in_source: string | null
          opt_in_status: Database["public"]["Enums"]["wa_opt_in_status"]
          organization_id: string
          phone: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_contact_id?: string | null
          custom_fields?: Json | null
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          name?: string | null
          opt_in_at?: string | null
          opt_in_source?: string | null
          opt_in_status?: Database["public"]["Enums"]["wa_opt_in_status"]
          organization_id: string
          phone: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_contact_id?: string | null
          custom_fields?: Json | null
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          name?: string | null
          opt_in_at?: string | null
          opt_in_source?: string | null
          opt_in_status?: Database["public"]["Enums"]["wa_opt_in_status"]
          organization_id?: string
          phone?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_contacts_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversations: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          first_response_at: string | null
          id: string
          last_message_at: string | null
          notes: string | null
          organization_id: string
          resolved_at: string | null
          sla_first_response_minutes: number | null
          sla_resolution_minutes: number | null
          status: Database["public"]["Enums"]["wa_conversation_status"]
          tags: string[] | null
          unread_count: number
          updated_at: string
          wa_contact_id: string
          window_open_until: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          notes?: string | null
          organization_id: string
          resolved_at?: string | null
          sla_first_response_minutes?: number | null
          sla_resolution_minutes?: number | null
          status?: Database["public"]["Enums"]["wa_conversation_status"]
          tags?: string[] | null
          unread_count?: number
          updated_at?: string
          wa_contact_id: string
          window_open_until?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          notes?: string | null
          organization_id?: string
          resolved_at?: string | null
          sla_first_response_minutes?: number | null
          sla_resolution_minutes?: number | null
          status?: Database["public"]["Enums"]["wa_conversation_status"]
          tags?: string[] | null
          unread_count?: number
          updated_at?: string
          wa_contact_id?: string
          window_open_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_wa_contact_id_fkey"
            columns: ["wa_contact_id"]
            isOneToOne: false
            referencedRelation: "wa_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_flow_submissions: {
        Row: {
          conversation_id: string | null
          created_at: string
          data: Json
          flow_id: string
          id: string
          mapped_fields: Json
          organization_id: string
          wa_contact_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          data?: Json
          flow_id: string
          id?: string
          mapped_fields?: Json
          organization_id: string
          wa_contact_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          data?: Json
          flow_id?: string
          id?: string
          mapped_fields?: Json
          organization_id?: string
          wa_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_flow_submissions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_flow_submissions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "wa_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_flow_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_flow_submissions_wa_contact_id_fkey"
            columns: ["wa_contact_id"]
            isOneToOne: false
            referencedRelation: "wa_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_flows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          external_flow_id: string | null
          field_mapping: Json
          id: string
          name: string
          organization_id: string
          screens: Json
          status: string
          submission_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_flow_id?: string | null
          field_mapping?: Json
          id?: string
          name: string
          organization_id: string
          screens?: Json
          status?: string
          submission_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_flow_id?: string | null
          field_mapping?: Json
          id?: string
          name?: string
          organization_id?: string
          screens?: Json
          status?: string
          submission_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["wa_message_direction"]
          error_code: string | null
          error_message: string | null
          id: string
          msg_type: Database["public"]["Enums"]["wa_message_type"]
          organization_id: string
          status: Database["public"]["Enums"]["wa_message_status"]
          status_updated_at: string | null
          template_id: string | null
          wa_message_id: string | null
        }
        Insert: {
          content?: Json
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["wa_message_direction"]
          error_code?: string | null
          error_message?: string | null
          id?: string
          msg_type?: Database["public"]["Enums"]["wa_message_type"]
          organization_id: string
          status?: Database["public"]["Enums"]["wa_message_status"]
          status_updated_at?: string | null
          template_id?: string | null
          wa_message_id?: string | null
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["wa_message_direction"]
          error_code?: string | null
          error_message?: string | null
          id?: string
          msg_type?: Database["public"]["Enums"]["wa_message_type"]
          organization_id?: string
          status?: Database["public"]["Enums"]["wa_message_status"]
          status_updated_at?: string | null
          template_id?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_saved_replies: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          shortcut: string | null
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          shortcut?: string | null
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_saved_replies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_sequences: {
        Row: {
          audience_filters: Json
          audience_source: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          stats: Json
          status: string
          steps: Json
          stop_conditions: Json
          updated_at: string
        }
        Insert: {
          audience_filters?: Json
          audience_source?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          stats?: Json
          status?: string
          steps?: Json
          stop_conditions?: Json
          updated_at?: string
        }
        Update: {
          audience_filters?: Json
          audience_source?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          stats?: Json
          status?: string
          steps?: Json
          stop_conditions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_templates: {
        Row: {
          category: Database["public"]["Enums"]["wa_template_category"]
          components: Json
          created_at: string
          external_template_id: string | null
          id: string
          language: string
          name: string
          organization_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["wa_template_status"]
          updated_at: string
          version: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["wa_template_category"]
          components?: Json
          created_at?: string
          external_template_id?: string | null
          id?: string
          language?: string
          name: string
          organization_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["wa_template_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["wa_template_category"]
          components?: Json
          created_at?: string
          external_template_id?: string | null
          id?: string
          language?: string
          name?: string
          organization_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["wa_template_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "wa_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_survey_responses: {
        Row: {
          completed_at: string
          created_at: string
          how_heard_about_us: string | null
          id: string
          organization_id: string
          primary_goal: string | null
          priority_features: string[] | null
          team_size: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          how_heard_about_us?: string | null
          id?: string
          organization_id: string
          primary_goal?: string | null
          priority_features?: string[] | null
          team_size?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          how_heard_about_us?: string | null
          id?: string
          organization_id?: string
          primary_goal?: string | null
          priority_features?: string[] | null
          team_size?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_survey_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wfh_requests: {
        Row: {
          created_at: string
          days_count: number
          employee_id: string
          end_date: string
          id: string
          organization_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          organization_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          organization_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wfh_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wfh_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wfh_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wfh_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wfh_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_favorites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_folder_departments: {
        Row: {
          created_at: string | null
          department: string
          folder_id: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          department: string
          folder_id: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          department?: string
          folder_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_folder_departments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_folder_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          employee_id: string
          folder_id: string
          id: string
          organization_id: string
          permission: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          employee_id: string
          folder_id: string
          id?: string
          organization_id: string
          permission?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          employee_id?: string
          folder_id?: string
          id?: string
          organization_id?: string
          permission?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_folder_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_members_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_folder_offices: {
        Row: {
          created_at: string | null
          folder_id: string
          id: string
          office_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          folder_id: string
          id?: string
          office_id: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          folder_id?: string
          id?: string
          office_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_folder_offices_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_folder_projects: {
        Row: {
          created_at: string | null
          folder_id: string
          id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          folder_id: string
          id?: string
          organization_id: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          folder_id?: string
          id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_folder_projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folder_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_folders: {
        Row: {
          access_scope: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          permission_level: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          access_scope?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          permission_level?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          access_scope?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          permission_level?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_comments: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          page_id: string
          parent_comment_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          page_id: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          page_id?: string
          parent_comment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_comments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "wiki_page_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_departments: {
        Row: {
          created_at: string | null
          department: string
          id: string
          organization_id: string
          page_id: string
        }
        Insert: {
          created_at?: string | null
          department: string
          id?: string
          organization_id: string
          page_id: string
        }
        Update: {
          created_at?: string | null
          department?: string
          id?: string
          organization_id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_departments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          organization_id: string
          page_id: string
          permission: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          organization_id: string
          page_id: string
          permission?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          page_id?: string
          permission?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_members_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_offices: {
        Row: {
          created_at: string | null
          id: string
          office_id: string
          organization_id: string
          page_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          office_id: string
          organization_id: string
          page_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          office_id?: string
          organization_id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_offices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_offices_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_projects: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          page_id: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          page_id: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          page_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_projects_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_versions: {
        Row: {
          content: string | null
          created_at: string
          edited_by: string
          id: string
          organization_id: string
          page_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          edited_by: string
          id?: string
          organization_id: string
          page_id: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          edited_by?: string
          id?: string
          organization_id?: string
          page_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_pages: {
        Row: {
          access_scope: string | null
          content: string | null
          created_at: string
          created_by: string
          file_type: string | null
          file_url: string | null
          folder_id: string | null
          id: string
          inherit_from_folder: boolean | null
          is_file: boolean | null
          organization_id: string
          permission_level: string | null
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_scope?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          inherit_from_folder?: boolean | null
          is_file?: boolean | null
          organization_id: string
          permission_level?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_scope?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          file_type?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          inherit_from_folder?: boolean | null
          is_file?: boolean | null
          organization_id?: string
          permission_level?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          employee_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          workflow_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          workflow_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_activity_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_activity_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_activity_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "employee_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_attachments: {
        Row: {
          created_at: string
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string
          stage_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id: string
          stage_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string
          stage_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_attachments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_attachments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_attachments_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_attachments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "employee_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_note_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_employee_id: string
          note_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_employee_id: string
          note_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_employee_id?: string
          note_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_note_mentions_mentioned_employee_id_fkey"
            columns: ["mentioned_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_note_mentions_mentioned_employee_id_fkey"
            columns: ["mentioned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "workflow_stage_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_note_mentions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_notes: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          parent_id: string | null
          stage_id: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          parent_id?: string | null
          stage_id: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          parent_id?: string | null
          stage_id?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_notes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workflow_stage_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_notes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stage_notes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "employee_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_task_attachments: {
        Row: {
          created_at: string
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_task_attachments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_attachments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "employee_workflow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_task_categories: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_task_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_task_checklists: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          organization_id: string
          sort_order: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          organization_id: string
          sort_order?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          organization_id?: string
          sort_order?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_task_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "employee_workflow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_task_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          mentioned_employee_id: string
          organization_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          mentioned_employee_id: string
          organization_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          mentioned_employee_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_task_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "workflow_task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_comment_mentions_mentioned_employee_id_fkey"
            columns: ["mentioned_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_comment_mentions_mentioned_employee_id_fkey"
            columns: ["mentioned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_comment_mentions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_task_comments: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_task_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_comments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "employee_workflow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_task_statuses: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          parent_status: string
          sort_order: number | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          parent_status: string
          sort_order?: number | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          parent_status?: string
          sort_order?: number | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_task_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_task_statuses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_template_tasks: {
        Row: {
          assignee_id: string | null
          assignee_type: string
          category: string
          created_at: string | null
          description: string | null
          due_days_offset: number | null
          id: string
          is_required: boolean | null
          organization_id: string
          sort_order: number | null
          stage_id: string | null
          template_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_type: string
          category: string
          created_at?: string | null
          description?: string | null
          due_days_offset?: number | null
          id?: string
          is_required?: boolean | null
          organization_id: string
          sort_order?: number | null
          stage_id?: string | null
          template_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          assignee_type?: string
          category?: string
          created_at?: string | null
          description?: string | null
          due_days_offset?: number | null
          id?: string
          is_required?: boolean | null
          organization_id?: string
          sort_order?: number | null
          stage_id?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_template_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          auto_advance_stages: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          auto_advance_stages?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          auto_advance_stages?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          organization_id: string
          trigger_condition: string
          trigger_event: string
          trigger_field: string
          trigger_value: string | null
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          organization_id: string
          trigger_condition: string
          trigger_event: string
          trigger_field: string
          trigger_value?: string | null
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          organization_id?: string
          trigger_condition?: string
          trigger_event?: string
          trigger_field?: string
          trigger_value?: string | null
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_usage_monthly_summary: {
        Row: {
          avg_latency_ms: number | null
          general_queries: number | null
          internal_queries: number | null
          model_distribution: Json | null
          month: string | null
          organization_id: string | null
          total_cost: number | null
          total_queries: number | null
          total_tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_summary: {
        Row: {
          absent_days: number | null
          avg_work_hours: number | null
          employee_id: string | null
          half_days: number | null
          late_days: number | null
          month: string | null
          present_days: number | null
          total_days: number | null
          total_work_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_directory: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          department: string | null
          email: string | null
          employee_onboarding_completed: boolean | null
          full_name: string | null
          id: string | null
          is_new_hire: boolean | null
          join_date: string | null
          manager_id: string | null
          office_id: string | null
          office_name: string | null
          organization_id: string | null
          position: string | null
          status: string | null
          user_id: string | null
          work_location: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_blog_posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          canonical_url: string | null
          category: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string | null
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          published_at: string | null
          reading_time_minutes: number | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_space_member: {
        Args: { _employee_id: string; _role?: string; _space_id: string }
        Returns: string
      }
      admin_exists: { Args: never; Returns: boolean }
      bulk_reassign_direct_reports: {
        Args: {
          p_employee_ids: string[]
          p_new_manager_id: string
          p_organization_id: string
        }
        Returns: boolean
      }
      bulk_reassign_tasks: {
        Args: {
          p_new_assignee_id: string
          p_organization_id: string
          p_task_ids: string[]
        }
        Returns: boolean
      }
      bulk_transfer_individual_kpis: {
        Args: {
          p_kpi_ids: string[]
          p_new_owner_id: string
          p_organization_id: string
        }
        Returns: boolean
      }
      bulk_transfer_kpi_ownership: {
        Args: {
          p_kpi_ids: string[]
          p_new_owner_id: string
          p_old_owner_id: string
          p_organization_id: string
        }
        Returns: boolean
      }
      bulk_transfer_project_leads: {
        Args: {
          p_new_lead_id: string
          p_organization_id: string
          p_project_ids: string[]
          p_role: string
        }
        Returns: boolean
      }
      bulk_transfer_wiki_items: {
        Args: {
          p_folder_ids: string[]
          p_new_owner_id: string
          p_organization_id: string
          p_page_ids: string[]
        }
        Returns: boolean
      }
      calculate_kpi_rollup: { Args: { parent_id: string }; Returns: number }
      calculate_prorated_leave_monthly: {
        Args: {
          p_default_days: number
          p_end_date: string
          p_start_date: string
        }
        Returns: number
      }
      calculate_trending_scores: { Args: never; Returns: undefined }
      can_edit_wiki_item: {
        Args: { _item_id: string; _item_type: string; _user_id?: string }
        Returns: boolean
      }
      can_insert_post: {
        Args: {
          _employee_id: string
          _organization_id: string
          _post_type: string
        }
        Returns: boolean
      }
      can_insert_update: {
        Args: { _employee_id: string; _organization_id: string }
        Returns: boolean
      }
      can_post_in_space: {
        Args: { p_employee_id: string; p_space_id: string }
        Returns: boolean
      }
      can_view_employee_sensitive_data: {
        Args: { _employee_id: string }
        Returns: boolean
      }
      can_view_kudos: {
        Args: { _kudos_id: string; _user_id?: string }
        Returns: boolean
      }
      can_view_post: {
        Args: { _post_id: string; _user_id?: string }
        Returns: boolean
      }
      can_view_profile: { Args: { _profile_id: string }; Returns: boolean }
      can_view_update: {
        Args: { _update_id: string; _user_id?: string }
        Returns: boolean
      }
      can_view_wiki_item: {
        Args: { _item_id: string; _item_type: string; _user_id?: string }
        Returns: boolean
      }
      check_feature_limit: {
        Args: {
          _feature: string
          _increment?: number
          _organization_id: string
        }
        Returns: Json
      }
      create_post_for_current_user: {
        Args: {
          _access_scope?: string
          _content: string
          _is_published?: boolean
          _post_type: string
          _scheduled_at?: string
        }
        Returns: string
      }
      create_wiki_page: {
        Args: { _folder_id?: string; _organization_id: string; _title?: string }
        Returns: string
      }
      create_workflow_from_template: {
        Args: {
          p_created_by?: string
          p_employee_id: string
          p_organization_id: string
          p_target_date: string
          p_workflow_type: string
        }
        Returns: string
      }
      debug_can_insert_post: {
        Args: {
          _employee_id: string
          _organization_id: string
          _post_type: string
        }
        Returns: Json
      }
      deduct_ai_tokens: {
        Args: { model_name?: string; org_id: string; tokens_used: number }
        Returns: Json
      }
      delete_wiki_folder_recursive: {
        Args: { _folder_id: string }
        Returns: boolean
      }
      generate_error_pattern_key: {
        Args: {
          p_action_attempted: string
          p_component_name: string
          p_error_type: string
        }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_accessible_ai_content: {
        Args: {
          _content_types?: string[]
          _limit?: number
          _organization_id: string
          _user_id: string
        }
        Returns: {
          content: string
          content_type: string
          id: string
          metadata: Json
          title: string
        }[]
      }
      get_admin_users_overview: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          last_active_at: string
          organizations: Json
          roles: string[]
          status: string
          total_activities: number
          total_page_visits: number
        }[]
      }
      get_birthday_calendar_data: {
        Args: { org_id: string }
        Returns: {
          avatar_url: string
          birthday_month_day: string
          employee_id: string
          full_name: string
          join_date: string
        }[]
      }
      get_current_employee_id: { Args: never; Returns: string }
      get_current_employee_id_for_org: {
        Args: { _org_id: string }
        Returns: string
      }
      get_employee_activity_timeline: {
        Args: {
          p_end_date?: string
          p_event_types?: string[]
          p_limit?: number
          p_offset?: number
          p_start_date?: string
          target_employee_id: string
        }
        Returns: {
          access_level: string
          actor_avatar: string
          actor_id: string
          actor_name: string
          description: string
          event_category: string
          event_id: string
          event_timestamp: string
          event_type: string
          metadata: Json
          title: string
        }[]
      }
      get_employee_for_viewer:
        | {
            Args: { p_employee_id: string; p_viewer_id: string }
            Returns: {
              emp_bank_details: string
              emp_city: string
              emp_contract_end_date: string
              emp_country: string
              emp_created_at: string
              emp_date_of_birth: string
              emp_department: string
              emp_emergency_contact_name: string
              emp_emergency_contact_phone: string
              emp_emergency_contact_relationship: string
              emp_gender: string
              emp_id: string
              emp_id_number: string
              emp_is_new_hire: boolean
              emp_join_date: string
              emp_last_working_day: string
              emp_manager_id: string
              emp_office_id: string
              emp_organization_id: string
              emp_personal_email: string
              emp_phone: string
              emp_position: string
              emp_position_effective_date: string
              emp_postcode: string
              emp_remuneration: number
              emp_remuneration_currency: string
              emp_resignation_submitted_at: string
              emp_salary: number
              emp_state: string
              emp_status: string
              emp_street: string
              emp_superpowers: string[]
              emp_tax_number: string
              emp_updated_at: string
              emp_user_id: string
              profile_avatar_url: string
              profile_email: string
              profile_full_name: string
            }[]
          }
        | {
            Args: { target_employee_id: string }
            Returns: {
              emp_bank_details: string
              emp_city: string
              emp_country: string
              emp_created_at: string
              emp_date_of_birth: string
              emp_department: string
              emp_emergency_contact_name: string
              emp_emergency_contact_phone: string
              emp_emergency_contact_relationship: string
              emp_employment_type: string
              emp_gender: string
              emp_id: string
              emp_id_number: string
              emp_join_date: string
              emp_last_working_day: string
              emp_manager_id: string
              emp_office_id: string
              emp_organization_id: string
              emp_personal_email: string
              emp_phone: string
              emp_position: string
              emp_position_effective_date: string
              emp_postcode: string
              emp_remuneration: number
              emp_remuneration_currency: string
              emp_salary: number
              emp_state: string
              emp_status: string
              emp_street: string
              emp_superpowers: string[]
              emp_tax_number: string
              emp_user_id: string
            }[]
          }
      get_employee_offboard_data: {
        Args: { p_employee_id: string; p_organization_id: string }
        Returns: Json
      }
      get_last_messages_batch: {
        Args: { conversation_ids: string[] }
        Returns: {
          content: string
          content_type: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }[]
      }
      get_organization_usage:
        | {
            Args: { _billing_period?: string; _organization_id: string }
            Returns: {
              feature: string
              monthly_limit: number
              overage_rate: number
              quantity: number
            }[]
          }
        | {
            Args: { _billing_period?: string; _organization_id: string }
            Returns: {
              feature: string
              monthly_limit: number
              overage_rate: number
              quantity: number
            }[]
          }
      get_position_history_for_viewer: {
        Args: { target_employee_id: string }
        Returns: {
          ph_change_type: string
          ph_department: string
          ph_effective_date: string
          ph_employment_type: string
          ph_end_date: string
          ph_id: string
          ph_is_current: boolean
          ph_manager_id: string
          ph_manager_name: string
          ph_notes: string
          ph_position: string
          ph_salary: number
        }[]
      }
      get_unread_counts_batch: {
        Args: { _employee_id: string; _organization_id: string }
        Returns: {
          context_id: string
          context_type: string
          unread_count: number
        }[]
      }
      get_unread_messages: {
        Args: {
          p_employee_id: string
          p_limit?: number
          p_organization_id: string
        }
        Returns: {
          content: string
          content_type: string
          conversation_id: string
          conversation_is_group: boolean
          conversation_name: string
          created_at: string
          id: string
          sender_avatar_url: string
          sender_employee_id: string
          sender_full_name: string
          space_icon_url: string
          space_id: string
          space_name: string
        }[]
      }
      get_user_crm_org_id: { Args: never; Returns: string }
      get_user_org_ids: { Args: never; Returns: string[] }
      get_user_organizations: { Args: { _user_id: string }; Returns: string[] }
      get_user_space_ids: {
        Args: { _user_id: string }
        Returns: {
          space_id: string
        }[]
      }
      get_wiki_folder_contents_count: {
        Args: { _folder_id: string }
        Returns: {
          file_count: number
          folder_count: number
          page_count: number
        }[]
      }
      get_wiki_item_members: {
        Args: { _item_id: string; _item_type: string }
        Returns: {
          added_at: string
          added_by_name: string
          avatar_url: string
          email: string
          employee_id: string
          full_name: string
          permission: string
          user_id: string
        }[]
      }
      has_hiring_access: {
        Args: { check_organization_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_template_approval: {
        Args: { p_category: string; p_size?: string }
        Returns: undefined
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _employee_id: string }
        Returns: boolean
      }
      is_employee_in_same_org: {
        Args: { _employee_org_id: string }
        Returns: boolean
      }
      is_feature_enabled: {
        Args: { _feature_name: string; _org_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { p_conversation_id: string; p_employee_id: string }
        Returns: boolean
      }
      is_manager_of_employee: {
        Args: { _employee_id: string }
        Returns: boolean
      }
      is_org_admin_or_owner: {
        Args: { p_employee_id: string; p_org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_own_employee: { Args: { _employee_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id?: string }; Returns: boolean }
      is_space_admin: {
        Args: { _employee_id: string; _space_id: string }
        Returns: boolean
      }
      is_space_member: {
        Args: { _employee_id: string; _space_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      match_knowledge_embeddings: {
        Args: {
          employee_id?: string
          manager_employee_ids?: string[]
          match_count?: number
          match_threshold?: number
          org_id?: string
          query_embedding: string
          user_role?: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
          source_type: string
          title: string
        }[]
      }
      owns_comment: { Args: { _comment_id: string }; Returns: boolean }
      owns_post: { Args: { _post_id: string }; Returns: boolean }
      owns_update: { Args: { _update_id: string }; Returns: boolean }
      record_remote_attendance: {
        Args: {
          _action: string
          _early_checkout_reason?: string
          _location_name?: string
          _user_latitude?: number
          _user_longitude?: number
        }
        Returns: Json
      }
      record_usage: {
        Args: { _feature: string; _organization_id: string; _quantity?: number }
        Returns: undefined
      }
      reset_monthly_token_usage: { Args: never; Returns: undefined }
      seed_default_workflow_data: {
        Args: { org_id: string }
        Returns: undefined
      }
      seed_workflow_task_defaults: {
        Args: { p_organization_id: string; p_template_id: string }
        Returns: undefined
      }
      soft_delete_comment: { Args: { _comment_id: string }; Returns: boolean }
      transfer_wiki_ownership: {
        Args: { _item_id: string; _item_type: string; _new_owner_id: string }
        Returns: boolean
      }
      user_is_campaign_manager: { Args: { org_id: string }; Returns: boolean }
      validate_qr_and_record_attendance:
        | {
            Args: {
              _action: string
              _early_checkout_reason?: string
              _qr_code: string
              _user_latitude?: number
              _user_longitude?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_action: string
              p_latitude?: number
              p_longitude?: number
              p_qr_code: string
            }
            Returns: Json
          }
    }
    Enums: {
      accounting_account_type:
        | "asset"
        | "liability"
        | "equity"
        | "revenue"
        | "expense"
      accounting_bill_status:
        | "draft"
        | "approved"
        | "paid"
        | "partially_paid"
        | "overdue"
        | "voided"
      accounting_contact_type: "customer" | "supplier" | "both"
      accounting_invoice_status:
        | "draft"
        | "approved"
        | "sent"
        | "paid"
        | "partially_paid"
        | "overdue"
        | "voided"
      accounting_scope_type: "OFFICE_SINGLE" | "OFFICE_SET" | "ORG_WIDE"
      accounting_setup_status: "draft" | "active" | "archived"
      app_role: "admin" | "hr" | "user" | "super_admin" | "owner" | "member"
      application_stage:
        | "applied"
        | "screening"
        | "assignment"
        | "interview_1"
        | "interview_2"
        | "interview_3"
        | "offer"
        | "hired"
        | "rejected"
      application_status:
        | "active"
        | "on_hold"
        | "withdrawn"
        | "rejected"
        | "hired"
      assignment_status:
        | "assigned"
        | "in_progress"
        | "submitted"
        | "overdue"
        | "reviewed"
      assignment_type:
        | "coding"
        | "writing"
        | "design"
        | "case_study"
        | "general"
      bank_statement_line_status:
        | "unmatched"
        | "matched"
        | "reconciled"
        | "excluded"
      candidate_source:
        | "careers_site"
        | "internal"
        | "referral"
        | "manual"
        | "job_board"
        | "linkedin"
        | "other"
      chat_space_access: "public" | "private"
      chat_space_access_scope:
        | "company"
        | "offices"
        | "projects"
        | "members"
        | "custom"
      chat_space_type: "collaboration" | "announcements" | "project"
      hiring_activity_action:
        | "job_created"
        | "job_submitted"
        | "job_approved"
        | "job_published"
        | "job_paused"
        | "job_closed"
        | "candidate_created"
        | "application_created"
        | "stage_changed"
        | "assignment_assigned"
        | "assignment_submitted"
        | "assignment_reviewed"
        | "interview_scheduled"
        | "interview_completed"
        | "scorecard_submitted"
        | "offer_created"
        | "offer_approved"
        | "offer_sent"
        | "offer_accepted"
        | "offer_declined"
        | "hired"
        | "email_sent"
        | "note_added"
      hiring_employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "temporary"
      inbox_channel_type:
        | "whatsapp"
        | "telegram"
        | "messenger"
        | "instagram"
        | "tiktok"
        | "email"
      inbox_conversation_status: "open" | "pending" | "snoozed" | "closed"
      inbox_delivery_status:
        | "pending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      inbox_message_direction: "inbound" | "outbound"
      inbox_message_type:
        | "text"
        | "image"
        | "video"
        | "document"
        | "audio"
        | "template"
        | "interactive"
        | "system"
        | "note"
      interview_recommendation:
        | "strong_yes"
        | "yes"
        | "neutral"
        | "no"
        | "strong_no"
      interview_status: "scheduled" | "completed" | "cancelled" | "no_show"
      job_status:
        | "draft"
        | "submitted"
        | "approved"
        | "open"
        | "paused"
        | "closed"
      journal_status: "draft" | "posted" | "reversed"
      offer_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "sent"
        | "accepted"
        | "declined"
        | "expired"
      support_request_priority: "low" | "medium" | "high" | "critical"
      support_request_status:
        | "new"
        | "triaging"
        | "in_progress"
        | "resolved"
        | "closed"
        | "wont_fix"
      support_request_type: "bug" | "feature"
      wa_automation_status: "draft" | "active" | "paused"
      wa_automation_trigger:
        | "message_received"
        | "keyword"
        | "new_contact"
        | "tag_added"
        | "flow_submitted"
      wa_campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "failed"
        | "cancelled"
      wa_conversation_status: "open" | "assigned" | "resolved" | "closed"
      wa_message_direction: "inbound" | "outbound"
      wa_message_status: "pending" | "sent" | "delivered" | "read" | "failed"
      wa_message_type:
        | "text"
        | "image"
        | "video"
        | "document"
        | "template"
        | "interactive"
        | "flow"
      wa_opt_in_status: "opted_in" | "opted_out" | "pending"
      wa_template_category: "marketing" | "utility" | "authentication"
      wa_template_status: "draft" | "pending" | "approved" | "rejected"
      wiki_template_category:
        | "policies"
        | "sops"
        | "business_plans"
        | "hr_documents"
        | "compliance"
        | "operations"
      work_model: "onsite" | "hybrid" | "remote"
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
    Enums: {
      accounting_account_type: [
        "asset",
        "liability",
        "equity",
        "revenue",
        "expense",
      ],
      accounting_bill_status: [
        "draft",
        "approved",
        "paid",
        "partially_paid",
        "overdue",
        "voided",
      ],
      accounting_contact_type: ["customer", "supplier", "both"],
      accounting_invoice_status: [
        "draft",
        "approved",
        "sent",
        "paid",
        "partially_paid",
        "overdue",
        "voided",
      ],
      accounting_scope_type: ["OFFICE_SINGLE", "OFFICE_SET", "ORG_WIDE"],
      accounting_setup_status: ["draft", "active", "archived"],
      app_role: ["admin", "hr", "user", "super_admin", "owner", "member"],
      application_stage: [
        "applied",
        "screening",
        "assignment",
        "interview_1",
        "interview_2",
        "interview_3",
        "offer",
        "hired",
        "rejected",
      ],
      application_status: [
        "active",
        "on_hold",
        "withdrawn",
        "rejected",
        "hired",
      ],
      assignment_status: [
        "assigned",
        "in_progress",
        "submitted",
        "overdue",
        "reviewed",
      ],
      assignment_type: ["coding", "writing", "design", "case_study", "general"],
      bank_statement_line_status: [
        "unmatched",
        "matched",
        "reconciled",
        "excluded",
      ],
      candidate_source: [
        "careers_site",
        "internal",
        "referral",
        "manual",
        "job_board",
        "linkedin",
        "other",
      ],
      chat_space_access: ["public", "private"],
      chat_space_access_scope: [
        "company",
        "offices",
        "projects",
        "members",
        "custom",
      ],
      chat_space_type: ["collaboration", "announcements", "project"],
      hiring_activity_action: [
        "job_created",
        "job_submitted",
        "job_approved",
        "job_published",
        "job_paused",
        "job_closed",
        "candidate_created",
        "application_created",
        "stage_changed",
        "assignment_assigned",
        "assignment_submitted",
        "assignment_reviewed",
        "interview_scheduled",
        "interview_completed",
        "scorecard_submitted",
        "offer_created",
        "offer_approved",
        "offer_sent",
        "offer_accepted",
        "offer_declined",
        "hired",
        "email_sent",
        "note_added",
      ],
      hiring_employment_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
      ],
      inbox_channel_type: [
        "whatsapp",
        "telegram",
        "messenger",
        "instagram",
        "tiktok",
        "email",
      ],
      inbox_conversation_status: ["open", "pending", "snoozed", "closed"],
      inbox_delivery_status: ["pending", "sent", "delivered", "read", "failed"],
      inbox_message_direction: ["inbound", "outbound"],
      inbox_message_type: [
        "text",
        "image",
        "video",
        "document",
        "audio",
        "template",
        "interactive",
        "system",
        "note",
      ],
      interview_recommendation: [
        "strong_yes",
        "yes",
        "neutral",
        "no",
        "strong_no",
      ],
      interview_status: ["scheduled", "completed", "cancelled", "no_show"],
      job_status: [
        "draft",
        "submitted",
        "approved",
        "open",
        "paused",
        "closed",
      ],
      journal_status: ["draft", "posted", "reversed"],
      offer_status: [
        "draft",
        "pending_approval",
        "approved",
        "sent",
        "accepted",
        "declined",
        "expired",
      ],
      support_request_priority: ["low", "medium", "high", "critical"],
      support_request_status: [
        "new",
        "triaging",
        "in_progress",
        "resolved",
        "closed",
        "wont_fix",
      ],
      support_request_type: ["bug", "feature"],
      wa_automation_status: ["draft", "active", "paused"],
      wa_automation_trigger: [
        "message_received",
        "keyword",
        "new_contact",
        "tag_added",
        "flow_submitted",
      ],
      wa_campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "failed",
        "cancelled",
      ],
      wa_conversation_status: ["open", "assigned", "resolved", "closed"],
      wa_message_direction: ["inbound", "outbound"],
      wa_message_status: ["pending", "sent", "delivered", "read", "failed"],
      wa_message_type: [
        "text",
        "image",
        "video",
        "document",
        "template",
        "interactive",
        "flow",
      ],
      wa_opt_in_status: ["opted_in", "opted_out", "pending"],
      wa_template_category: ["marketing", "utility", "authentication"],
      wa_template_status: ["draft", "pending", "approved", "rejected"],
      wiki_template_category: [
        "policies",
        "sops",
        "business_plans",
        "hr_documents",
        "compliance",
        "operations",
      ],
      work_model: ["onsite", "hybrid", "remote"],
    },
  },
} as const

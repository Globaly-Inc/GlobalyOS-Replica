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
      ai_indexing_status: {
        Row: {
          created_at: string | null
          id: string
          last_chat_index: string | null
          last_full_index: string | null
          last_team_index: string | null
          last_wiki_index: string | null
          next_scheduled_index: string | null
          organization_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_chat_index?: string | null
          last_full_index?: string | null
          last_team_index?: string | null
          last_wiki_index?: string | null
          next_scheduled_index?: string | null
          organization_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_chat_index?: string | null
          last_full_index?: string | null
          last_team_index?: string | null
          last_wiki_index?: string | null
          next_scheduled_index?: string | null
          organization_id?: string
          status?: string | null
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
      ai_knowledge_settings: {
        Row: {
          announcements_enabled: boolean
          attendance_enabled: boolean
          calendar_enabled: boolean
          chat_enabled: boolean
          created_at: string | null
          id: string
          kpis_enabled: boolean
          leave_enabled: boolean
          organization_id: string
          projects_enabled: boolean
          team_directory_enabled: boolean
          updated_at: string | null
          wiki_enabled: boolean
        }
        Insert: {
          announcements_enabled?: boolean
          attendance_enabled?: boolean
          calendar_enabled?: boolean
          chat_enabled?: boolean
          created_at?: string | null
          id?: string
          kpis_enabled?: boolean
          leave_enabled?: boolean
          organization_id: string
          projects_enabled?: boolean
          team_directory_enabled?: boolean
          updated_at?: string | null
          wiki_enabled?: boolean
        }
        Update: {
          announcements_enabled?: boolean
          attendance_enabled?: boolean
          calendar_enabled?: boolean
          chat_enabled?: boolean
          created_at?: string | null
          id?: string
          kpis_enabled?: boolean
          leave_enabled?: boolean
          organization_id?: string
          projects_enabled?: boolean
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
            foreignKeyName: "attendance_leave_adjustments_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
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
          space_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          space_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
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
        }
        Insert: {
          conversation_id: string
          employee_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          organization_id: string
        }
        Update: {
          conversation_id?: string
          employee_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          organization_id?: string
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
      chat_space_members: {
        Row: {
          employee_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          notification_setting: string
          organization_id: string
          role: string
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
      daily_horoscopes: {
        Row: {
          content: string
          created_at: string | null
          horoscope_date: string
          id: string
          zodiac_sign: string
        }
        Insert: {
          content: string
          created_at?: string | null
          horoscope_date?: string
          id?: string
          zodiac_sign: string
        }
        Update: {
          content?: string
          created_at?: string | null
          horoscope_date?: string
          id?: string
          zodiac_sign?: string
        }
        Relationships: []
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
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employment_type: string | null
          gender: string | null
          id: string
          id_number: string | null
          is_new_hire: boolean | null
          join_date: string
          last_working_day: string | null
          legal_entity_id: string | null
          manager_id: string | null
          office_id: string | null
          organization_id: string | null
          payroll_profile_id: string | null
          personal_email: string | null
          phone: string | null
          position: string
          position_effective_date: string | null
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
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employment_type?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          is_new_hire?: boolean | null
          join_date: string
          last_working_day?: string | null
          legal_entity_id?: string | null
          manager_id?: string | null
          office_id?: string | null
          organization_id?: string | null
          payroll_profile_id?: string | null
          personal_email?: string | null
          phone?: string | null
          position: string
          position_effective_date?: string | null
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
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employment_type?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          is_new_hire?: boolean | null
          join_date?: string
          last_working_day?: string | null
          legal_entity_id?: string | null
          manager_id?: string | null
          office_id?: string | null
          organization_id?: string | null
          payroll_profile_id?: string | null
          personal_email?: string | null
          phone?: string | null
          position?: string
          position_effective_date?: string | null
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
          leave_type_id: string | null
          new_balance: number
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
          leave_type_id?: string | null
          new_balance: number
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
          leave_type_id?: string | null
          new_balance?: number
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
            foreignKeyName: "leave_balance_logs_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
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
          leave_type_id: string | null
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
          leave_type_id?: string | null
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
          leave_type_id?: string | null
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
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
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
          leave_type_id: string
          organization_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          balance?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          organization_id?: string | null
          updated_at?: string
          year?: number
        }
        Update: {
          balance?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
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
            foreignKeyName: "leave_type_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
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
      leave_type_offices: {
        Row: {
          created_at: string
          id: string
          leave_type_id: string
          office_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leave_type_id: string
          office_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leave_type_id?: string
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_type_offices_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_type_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          applies_to_all_offices: boolean
          applies_to_employment_types: string[] | null
          applies_to_gender: string | null
          carry_forward_mode: string
          category: string
          created_at: string
          default_days: number | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          max_negative_days: number | null
          min_days_advance: number
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          applies_to_all_offices?: boolean
          applies_to_employment_types?: string[] | null
          applies_to_gender?: string | null
          carry_forward_mode?: string
          category?: string
          created_at?: string
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          max_negative_days?: number | null
          min_days_advance?: number
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          applies_to_all_offices?: boolean
          applies_to_employment_types?: string[] | null
          applies_to_gender?: string | null
          carry_forward_mode?: string
          category?: string
          created_at?: string
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          max_negative_days?: number | null
          min_days_advance?: number
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_organization_id_fkey"
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
      office_qr_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
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
          created_by: string
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
          created_by?: string
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
          id: string
          late_threshold_minutes: number
          office_id: string
          organization_id: string
          timezone: string | null
          updated_at: string
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          id?: string
          late_threshold_minutes?: number
          office_id: string
          organization_id: string
          timezone?: string | null
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          id?: string
          late_threshold_minutes?: number
          office_id?: string
          organization_id?: string
          timezone?: string | null
          updated_at?: string
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
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
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
      organizations: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          auto_attendance_adjustments_enabled: boolean
          billing_cycle: string | null
          company_size: string | null
          created_at: string
          early_checkout_reason_required: boolean | null
          id: string
          industry: string | null
          logo_url: string | null
          max_day_in_lieu_days: number | null
          max_sessions_per_day: number | null
          multi_session_enabled: boolean | null
          name: string
          owner_email: string | null
          owner_name: string | null
          plan: string
          rejected_at: string | null
          rejection_reason: string | null
          slug: string
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string
          workday_hours: number
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_attendance_adjustments_enabled?: boolean
          billing_cycle?: string | null
          company_size?: string | null
          created_at?: string
          early_checkout_reason_required?: boolean | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          max_day_in_lieu_days?: number | null
          max_sessions_per_day?: number | null
          multi_session_enabled?: boolean | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          plan?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          slug: string
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workday_hours?: number
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_attendance_adjustments_enabled?: boolean
          billing_cycle?: string | null
          company_size?: string | null
          created_at?: string
          early_checkout_reason_required?: boolean | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          max_day_in_lieu_days?: number | null
          max_sessions_per_day?: number | null
          multi_session_enabled?: boolean | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          plan?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          slug?: string
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
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
          description: string | null
          id: string
          name: string
          organization_id: string | null
          responsibilities: string[] | null
        }
        Insert: {
          ai_generated_at?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          responsibilities?: string[] | null
        }
        Update: {
          ai_generated_at?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          responsibilities?: string[] | null
        }
        Relationships: [
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
          full_name: string | null
          id: string | null
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
      admin_exists: { Args: never; Returns: boolean }
      calculate_kpi_rollup: { Args: { parent_id: string }; Returns: number }
      calculate_prorated_leave_monthly: {
        Args: {
          p_default_days: number
          p_end_date: string
          p_start_date: string
        }
        Returns: number
      }
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
      create_workflow_from_template:
        | {
            Args: {
              p_created_by?: string
              p_employee_id: string
              p_organization_id: string
              p_target_date: string
              p_workflow_type: string
            }
            Returns: string
          }
        | {
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
      delete_wiki_folder_recursive: {
        Args: { _folder_id: string }
        Returns: boolean
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
      get_current_employee_id: { Args: never; Returns: string }
      get_current_employee_id_for_org: {
        Args: { _org_id: string }
        Returns: string
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
              emp_id: string
              emp_id_number: string
              emp_join_date: string
              emp_manager_id: string
              emp_office_id: string
              emp_organization_id: string
              emp_personal_email: string
              emp_phone: string
              emp_position: string
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
      get_unread_counts_batch: {
        Args: { _employee_id: string; _organization_id: string }
        Returns: {
          context_id: string
          context_type: string
          unread_count: number
        }[]
      }
      get_user_organizations: { Args: { _user_id: string }; Returns: string[] }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      is_manager_of_employee: {
        Args: { _employee_id: string }
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
      owns_comment: { Args: { _comment_id: string }; Returns: boolean }
      owns_post: { Args: { _post_id: string }; Returns: boolean }
      owns_update: { Args: { _update_id: string }; Returns: boolean }
      record_remote_attendance: {
        Args: {
          _action: string
          _early_checkout_reason?: string
          _location_name?: string
          _user_latitude: number
          _user_longitude: number
        }
        Returns: Json
      }
      record_usage: {
        Args: { _feature: string; _organization_id: string; _quantity?: number }
        Returns: undefined
      }
      seed_default_workflow_data: {
        Args: { org_id: string }
        Returns: undefined
      }
      soft_delete_comment: { Args: { _comment_id: string }; Returns: boolean }
      transfer_wiki_ownership: {
        Args: { _item_id: string; _item_type: string; _new_owner_id: string }
        Returns: boolean
      }
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
      app_role: "admin" | "hr" | "user" | "super_admin" | "owner" | "member"
      chat_space_access: "public" | "private"
      chat_space_access_scope: "company" | "offices" | "projects" | "members"
      chat_space_type: "collaboration" | "announcements"
      support_request_priority: "low" | "medium" | "high" | "critical"
      support_request_status:
        | "new"
        | "triaging"
        | "in_progress"
        | "resolved"
        | "closed"
        | "wont_fix"
      support_request_type: "bug" | "feature"
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
      app_role: ["admin", "hr", "user", "super_admin", "owner", "member"],
      chat_space_access: ["public", "private"],
      chat_space_access_scope: ["company", "offices", "projects", "members"],
      chat_space_type: ["collaboration", "announcements"],
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
    },
  },
} as const

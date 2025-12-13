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
      attendance_records: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          organization_id: string | null
          status: string
          updated_at: string
          work_hours: number | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          work_hours?: number | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
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
      chat_messages: {
        Row: {
          content: string
          content_type: string
          conversation_id: string | null
          created_at: string
          id: string
          is_pinned: boolean
          organization_id: string
          reply_to_id: string | null
          sender_id: string
          space_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_type?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          organization_id: string
          reply_to_id?: string | null
          sender_id: string
          space_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          organization_id?: string
          reply_to_id?: string | null
          sender_id?: string
          space_id?: string | null
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
          created_at: string
          employee_id: string
          id: string
          late_threshold_minutes: number
          organization_id: string | null
          updated_at: string
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          late_threshold_minutes?: number
          organization_id?: string | null
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          late_threshold_minutes?: number
          organization_id?: string | null
          updated_at?: string
          work_end_time?: string
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
      employees: {
        Row: {
          bank_details: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          department: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          id_number: string | null
          join_date: string
          manager_id: string | null
          office_id: string | null
          organization_id: string | null
          personal_email: string | null
          phone: string | null
          position: string
          position_effective_date: string | null
          postcode: string | null
          remuneration: number | null
          remuneration_currency: string | null
          salary: number | null
          state: string | null
          status: string
          street: string | null
          superpowers: string[] | null
          tax_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_details?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          id_number?: string | null
          join_date: string
          manager_id?: string | null
          office_id?: string | null
          organization_id?: string | null
          personal_email?: string | null
          phone?: string | null
          position: string
          position_effective_date?: string | null
          postcode?: string | null
          remuneration?: number | null
          remuneration_currency?: string | null
          salary?: number | null
          state?: string | null
          status?: string
          street?: string | null
          superpowers?: string[] | null
          tax_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_details?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          id_number?: string | null
          join_date?: string
          manager_id?: string | null
          office_id?: string | null
          organization_id?: string | null
          personal_email?: string | null
          phone?: string | null
          position?: string
          position_effective_date?: string | null
          postcode?: string | null
          remuneration?: number | null
          remuneration_currency?: string | null
          salary?: number | null
          state?: string | null
          status?: string
          street?: string | null
          superpowers?: string[] | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
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
      kpis: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          employee_id: string
          id: string
          organization_id: string
          quarter: number
          status: string
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          employee_id: string
          id?: string
          organization_id: string
          quarter: number
          status?: string
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          quarter?: number
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
        ]
      }
      kudos: {
        Row: {
          batch_id: string | null
          comment: string
          created_at: string
          employee_id: string
          given_by_id: string
          id: string
          organization_id: string | null
        }
        Insert: {
          batch_id?: string | null
          comment: string
          created_at?: string
          employee_id: string
          given_by_id: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          batch_id?: string | null
          comment?: string
          created_at?: string
          employee_id?: string
          given_by_id?: string
          id?: string
          organization_id?: string | null
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
          change_amount: number
          created_at: string
          created_by: string
          employee_id: string
          id: string
          leave_type: string
          new_balance: number
          organization_id: string | null
          previous_balance: number
          reason: string | null
        }
        Insert: {
          change_amount: number
          created_at?: string
          created_by: string
          employee_id: string
          id?: string
          leave_type: string
          new_balance: number
          organization_id?: string | null
          previous_balance?: number
          reason?: string | null
        }
        Update: {
          change_amount?: number
          created_at?: string
          created_by?: string
          employee_id?: string
          id?: string
          leave_type?: string
          new_balance?: number
          organization_id?: string | null
          previous_balance?: number
          reason?: string | null
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
            foreignKeyName: "leave_balance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
          reason: string
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
          half_day_type?: string
          id?: string
          leave_type: string
          organization_id?: string | null
          reason: string
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
          half_day_type?: string
          id?: string
          leave_type?: string
          organization_id?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
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
          category: string
          created_at: string
          default_days: number | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          min_days_advance: number
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          applies_to_all_offices?: boolean
          category?: string
          created_at?: string
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          min_days_advance?: number
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          applies_to_all_offices?: boolean
          category?: string
          created_at?: string
          default_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
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
          auto_attendance_adjustments_enabled: boolean
          created_at: string
          id: string
          logo_url: string | null
          max_day_in_lieu_days: number | null
          name: string
          plan: string
          slug: string
          updated_at: string
          workday_hours: number
        }
        Insert: {
          auto_attendance_adjustments_enabled?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          max_day_in_lieu_days?: number | null
          name: string
          plan?: string
          slug: string
          updated_at?: string
          workday_hours?: number
        }
        Update: {
          auto_attendance_adjustments_enabled?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          max_day_in_lieu_days?: number | null
          name?: string
          plan?: string
          slug?: string
          updated_at?: string
          workday_hours?: number
        }
        Relationships: []
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
      performance_reviews: {
        Row: {
          ai_draft: Json | null
          ai_draft_generated_at: string | null
          created_at: string
          employee_id: string
          goals_next_period: string | null
          id: string
          needs_improvement: string | null
          organization_id: string
          overall_rating: number | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          what_went_well: string | null
        }
        Insert: {
          ai_draft?: Json | null
          ai_draft_generated_at?: string | null
          created_at?: string
          employee_id: string
          goals_next_period?: string | null
          id?: string
          needs_improvement?: string | null
          organization_id: string
          overall_rating?: number | null
          review_period_end: string
          review_period_start: string
          reviewer_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          what_went_well?: string | null
        }
        Update: {
          ai_draft?: Json | null
          ai_draft_generated_at?: string | null
          created_at?: string
          employee_id?: string
          goals_next_period?: string | null
          id?: string
          needs_improvement?: string | null
          organization_id?: string
          overall_rating?: number | null
          review_period_end?: string
          review_period_start?: string
          reviewer_id?: string
          status?: string
          submitted_at?: string | null
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
        ]
      }
      position_history: {
        Row: {
          change_type: string
          created_at: string
          department: string
          effective_date: string
          employee_id: string
          end_date: string | null
          id: string
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
          end_date?: string | null
          id?: string
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
          end_date?: string | null
          id?: string
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
          created_at: string
          department: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          name?: string
          organization_id?: string | null
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
      projects: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          organization_id?: string
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
      updates: {
        Row: {
          content: string
          created_at: string
          employee_id: string
          id: string
          image_url: string | null
          organization_id: string | null
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          employee_id: string
          id?: string
          image_url?: string | null
          organization_id?: string | null
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          employee_id?: string
          id?: string
          image_url?: string | null
          organization_id?: string | null
          type?: string
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
          created_at: string | null
          employee_id: string
          folder_id: string
          id: string
          organization_id: string
          permission: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          folder_id: string
          id?: string
          organization_id: string
          permission?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          folder_id?: string
          id?: string
          organization_id?: string
          permission?: string | null
        }
        Relationships: [
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
          created_at: string | null
          employee_id: string
          id: string
          organization_id: string
          page_id: string
          permission: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          organization_id: string
          page_id: string
          permission?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          page_id?: string
          permission?: string | null
        }
        Relationships: [
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
          superpowers: string[] | null
          updated_at: string | null
          user_id: string | null
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
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      can_view_employee_sensitive_data: {
        Args: { _employee_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { _profile_id: string }; Returns: boolean }
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
      get_current_employee_id: { Args: never; Returns: string }
      get_current_employee_id_for_org: {
        Args: { _org_id: string }
        Returns: string
      }
      get_employee_for_viewer: {
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
      get_user_organizations: { Args: { _user_id: string }; Returns: string[] }
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
      is_space_admin: {
        Args: { _employee_id: string; _space_id: string }
        Returns: boolean
      }
      is_space_member: {
        Args: { _employee_id: string; _space_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      owns_update: { Args: { _update_id: string }; Returns: boolean }
      validate_qr_and_record_attendance:
        | { Args: { _action: string; _qr_code: string }; Returns: Json }
        | {
            Args: {
              _action: string
              _qr_code: string
              _user_latitude?: number
              _user_longitude?: number
            }
            Returns: Json
          }
    }
    Enums: {
      app_role: "admin" | "hr" | "user" | "super_admin"
      chat_space_access: "public" | "private"
      chat_space_access_scope: "company" | "offices" | "projects" | "members"
      chat_space_type: "collaboration" | "announcements"
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
      app_role: ["admin", "hr", "user", "super_admin"],
      chat_space_access: ["public", "private"],
      chat_space_access_scope: ["company", "offices", "projects", "members"],
      chat_space_type: ["collaboration", "announcements"],
    },
  },
} as const

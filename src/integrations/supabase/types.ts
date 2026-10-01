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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          module: string
          record_id: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          module: string
          record_id?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          module?: string
          record_id?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_faculty: {
        Row: {
          batch_id: string
          faculty_id: string
          id: string
        }
        Insert: {
          batch_id: string
          faculty_id: string
          id?: string
        }
        Update: {
          batch_id?: string
          faculty_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_faculty_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_faculty_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          capacity: number | null
          code: string
          course_id: string | null
          created_at: string
          end_date: string | null
          hod_id: string | null
          id: string
          name: string
          remarks: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["batch_status"]
        }
        Insert: {
          capacity?: number | null
          code: string
          course_id?: string | null
          created_at?: string
          end_date?: string | null
          hod_id?: string | null
          id?: string
          name: string
          remarks?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
        }
        Update: {
          capacity?: number | null
          code?: string
          course_id?: string | null
          created_at?: string
          end_date?: string | null
          hod_id?: string | null
          id?: string
          name?: string
          remarks?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
        }
        Relationships: [
          {
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_hod_id_fkey"
            columns: ["hod_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_timings: {
        Row: {
          batch_id: string
          created_at: string
          day_of_week: number
          end_time: string
          faculty_id: string | null
          id: string
          is_active: boolean
          room: string | null
          start_time: string
          subject: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          faculty_id?: string | null
          id?: string
          is_active?: boolean
          room?: string | null
          start_time: string
          subject: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          faculty_id?: string | null
          id?: string
          is_active?: boolean
          room?: string | null
          start_time?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_timings_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_timings_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department: string | null
          description: string | null
          duration_months: number | null
          id: string
          is_active: boolean
          name: string
          program: string | null
        }
        Insert: {
          code: string
          created_at?: string
          department?: string | null
          description?: string | null
          duration_months?: number | null
          id?: string
          is_active?: boolean
          name: string
          program?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          department?: string | null
          description?: string | null
          duration_months?: number | null
          id?: string
          is_active?: boolean
          name?: string
          program?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          submission_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
          submission_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          submission_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          default_value: string | null
          field_key: string
          field_type: Database["public"]["Enums"]["field_type"]
          form_id: string
          help_text: string | null
          id: string
          is_required: boolean
          label: string
          max_length: number | null
          min_length: number | null
          options: string[] | null
          placeholder: string | null
          sort_order: number
        }
        Insert: {
          default_value?: string | null
          field_key: string
          field_type?: Database["public"]["Enums"]["field_type"]
          form_id: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label: string
          max_length?: number | null
          min_length?: number | null
          options?: string[] | null
          placeholder?: string | null
          sort_order?: number
        }
        Update: {
          default_value?: string | null
          field_key?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          form_id?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label?: string
          max_length?: number | null
          min_length?: number | null
          options?: string[] | null
          placeholder?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_rules: {
        Row: {
          batch_id: string | null
          course_id: string | null
          faculty_id: string | null
          form_id: string
          id: string
          is_active: boolean
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          batch_id?: string | null
          course_id?: string | null
          faculty_id?: string | null
          form_id: string
          id?: string
          is_active?: boolean
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          batch_id?: string | null
          course_id?: string | null
          faculty_id?: string | null
          form_id?: string
          id?: string
          is_active?: boolean
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_rules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_rules_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_rules_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          batch_id: string | null
          class_timing_id: string | null
          created_at: string
          current_step: string | null
          data: Json
          form_id: string
          id: string
          reference_no: string
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          class_timing_id?: string | null
          created_at?: string
          current_step?: string | null
          data?: Json
          form_id: string
          id?: string
          reference_no?: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          class_timing_id?: string | null
          created_at?: string
          current_step?: string | null
          data?: Json
          form_id?: string
          id?: string
          reference_no?: string
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_class_timing_id_fkey"
            columns: ["class_timing_id"]
            isOneToOne: false
            referencedRelation: "class_timings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          target_roles: Database["public"]["Enums"]["app_role"][]
          workflow_steps: string[]
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          target_roles?: Database["public"]["Enums"]["app_role"][]
          workflow_steps?: string[]
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          target_roles?: Database["public"]["Enums"]["app_role"][]
          workflow_steps?: string[]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          staff_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          staff_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          staff_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          admission_date: string | null
          batch_id: string | null
          course_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          profile_id: string | null
          roll_no: string
        }
        Insert: {
          admission_date?: string | null
          batch_id?: string | null
          course_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_id?: string | null
          roll_no: string
        }
        Update: {
          admission_date?: string | null
          batch_id?: string | null
          course_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_id?: string | null
          roll_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_actions: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          remarks: string | null
          submission_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          remarks?: string | null
          submission_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          remarks?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_actions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "hod" | "faculty" | "student"
      batch_status: "draft" | "active" | "completed" | "cancelled"
      field_type:
        | "text"
        | "textarea"
        | "number"
        | "email"
        | "phone"
        | "date"
        | "time"
        | "datetime"
        | "select"
        | "multiselect"
        | "radio"
        | "checkbox"
        | "file"
        | "image"
        | "student_select"
        | "faculty_select"
        | "batch_select"
        | "hod_select"
      submission_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "hod_approved"
        | "admin_approved"
        | "rejected"
        | "returned"
        | "completed"
        | "cancelled"
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
      app_role: ["super_admin", "admin", "hod", "faculty", "student"],
      batch_status: ["draft", "active", "completed", "cancelled"],
      field_type: [
        "text",
        "textarea",
        "number",
        "email",
        "phone",
        "date",
        "time",
        "datetime",
        "select",
        "multiselect",
        "radio",
        "checkbox",
        "file",
        "image",
        "student_select",
        "faculty_select",
        "batch_select",
        "hod_select",
      ],
      submission_status: [
        "draft",
        "submitted",
        "under_review",
        "hod_approved",
        "admin_approved",
        "rejected",
        "returned",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

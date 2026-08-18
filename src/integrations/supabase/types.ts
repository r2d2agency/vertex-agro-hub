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
      companies: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          device_id: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          is_deleted: boolean
          logo_url: string | null
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          responsavel: string | null
          status: string
          sync_status: Database["public"]["Enums"]["sync_status"]
          telefone: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          device_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_deleted?: boolean
          logo_url?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          responsavel?: string | null
          status?: string
          sync_status?: Database["public"]["Enums"]["sync_status"]
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          device_id?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_deleted?: boolean
          logo_url?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          responsavel?: string | null
          status?: string
          sync_status?: Database["public"]["Enums"]["sync_status"]
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      farms: {
        Row: {
          boundary: Json | null
          city: string | null
          code: string | null
          company_id: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          photo_urls: string[] | null
          regional_id: string | null
          state: string | null
          total_area_ha: number | null
          updated_at: string | null
        }
        Insert: {
          boundary?: Json | null
          city?: string | null
          code?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          photo_urls?: string[] | null
          regional_id?: string | null
          state?: string | null
          total_area_ha?: number | null
          updated_at?: string | null
        }
        Update: {
          boundary?: Json | null
          city?: string | null
          code?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          photo_urls?: string[] | null
          regional_id?: string | null
          state?: string | null
          total_area_ha?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionals"
            referencedColumns: ["id"]
          },
        ]
      }
      person_documents: {
        Row: {
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          kind: string
          name: string
          notes: string | null
          number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          kind: string
          name: string
          notes?: string | null
          number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          kind?: string
          name?: string
          notes?: string | null
          number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      person_employments: {
        Row: {
          admission_date: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          bank_pix_key: string | null
          company_id: string
          contract_type: string | null
          created_at: string | null
          ctps_number: string | null
          employee_code: string | null
          id: string
          notes: string | null
          pis_number: string | null
          position: string | null
          salary: number | null
          termination_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admission_date?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          bank_pix_key?: string | null
          company_id: string
          contract_type?: string | null
          created_at?: string | null
          ctps_number?: string | null
          employee_code?: string | null
          id?: string
          notes?: string | null
          pis_number?: string | null
          position?: string | null
          salary?: number | null
          termination_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admission_date?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          bank_pix_key?: string | null
          company_id?: string
          contract_type?: string | null
          created_at?: string | null
          ctps_number?: string | null
          employee_code?: string | null
          id?: string
          notes?: string | null
          pis_number?: string | null
          position?: string | null
          salary?: number | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_employments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          area_ha: number | null
          boundary: Json | null
          code: string | null
          company_id: string
          created_at: string | null
          farm_id: string
          id: string
          name: string
          planting_year: number | null
          tapping_system: string | null
          tree_count: number | null
          updated_at: string | null
        }
        Insert: {
          area_ha?: number | null
          boundary?: Json | null
          code?: string | null
          company_id: string
          created_at?: string | null
          farm_id: string
          id?: string
          name: string
          planting_year?: number | null
          tapping_system?: string | null
          tree_count?: number | null
          updated_at?: string | null
        }
        Update: {
          area_ha?: number | null
          boundary?: Json | null
          code?: string | null
          company_id?: string
          created_at?: string | null
          farm_id?: string
          id?: string
          name?: string
          planting_year?: number | null
          tapping_system?: string | null
          tree_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plots_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regionals: {
        Row: {
          code: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          manager_user_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          manager_user_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          manager_user_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regionals_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivation_reason: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          gender: string | null
          google_id: string | null
          id: string
          marital_status: string | null
          nationality: string | null
          notes: string | null
          password_hash: string | null
          phone: string | null
          phone_alt: string | null
          rg: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          google_id?: string | null
          id?: string
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          password_hash?: string | null
          phone?: string | null
          phone_alt?: string | null
          rg?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          gender?: string | null
          google_id?: string | null
          id?: string
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          password_hash?: string | null
          phone?: string | null
          phone_alt?: string | null
          rg?: string | null
          updated_at?: string | null
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
      is_admin_global: { Args: { _user_id: string }; Returns: boolean }
      is_member_of_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin_global"
        | "admin_empresa"
        | "gestor"
        | "supervisor_regional"
        | "monitor"
        | "consultor"
        | "consulta"
      sync_status: "synced" | "pending" | "conflict" | "error"
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
      app_role: [
        "admin_global",
        "admin_empresa",
        "gestor",
        "supervisor_regional",
        "monitor",
        "consultor",
        "consulta",
      ],
      sync_status: ["synced", "pending", "conflict", "error"],
    },
  },
} as const

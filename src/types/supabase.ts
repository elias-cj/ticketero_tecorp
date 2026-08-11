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
      acciones: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      asignados_tarea: {
        Row: {
          asignado_en: string | null
          tarea_id: string
          tecnico_id: string
        }
        Insert: {
          asignado_en?: string | null
          tarea_id: string
          tecnico_id: string
        }
        Update: {
          asignado_en?: string | null
          tarea_id?: string
          tecnico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignados_tarea_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      call_centers: {
        Row: {
          codigo: string | null
          creado_en: string | null
          esta_activo: boolean | null
          id: string
          nivel_servicio: string
          nombre: string
          pais: string
        }
        Insert: {
          codigo?: string | null
          creado_en?: string | null
          esta_activo?: boolean | null
          id?: string
          nivel_servicio: string
          nombre: string
          pais: string
        }
        Update: {
          codigo?: string | null
          creado_en?: string | null
          esta_activo?: boolean | null
          id?: string
          nivel_servicio?: string
          nombre?: string
          pais?: string
        }
        Relationships: []
      }
      categorias_problema: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      detalles_empleado: {
        Row: {
          departamento: string | null
          extension: string | null
          ip_vpn: string | null
          modalidad_trabajo: string | null
          puesto_trabajo: string | null
          usuario_id: string
        }
        Insert: {
          departamento?: string | null
          extension?: string | null
          ip_vpn?: string | null
          modalidad_trabajo?: string | null
          puesto_trabajo?: string | null
          usuario_id: string
        }
        Update: {
          departamento?: string | null
          extension?: string | null
          ip_vpn?: string | null
          modalidad_trabajo?: string | null
          puesto_trabajo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalles_empleado_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }

      estados_ticket: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      horarios: {
        Row: {
          fecha_horario: string
          id: string
          tecnico_id: string
          turno_id: string
        }
        Insert: {
          fecha_horario: string
          id?: string
          tecnico_id: string
          turno_id: string
        }
        Update: {
          fecha_horario?: string
          id?: string
          tecnico_id?: string
          turno_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      informacion_empresa: {
        Row: {
          direccion: string | null
          email_contacto: string | null
          id: string
          id_fiscal: string | null
          nombre_comercial: string
          razon_social: string | null
          telefono: string | null
          url_logo: string | null
        }
        Insert: {
          direccion?: string | null
          email_contacto?: string | null
          id?: string
          id_fiscal?: string | null
          nombre_comercial: string
          razon_social?: string | null
          telefono?: string | null
          url_logo?: string | null
        }
        Update: {
          direccion?: string | null
          email_contacto?: string | null
          id?: string
          id_fiscal?: string | null
          nombre_comercial?: string
          razon_social?: string | null
          telefono?: string | null
          url_logo?: string | null
        }
        Relationships: []
      }
      inventario: {
        Row: {
          actualizado_en: string | null
          categoria_id: string | null
          codigo_nasa: string | null
          creado_en: string | null
          estado: string
          fecha_compra: string | null
          id: string
          modelo: string | null
          nombre: string
          numero_serie: string | null
          ubicacion: string | null
          usuario_asignado_id: string | null
        }
        Insert: {
          actualizado_en?: string | null
          categoria_id?: string | null
          codigo_nasa?: string | null
          creado_en?: string | null
          estado?: string
          fecha_compra?: string | null
          id?: string
          modelo?: string | null
          nombre: string
          numero_serie?: string | null
          ubicacion?: string | null
          usuario_asignado_id?: string | null
        }
        Update: {
          actualizado_en?: string | null
          categoria_id?: string | null
          codigo_nasa?: string | null
          creado_en?: string | null
          estado?: string
          fecha_compra?: string | null
          id?: string
          modelo?: string | null
          nombre?: string
          numero_serie?: string | null
          ubicacion?: string | null
          usuario_asignado_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_usuario_asignado_id_fkey"
            columns: ["usuario_asignado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }

      licencias: {
        Row: {
          actualizado_en: string | null
          clave_licencia: string | null
          creado_en: string | null
          estado: string
          fecha_expiracion: string | null
          id: string
          nombre: string
          notas: string | null
          usuario_asignado_id: string | null
        }
        Insert: {
          actualizado_en?: string | null
          clave_licencia?: string | null
          creado_en?: string | null
          estado?: string
          fecha_expiracion?: string | null
          id?: string
          nombre: string
          notas?: string | null
          usuario_asignado_id?: string | null
        }
        Update: {
          actualizado_en?: string | null
          clave_licencia?: string | null
          creado_en?: string | null
          estado?: string
          fecha_expiracion?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          usuario_asignado_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licencias_usuario_asignado_id_fkey"
            columns: ["usuario_asignado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          accion: string
          creado_en: string | null
          detalles: string | null
          entidad: string
          id: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          creado_en?: string | null
          detalles?: string | null
          entidad: string
          id?: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          creado_en?: string | null
          detalles?: string | null
          entidad?: string
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          creado_en: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      permisos: {
        Row: {
          accion_id: string
          id: string
          modulo_id: string
        }
        Insert: {
          accion_id: string
          id?: string
          modulo_id: string
        }
        Update: {
          accion_id?: string
          id?: string
          modulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permisos_accion_id_fkey"
            columns: ["accion_id"]
            isOneToOne: false
            referencedRelation: "acciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos_rol: {
        Row: {
          asignado_en: string | null
          permiso_id: string
          rol_id: string
        }
        Insert: {
          asignado_en?: string | null
          permiso_id: string
          rol_id: string
        }
        Update: {
          asignado_en?: string | null
          permiso_id?: string
          rol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permisos_rol_permiso_id_fkey"
            columns: ["permiso_id"]
            isOneToOne: false
            referencedRelation: "permisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_rol_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_auditoria: {
        Row: {
          accion: string
          creado_en: string | null
          detalles: Json | null
          entidad: string
          entidad_id: string | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          creado_en?: string | null
          detalles?: Json | null
          entidad: string
          entidad_id?: string | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          creado_en?: string | null
          detalles?: Json | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          descripcion: string | null
          esta_activo: boolean | null
          id: string
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          esta_activo?: boolean | null
          id?: string
          nombre: string
        }
        Update: {
          descripcion?: string | null
          esta_activo?: boolean | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      roles_usuario: {
        Row: {
          asignado_en: string | null
          asignado_por: string | null
          rol_id: string
          usuario_id: string
        }
        Insert: {
          asignado_en?: string | null
          asignado_por?: string | null
          rol_id: string
          usuario_id: string
        }
        Update: {
          asignado_en?: string | null
          asignado_por?: string | null
          rol_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_usuario_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_usuario_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_usuario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      soluciones: {
        Row: {
          creado_en: string | null
          descripcion: string | null
          esta_activo: boolean | null
          id: string
          titulo: string
        }
        Insert: {
          creado_en?: string | null
          descripcion?: string | null
          esta_activo?: boolean | null
          id?: string
          titulo: string
        }
        Update: {
          creado_en?: string | null
          descripcion?: string | null
          esta_activo?: boolean | null
          id?: string
          titulo?: string
        }
        Relationships: []
      }

      tareas: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          descripcion: string | null
          estado_id: string | null
          id: string
          titulo: string
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          descripcion?: string | null
          estado_id?: string | null
          id?: string
          titulo: string
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          descripcion?: string | null
          estado_id?: string | null
          id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tareas_estado"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estados_ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          actualizado_en: string | null
          centro_contacto_id: string | null
          creado_en: string | null
          descripcion: string | null
          estado_id: string
          extension: string | null
          id: string
          ip_vpn: string | null
          modalidad_trabajo: string | null
          nombre_solicitante: string | null
          numero_ticket: string
          puesto_trabajo: string | null
          registro_estado: string | null
          solicitante_id: string | null
          solucion_id: string | null
          tecnico_asignado_id: string | null
          tipo_problema_id: string
          titulo: string
        }
        Insert: {
          actualizado_en?: string | null
          centro_contacto_id?: string | null
          creado_en?: string | null
          descripcion?: string | null
          estado_id: string
          extension?: string | null
          id?: string
          ip_vpn?: string | null
          modalidad_trabajo?: string | null
          nombre_solicitante?: string | null
          numero_ticket: string
          puesto_trabajo?: string | null
          registro_estado?: string | null
          solicitante_id?: string | null
          solucion_id?: string | null
          tecnico_asignado_id?: string | null
          tipo_problema_id: string
          titulo: string
        }
        Update: {
          actualizado_en?: string | null
          centro_contacto_id?: string | null
          creado_en?: string | null
          descripcion?: string | null
          estado_id?: string
          extension?: string | null
          id?: string
          ip_vpn?: string | null
          modalidad_trabajo?: string | null
          nombre_solicitante?: string | null
          numero_ticket?: string
          puesto_trabajo?: string | null
          registro_estado?: string | null
          solicitante_id?: string | null
          solucion_id?: string | null
          tecnico_asignado_id?: string | null
          tipo_problema_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_centro_contacto_id_fkey"
            columns: ["centro_contacto_id"]
            isOneToOne: false
            referencedRelation: "call_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estados_ticket"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_solucion_id_fkey"
            columns: ["solucion_id"]
            isOneToOne: false
            referencedRelation: "soluciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tipo_problema_id_fkey"
            columns: ["tipo_problema_id"]
            isOneToOne: false
            referencedRelation: "tipos_problema"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_problema: {
        Row: {
          categoria_id: string
          esta_activo: boolean | null
          id: string
          nombre: string
        }
        Insert: {
          categoria_id: string
          esta_activo?: boolean | null
          id?: string
          nombre: string
        }
        Update: {
          categoria_id?: string
          esta_activo?: boolean | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_problema_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_problema"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          hora_fin: string
          hora_inicio: string
          id: string
          nombre: string
        }
        Insert: {
          hora_fin: string
          hora_inicio: string
          id?: string
          nombre: string
        }
        Update: {
          hora_fin?: string
          hora_inicio?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          email: string | null
          esta_activo: boolean | null
          id: string
          nombre_completo: string
          password: string | null
          telefono: string | null
          url_avatar: string | null
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          email?: string | null
          esta_activo?: boolean | null
          id?: string
          nombre_completo: string
          password?: string | null
          telefono?: string | null
          url_avatar?: string | null
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          email?: string | null
          esta_activo?: boolean | null
          id?: string
          nombre_completo?: string
          password?: string | null
          telefono?: string | null
          url_avatar?: string | null
        }
        Relationships: []
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

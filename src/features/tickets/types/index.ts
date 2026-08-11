import { Database } from "@/types/supabase";

export type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];

export interface ExtendedTicket {
  id: string;
  numero_ticket: string;
  titulo: string;
  descripcion: string;
  estado_id: string;
  solicitante_id: string | null;
  tecnico_asignado_id: string | null;
  // Campos UI (calculados o de joins)
  number: string;
  fullName: string;
  workstation: string;
  callCenter: string;
  callCenterId: string;
  callCenterCode: string;
  country: string;
  problemType: string;
  description: string;
  phone: string;
  phoneCountryCode: string;
  flagGradient: string;
  status: "abierto" | "en-proceso" | "escalado" | "resuelto" | "cerrado";
  assignedArea: string;
  assignedTo: string;
  workMode: "presencial" | "home-office";
  createdAt: string;
  updatedAt: string | null;
  ip_vpn: string | null;
  registro_estado: string | null;
  escalados: boolean | null;
  fechaAsignacion?: string | null;
  fechaCierre?: string | null;
  solutionName?: string | null;
  extension?: string | null;
}

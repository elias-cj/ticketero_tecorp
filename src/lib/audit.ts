import { supabase } from './supabase';

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'BLOCK' | 'UNBLOCK';
export type AuditEntity = 'TICKET' | 'USUARIO' | 'CONFIGURACION' | 'INVENTARIO' | 'LICENCIA';

export const logAction = async (
  userId: string,
  action: AuditAction,
  entity: AuditEntity,
  entityId: string | null = null,
  details: any = null
) => {
  try {
    const { error } = await supabase
      .from('registros_auditoria')
      .insert({
        usuario_id: userId,
        accion: action,
        entidad: entity,
        entidad_id: entityId,
        detalles: details,
        creado_en: new Date().toISOString()
      });

    if (error) console.error('Error recording audit log:', error);
  } catch (e) {
    console.error('Audit service error:', e);
  }
};

export const logAuditAction = async (
  action: string,
  entity: string,
  details: any,
  userId?: string
) => {
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      try {
        const stored = localStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          resolvedUserId = parsed.id || parsed.userId;
        }
      } catch (e) {
        // ignore
      }
    }
    await supabase.from('registros_auditoria').insert({
      usuario_id: resolvedUserId,
      accion: action,
      entidad: entity,
      detalles: typeof details === 'string' ? { message: details } : details,
      creado_en: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error recording audit action:', e);
  }
};


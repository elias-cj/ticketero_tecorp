import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testApiPatch() {
  try {
    const userRes = await pool.query("SELECT u.id, u.nombre_completo FROM usuarios u JOIN roles_usuario ru ON ru.usuario_id = u.id JOIN roles r ON r.id = ru.rol_id WHERE r.nombre ILIKE '%supremo%' OR r.nombre ILIKE '%superadmin%' LIMIT 1");
    const userId = userRes.rows[0]?.id;
    console.log('Using superadmin user:', userRes.rows[0]);
    
    // Sign a test token
    const crypto = await import('node:crypto');
    const base64UrlEncode = (str) => Buffer.from(str).toString('base64url');
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = base64UrlEncode(JSON.stringify({
      sub: userId,
      iss: 'support-connect-api',
      aud: 'support-connect-web',
      iat: now,
      exp: now + 3600,
      jti: crypto.randomUUID(),
    }));
    const secret = process.env.JWT_SECRET || 'support_connect_jwt_secret_key_2026_super_secure';
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${signature}`;

    const ticketRes = await pool.query("SELECT id FROM tickets LIMIT 1");
    const ticketId = ticketRes.rows[0]?.id;

    console.log('Testing PATCH for ticketId:', ticketId);

    const response = await fetch(`http://127.0.0.1:54321/rest/v1/tickets?id=eq.${ticketId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        estado_id: '9952b6bf-fda4-4ee6-af38-c4d36683379a',
        solucion_id: 'f390328b-70aa-4121-ad32-1dc1d06491e3',
        descripcion_solucion: 'Test solution notes',
        actualizado_en: new Date().toISOString(),
        fecha_cierre: new Date().toISOString()
      })
    });

    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response body:', data);
  } catch (e) {
    console.error('Fetch error:', e);
  } finally {
    pool.end();
  }
}
testApiPatch();

import pg from 'pg';

async function testNoPass() {
  console.log('--- Probando conexión sin contraseña ---');
  
  // Test 1: postgresql://postgres@127.0.0.1:5432/ticketero_tecorp
  try {
    const p1 = new pg.Pool({ connectionString: 'postgresql://postgres:@127.0.0.1:5432/ticketero_tecorp' });
    const r1 = await p1.query('SELECT 1 as test');
    console.log('✅ Test 1 (postgresql://postgres:@127.0.0.1:5432/ticketero_tecorp) -> ÉXITO:', r1.rows);
    await p1.end();
  } catch (e) {
    console.error('❌ Test 1 fallo:', e.message);
  }

  // Test 2: postgresql://postgres@localhost:5432/ticketero_tecorp
  try {
    const p2 = new pg.Pool({ connectionString: 'postgresql://postgres@127.0.0.1:5432/ticketero_tecorp' });
    const r2 = await p2.query('SELECT 1 as test');
    console.log('✅ Test 2 (postgresql://postgres@127.0.0.1:5432/ticketero_tecorp) -> ÉXITO:', r2.rows);
    await p2.end();
  } catch (e) {
    console.error('❌ Test 2 fallo:', e.message);
  }
}

testNoPass();

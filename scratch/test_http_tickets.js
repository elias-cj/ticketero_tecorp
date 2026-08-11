async function testHttpTickets() {
  console.log('📡 Probando consulta GET /rest/v1/tickets ...');
  try {
    const loginRes = await fetch('http://127.0.0.1:54321/rest/v1/rpc/login_seguro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_email: 'admin@admin.com', p_password: 'admin' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const ticketsRes = await fetch('http://127.0.0.1:54321/rest/v1/tickets?limit=3', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`STATUS CODE TICKETS: ${ticketsRes.status} ${ticketsRes.statusText}`);
    const tickets = await ticketsRes.json();
    console.log('MUESTRA DE TICKETS CON RELACIONES:');
    console.log(JSON.stringify(tickets, null, 2));

  } catch (err) {
    console.error('ERROR EN TEST TICKETS:', err.message);
  }
}

testHttpTickets();

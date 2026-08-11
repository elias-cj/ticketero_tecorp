async function testHttpLogin() {
  console.log('📡 Enviando HTTP POST a http://127.0.0.1:54321/rest/v1/rpc/login_seguro ...');
  try {
    const response = await fetch('http://127.0.0.1:54321/rest/v1/rpc/login_seguro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'local_postgres_key',
        'x-client-info': 'supabase-js/2.39.8'
      },
      body: JSON.stringify({
        p_email: 'admin@admin.com',
        p_password: 'admin'
      })
    });

    console.log(`STATUS CODE: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('RESPONSE BODY:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('HTTP REQUEST ERROR:', err.message);
  }
}

testHttpLogin();

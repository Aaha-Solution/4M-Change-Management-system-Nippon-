async function testAPI() {
  try {
    // 1. Log in
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@cms.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful, token retrieved.');

    // 2. Get Users
    const usersRes = await fetch('http://localhost:5001/api/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!usersRes.ok) {
      throw new Error(`Get users failed: ${usersRes.status} ${usersRes.statusText}`);
    }
    
    const usersData = await usersRes.json();
    console.log('API /users returned:', usersData.length, 'users');
    console.log(JSON.stringify(usersData, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('API Test Error:', error.message);
    process.exit(1);
  }
}

testAPI();

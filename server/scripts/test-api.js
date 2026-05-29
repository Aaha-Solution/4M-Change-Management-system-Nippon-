import assert from 'assert';

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('🚀 Starting Full API End-to-End Test Suite...');
  let passedCount = 0;
  let failedCount = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passedCount++;
    } catch (error) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(error);
      failedCount++;
    }
  }

  // 1. Invalid Login
  await test('Login with incorrect credentials returns 401', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cms.com', password: 'wrongpassword' })
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid email or password.');
  });

  // 2. Missing Fields Login
  await test('Login with missing credentials returns 400', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cms.com' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Email and password are required.');
  });

  // 3. Successful Admin Login
  let adminToken = '';
  await test('Admin login returns 200 and a JWT token', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cms.com', password: 'admin123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.email, 'admin@cms.com');
    assert.strictEqual(data.role, 'Admin');
    assert.ok(data.token);
    adminToken = data.token;
  });

  // 4. Successful Manager User Login
  await test('Manager User login returns 200 and a JWT token', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@cms.com', password: 'manager123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.email, 'manager@cms.com');
    assert.strictEqual(data.role, 'User');
    assert.ok(data.token);
  });

  // 5. Successful Requester User Login
  await test('Requester User login returns 200 and a JWT token', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'requester@cms.com', password: 'requester123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.email, 'requester@cms.com');
    assert.strictEqual(data.role, 'User');
    assert.ok(data.token);
  });

  // 5a. Signup Successful
  const testSignupEmail = `user-${Date.now()}@cms.com`;
  await test('Signup returns 201 and signs JWT token', async () => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testSignupEmail, password: 'testpassword123', role: 'Requester' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.message, 'User registered successfully');
    assert.strictEqual(data.email, testSignupEmail);
    assert.strictEqual(data.role, 'Requester');
    assert.ok(data.token);
  });

  // 5b. Signup Duplicate Email returns 409
  await test('Signup with duplicate email returns 409', async () => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cms.com', password: 'testpassword123' })
    });
    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.error, 'Email is already registered.');
  });

  // 5c. Signup Missing Email/Password returns 400
  await test('Signup with missing fields returns 400', async () => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@cms.com' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Email and password are required.');
  });

  // 6. Access /api/users without token returns 401
  await test('Access /api/users without token returns 401', async () => {
    const res = await fetch(`${API_BASE}/users`);
    assert.strictEqual(res.status, 401);
  });

  // 7. Access /api/users with invalid token returns 403
  await test('Access /api/users with invalid token returns 403', async () => {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { 'Authorization': 'Bearer invalid_token_value' }
    });
    assert.strictEqual(res.status, 403);
  });

  // 8. Access /api/users with Admin token returns list of users
  await test('Access /api/users with valid Admin token returns user list', async () => {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const users = await res.json();
    assert.ok(Array.isArray(users));
    assert.ok(users.length >= 3);
    const emails = users.map(u => u.email);
    assert.ok(emails.includes('admin@cms.com'));
    assert.ok(emails.includes('manager@cms.com'));
    assert.ok(emails.includes('requester@cms.com'));
  });

  // 9. Fetch changes with valid token
  await test('Access /api/changes with valid Admin token returns changes list', async () => {
    const res = await fetch(`${API_BASE}/changes`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const changes = await res.json();
    assert.ok(Array.isArray(changes));
    assert.ok(changes.length > 0);
  });

  // 10. Create new change request
  await test('Create new change request successfully', async () => {
    const payload = {
      title: 'Automated Test Change ' + Date.now(),
      requester: 'admin@cms.com',
      priority: 'Low'
    };
    const res = await fetch(`${API_BASE}/changes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.message, 'Change request created successfully');
    assert.ok(data.change.id.startsWith('CHG-'));
    assert.strictEqual(data.change.title, payload.title);
    assert.strictEqual(data.change.requester, payload.requester);
    assert.strictEqual(data.change.priority, payload.priority);
    assert.strictEqual(data.change.status, 'Pending');
  });

  // 11. Create change request with missing fields
  await test('Create change request with missing title returns 400', async () => {
    const payload = {
      requester: 'admin@cms.com',
      priority: 'Low'
    };
    const res = await fetch(`${API_BASE}/changes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Title and Requester are required fields.');
  });

  // 12. Reset Notifications
  await test('Reset notifications to defaults', async () => {
    const res = await fetch(`${API_BASE}/notifications/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.message, 'Notifications reset to defaults successfully.');
  });

  // 13. Get Notifications list
  let testNotifId = '';
  await test('Fetch notifications list', async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 6);
    assert.ok(list[0].id);
    assert.ok(list[0].title);
    assert.ok(list[0].time); // Verify mapped field is "time" (from time_str)
    assert.ok(list[0].changeNo);
    testNotifId = list[0].id;
  });

  // 14. Toggle Notification read status
  await test('Toggle notification read status', async () => {
    const res = await fetch(`${API_BASE}/notifications/${testNotifId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const notif = await res.json();
    assert.strictEqual(notif.id, testNotifId);
    assert.ok('isRead' in notif);
  });

  // 15. Mark all read
  await test('Mark all notifications as read', async () => {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.message, 'All notifications marked as read.');
    
    // Verify all are indeed read
    const checkRes = await fetch(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const list = await checkRes.json();
    assert.ok(list.every(n => n.isRead === true));
  });

  // 16. Clear read notifications
  await test('Clear read notifications', async () => {
    const res = await fetch(`${API_BASE}/notifications/clear-read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.message, 'Read notifications cleared.');

    // Verify notifications is now empty (since all were marked read and then cleared)
    const checkRes = await fetch(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const list = await checkRes.json();
    assert.strictEqual(list.length, 0);
  });

  // 17. Restore defaults after clearing
  await test('Restore notifications default seed', async () => {
    await fetch(`${API_BASE}/notifications/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const list = await res.json();
    assert.strictEqual(list.length, 6);
  });

  console.log('\n=======================================');
  console.log(`📊 Test Execution Results:`);
  console.log(`   Passed: ${passedCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log('=======================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  }
}

runTests();

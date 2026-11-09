/**
 * Automated Role-Based Access Control (RBAC) & Security Verification Suite
 * Tests all role boundaries:
 * 1. Administrator: Allowed everywhere
 * 2. Operating Staff: Allowed on operational routes, denied on security/user admin
 * 3. Resident: Blocked from operational & admin routes, restricted to village data
 */

import http from 'node:http';
import { Readable } from 'node:stream';
import { app } from './server.js';

function dispatchInProcess(method, endpoint, body = null, token = null) {
  return new Promise((resolve) => {
    const socket = new Readable({ read() {} });
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = `/api${endpoint}`;
    req.headers = {
      'content-type': 'application/json'
    };
    if (token) {
      req.headers['authorization'] = `Bearer ${token}`;
    }

    let resData = '';
    const res = new http.ServerResponse(req);
    res.assignSocket(new (class FakeSocket extends Readable {
      _read() {}
      cork() {}
      uncork() {}
      write(chunk, enc, cb) { if (cb) cb(); return true; }
      destroy() {}
    })());

    res.write = (chunk) => {
      resData += chunk;
      return true;
    };

    res.end = (chunk) => {
      if (chunk) resData += chunk;
      let parsed = resData;
      try {
        parsed = JSON.parse(resData);
      } catch {}
      resolve({ status: res.statusCode, data: parsed });
    };

    if (body) {
      const bodyStr = typeof body === 'object' ? JSON.stringify(body) : String(body);
      req.headers['content-length'] = Buffer.byteLength(bodyStr);
      req.push(bodyStr);
    }
    req.push(null);

    app(req, res);
  });
}

async function postJSON(endpoint, data, token = null) {
  return dispatchInProcess('POST', endpoint, data, token);
}

async function getJSON(endpoint, token = null) {
  return dispatchInProcess('GET', endpoint, null, token);
}

async function runRBACTests() {
  console.log('====================================================');
  console.log('🛡️  JalDrishti RBAC Security & Authorization Tests');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Authenticate all three roles
  console.log('\n[1] Authenticating Test Personas...');
  const adminLogin = await postJSON('/auth/login', { email_or_mobile: 'admin@demo.local', password: 'Demo12345!' });
  assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin authenticated');
  const adminToken = adminLogin.data.token;

  const operatorLogin = await postJSON('/auth/login', { email_or_mobile: 'operator@demo.local', password: 'Demo12345!' });
  assert(operatorLogin.status === 200 && operatorLogin.data.token, 'Operating Staff authenticated');
  const operatorToken = operatorLogin.data.token;

  const residentLogin = await postJSON('/auth/login', { email_or_mobile: 'resident@demo.local', password: 'Demo12345!' });
  assert(residentLogin.status === 200 && residentLogin.data.token, 'Resident authenticated (Village A)');
  const residentToken = residentLogin.data.token;

  // 2. Unauthenticated Access
  console.log('\n[2] Testing Unauthenticated Rejection...');
  const noAuth = await getJSON('/pump');
  assert(noAuth.status === 401, 'Unauthenticated access to /api/pump is blocked (401)');

  // 3. Resident Security Boundaries
  console.log('\n[3] Testing Resident Role Restrictions (Must be strictly blocked)...');
  const residentPumpAccess = await getJSON('/pump', residentToken);
  assert(residentPumpAccess.status === 403, 'Resident blocked from /api/pump (403 Forbidden)');

  const residentPumpControl = await postJSON('/pump/control', { command: 'STOP' }, residentToken);
  assert(residentPumpControl.status === 403, 'Resident blocked from simulated pump control (403 Forbidden)');

  const residentUsersAccess = await getJSON('/users', residentToken);
  assert(residentUsersAccess.status === 403, 'Resident blocked from /api/users (403 Forbidden)');

  const residentComparisonAccess = await getJSON('/villages/comparison', residentToken);
  assert(residentComparisonAccess.status === 403, 'Resident blocked from /api/villages/comparison (403 Forbidden)');

  const residentCrossVillageAccess = await getJSON('/villages/Village C', residentToken);
  assert(residentCrossVillageAccess.status === 403, 'Village A Resident blocked from Village C internal data (403 Forbidden)');

  // 4. Resident Allowed Features
  console.log('\n[4] Testing Resident Allowed Features...');
  const residentOwnVillage = await getJSON('/villages/Village A', residentToken);
  assert(residentOwnVillage.status === 200, 'Resident can access their own village data (200 OK)');

  const residentNotices = await getJSON('/notices', residentToken);
  assert(residentNotices.status === 200 && Array.isArray(residentNotices.data.notices), 'Resident can view village notice board');

  const complaintSubmit = await postJSON('/complaints', {
    category: 'Leakage',
    location: 'Sector 1 Main Lane',
    description: 'Minor roadside leak observed'
  }, residentToken);
  assert(complaintSubmit.status === 201 && complaintSubmit.data.complaintCode, 'Resident can submit water complaint');

  // 5. Operating Staff Boundaries
  console.log('\n[5] Testing Operating Staff Boundaries...');
  const operatorPumpAccess = await getJSON('/pump', operatorToken);
  assert(operatorPumpAccess.status === 200, 'Operating Staff can monitor central pump (200 OK)');

  const operatorLeakAccess = await getJSON('/leaks', operatorToken);
  assert(operatorLeakAccess.status === 200, 'Operating Staff can view AI leakage intelligence (200 OK)');

  const operatorUserAccess = await getJSON('/users', operatorToken);
  assert(operatorUserAccess.status === 403, 'Operating Staff is blocked from user administration (403 Forbidden)');

  const operatorAuditAccess = await getJSON('/audit', operatorToken);
  assert(operatorAuditAccess.status === 403, 'Operating Staff is blocked from viewing audit logs (403 Forbidden)');

  // 6. Administrator Access
  console.log('\n[6] Testing Administrator Privileges...');
  const adminUserAccess = await getJSON('/users', adminToken);
  assert(adminUserAccess.status === 200, 'Administrator can view user directory (200 OK)');

  const adminAuditAccess = await getJSON('/audit', adminToken);
  assert(adminAuditAccess.status === 200, 'Administrator can view security audit logs (200 OK)');

  const adminAnalytics = await getJSON('/analytics/water-balance', adminToken);
  assert(adminAnalytics.status === 200 && adminAnalytics.data.waterBalanceDifference, 'Administrator can view IWA water balance analytics');

  console.log('\n====================================================');
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log('====================================================\n');

  // Close server gracefully
  process.exit(failed > 0 ? 1 : 0);
}

runRBACTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

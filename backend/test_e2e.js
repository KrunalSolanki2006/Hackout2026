/**
 * End-to-End API Test for HackOut 2026 Backend
 * Tests the full journey: auth → facility → assessment → inputs → calculate → summary → leak-points → recommendations → simulate → apply → roadmap → export
 */
const BASE_URL = 'http://localhost:8000/api/v1';

let token = '';
let facilityId = '';
let assessmentId = '';
let recId = '';
let appliedId = '';

async function req(method, path, body, authToken) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();
  return { status: res.status, json };
}

function check(label, cond, details = '') {
  if (cond) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ FAIL: ${label}`, details);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('\n=== HackOut 2026 Backend E2E Test ===\n');

  // 1. Health check
  console.log('1. Health Check');
  const health = await req('GET', '/health'.replace('/api/v1', ''));
  check('Health endpoint', health.json?.success === true || health.status === 404);

  // 2. Signup
  console.log('\n2. POST /auth/signup');
  const email = `test_${Date.now()}@hackout.com`;
  const signup = await req('POST', '/auth/signup', { name: 'Test Operator', email, password: 'hackout123', role: 'operator' });
  check('Signup returns 201', signup.status === 201, JSON.stringify(signup.json));
  check('Signup returns token', !!signup.json?.data?.token);
  token = signup.json?.data?.token || '';

  // 3. Login
  console.log('\n3. POST /auth/login');
  const login = await req('POST', '/auth/login', { email, password: 'hackout123' });
  check('Login returns 200', login.status === 200, JSON.stringify(login.json));
  check('Login returns token', !!login.json?.data?.token);
  if (login.json?.data?.token) token = login.json.data.token;

  // 4. Get me
  console.log('\n4. GET /auth/me');
  const me = await req('GET', '/auth/me', null, token);
  check('Get me returns user', me.json?.data?.user?.email === email);

  // 5. Create facility
  console.log('\n5. POST /facilities');
  const fac = await req('POST', '/facilities', {
    name: 'ABC Plastics Ltd',
    industry: 'plastic',
    facility_size: 'medium',
    region: 'Gujarat, IN',
    production_volume: 50000,
  }, token);
  check('Create facility returns 201', fac.status === 201, JSON.stringify(fac.json));
  check('Facility has id', !!fac.json?.data?.facility?.id);
  facilityId = fac.json?.data?.facility?.id || '';

  // 6. List facilities
  console.log('\n6. GET /facilities');
  const facList = await req('GET', '/facilities', null, token);
  check('List facilities success', facList.json?.success === true);
  check('At least 1 facility', facList.json?.data?.facilities?.length >= 1);

  // 7. Create assessment
  console.log('\n7. POST /facilities/:id/assessments');
  const ass = await req('POST', `/facilities/${facilityId}/assessments`, {}, token);
  check('Create assessment returns 201', ass.status === 201, JSON.stringify(ass.json));
  check('Assessment status is draft', ass.json?.data?.assessment?.status === 'draft');
  assessmentId = ass.json?.data?.assessment?.id || '';

  // 8. Add inputs (batch)
  console.log('\n8. POST /assessments/:id/inputs (batch)');
  const inputs = await req('POST', `/assessments/${assessmentId}/inputs`, {
    inputs: [
      { category: 'energy', subtype: 'electricity', quantity: 40000, unit: 'kwh' },
      { category: 'energy', subtype: 'diesel', quantity: 5000, unit: 'litre' },
      { category: 'material', subtype: 'virgin_plastic', quantity: 20000, unit: 'kg' },
      { category: 'waste', subtype: 'plastic_waste', quantity: 3000, unit: 'kg' },
    ],
  }, token);
  check('Batch inputs returns 201', inputs.status === 201, JSON.stringify(inputs.json));
  check('Inputs array returned', inputs.json?.data?.inputs?.length >= 1);

  // 9. Get assessment (verify inputs saved)
  console.log('\n9. GET /assessments/:id');
  const getAss = await req('GET', `/assessments/${assessmentId}`, null, token);
  check('Get assessment success', getAss.json?.success === true);
  check('Inputs visible in assessment', getAss.json?.data?.inputs?.length >= 4);

  // 10. Calculate emissions
  console.log('\n10. POST /assessments/:id/calculate');
  const calc = await req('POST', `/assessments/${assessmentId}/calculate`, null, token);
  check('Calculate returns 200', calc.status === 200, JSON.stringify(calc.json));
  check('Assessment is now complete', calc.json?.data?.assessment?.status === 'complete');
  check('total_co2e > 0', calc.json?.data?.assessment?.total_co2e > 0,
    `Got: ${calc.json?.data?.assessment?.total_co2e}`);
  console.log(`  📊 total_co2e = ${calc.json?.data?.assessment?.total_co2e} tonnes`);

  // 11. Summary
  console.log('\n11. GET /assessments/:id/summary');
  const summary = await req('GET', `/assessments/${assessmentId}/summary`, null, token);
  check('Summary returns 200', summary.status === 200, JSON.stringify(summary.json));
  check('Summary has total_co2e', summary.json?.data?.total_co2e > 0);
  check('Summary has category_totals', !!summary.json?.data?.category_totals);
  check('Summary has line_items', summary.json?.data?.line_items?.length >= 1);

  // 12. Leak points
  console.log('\n12. GET /assessments/:id/leak-points');
  const leaks = await req('GET', `/assessments/${assessmentId}/leak-points`, null, token);
  check('Leak points returns 200', leaks.status === 200, JSON.stringify(leaks.json));
  check('Leak points array present', leaks.json?.data?.leak_points?.length >= 1);
  check('First leak point has severity', !!leaks.json?.data?.leak_points?.[0]?.severity);
  console.log(`  🔥 Top leak: ${leaks.json?.data?.leak_points?.[0]?.subtype} (${leaks.json?.data?.leak_points?.[0]?.severity})`);

  // 13. Recommendations
  console.log('\n13. GET /assessments/:id/recommendations');
  const recs = await req('GET', `/assessments/${assessmentId}/recommendations`, null, token);
  check('Recommendations returns 200', recs.status === 200, JSON.stringify(recs.json));
  check('Recommendations array present', recs.json?.data?.recommendations?.length >= 1);
  check('First rec has score', typeof recs.json?.data?.recommendations?.[0]?.score === 'number');
  check('First rec has score_source', !!recs.json?.data?.recommendations?.[0]?.score_source);
  recId = recs.json?.data?.recommendations?.[0]?.recommendation_id;
  console.log(`  🤖 Top rec: ${recs.json?.data?.recommendations?.[0]?.intervention?.name} (score: ${recs.json?.data?.recommendations?.[0]?.score}, source: ${recs.json?.data?.recommendations?.[0]?.score_source})`);

  // 14. Simulate
  console.log('\n14. POST /assessments/:id/simulate');
  const topIntId = recs.json?.data?.recommendations?.[0]?.intervention?.id;
  const sim = await req('POST', `/assessments/${assessmentId}/simulate`, {
    selected_intervention_ids: [topIntId],
  }, token);
  check('Simulate returns 200', sim.status === 200, JSON.stringify(sim.json));
  check('Simulate has projected_co2e', typeof sim.json?.data?.projected_co2e === 'number');
  check('Simulate has reduction_pct', typeof sim.json?.data?.reduction_pct === 'number');
  console.log(`  📉 Projected CO2e: ${sim.json?.data?.projected_co2e} tonnes (${(sim.json?.data?.reduction_pct * 100).toFixed(1)}% reduction)`);

  // 15. Apply recommendation
  console.log('\n15. POST /assessments/:id/recommendations/:recId/apply');
  const apply = await req('POST', `/assessments/${assessmentId}/recommendations/${recId}/apply`, { roadmap_phase: 1 }, token);
  check('Apply returns 200', apply.status === 200, JSON.stringify(apply.json));
  check('Applied intervention has id', !!apply.json?.data?.applied_intervention?.id);
  appliedId = apply.json?.data?.applied_intervention?.id;

  // 16. Roadmap
  console.log('\n16. GET /assessments/:id/roadmap');
  const roadmap = await req('GET', `/assessments/${assessmentId}/roadmap`, null, token);
  check('Roadmap returns 200', roadmap.status === 200, JSON.stringify(roadmap.json));
  check('Phase 1 has items', roadmap.json?.data?.roadmap?.phase_1?.length >= 1);

  // 17. History
  console.log('\n17. GET /assessments/:id/history');
  const history = await req('GET', `/assessments/${assessmentId}/history`, null, token);
  check('History returns 200', history.status === 200, JSON.stringify(history.json));
  check('History has entries', history.json?.data?.history?.length >= 1);

  // 18. Export CSV
  console.log('\n18. GET /assessments/:id/export?format=csv');
  const headers2 = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const exportRes = await fetch(`${BASE_URL}/assessments/${assessmentId}/export?format=csv`, { headers: headers2 });
  check('CSV export returns 200', exportRes.status === 200, `Status: ${exportRes.status}`);
  check('Content-Type is text/csv', exportRes.headers.get('content-type')?.includes('text/csv'));

  console.log('\n=== E2E Test Complete ===\n');
}

// Use global fetch (Node 18+)
run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

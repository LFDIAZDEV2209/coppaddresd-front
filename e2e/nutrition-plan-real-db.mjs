/** ERP → Gateway → Auth/API → PostgreSQL, sin interceptar las APIs. */
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const fixtures = JSON.parse(await readFile(process.env.COP_E2E_FIXTURES, 'utf8'));
const output = process.env.COP_E2E_OUTPUT;
assert(output && fixtures.reviewer, 'Use isolated, temporary workflow fixtures.');
const origin = process.env.COP_E2E_ERP_URL ?? 'http://localhost:3000';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const page = await context.newPage();
const report = { environment: 'local API and actual isolated PostgreSQL', apiInterception: false, steps: [] };
async function login(account, application, ctx = context) {
  const response = await ctx.request.post(origin + '/api/auth/login', { data: {
    email: account.email, password: account.password, application, rememberMe: true,
  } });
  assert.equal(response.status(), 200, 'Real account must authenticate.');
  return { Authorization: `Bearer ${(await response.json()).accessToken}` };
}
function editable(plan, updates = {}) {
  return { name: plan.name, revision: plan.revision, description: plan.description,
    targetCondition: plan.targetCondition, durationDays: 30, dailyCalorieTarget: plan.dailyCalorieTarget,
    dailyProteinTarget: plan.dailyProteinTarget, dailyCarbsTarget: plan.dailyCarbsTarget,
    dailyFatTarget: plan.dailyFatTarget, dailyFiberTarget: plan.dailyFiberTarget,
    allergens: plan.allergens, mealTiming: plan.mealTiming, status: 'Draft', days: plan.days, ...updates };
}
let headers;
const get = async id => {
  const response = await context.request.get(origin + `/api/v1/wellness/nutrition-plans/${id}`, { headers });
  assert.equal(response.status(), 200); return response.json();
};
try {
  headers = await login(fixtures.reviewer, 'erp');
  const me = await context.request.get(origin + '/api/auth/me', { headers });
  const identity = await me.json();
  for (const permission of ['Wellness.View','Wellness.Manage','NutritionPlans.Approve','Patients.ViewOwn','HealthTests.ViewOwn'])
    assert(identity.permissions.includes(permission), permission);
  assert(!identity.permissions.includes('Patients.View'), 'Reviewer must not have global patient access.');
  const actor = await context.request.get(origin + '/api/v1/me/context', { headers });
  assert.equal((await actor.json()).professionalId, fixtures.reviewer.professionalId);
  report.permissions = { roles: identity.roles, permissions: identity.permissions, professionalLinked: true, assignedPatients: 2 };
  const plans = [];
  for (let index = 0; index < 2; index++) {
    let candidate;
    await expect.poll(async () => {
      const list = await context.request.get(origin + `/api/v1/wellness/nutrition-plans?patientId=${fixtures.patients[index].patientId}&pageSize=100`, { headers });
      assert.equal(list.status(), 200);
      candidate = (await list.json()).data.find(plan => plan.generationStatus === 'completed' && plan.reviewStatus === 'pending_review');
      return Boolean(candidate);
    }, { timeout: 180000, intervals: [1000, 3000, 5000], message: 'Wait for the actual AI-generated patient draft.' }).toBe(true);
    const full = await get(candidate.id);
    assert.equal(full.days.length, 28, 'Actual generated draft must contain four meals for seven days.');
    const renamed = await context.request.put(origin + `/api/v1/wellness/nutrition-plans/${full.id}`, {
      headers, data: editable(full, { name: `QA Diomedes ${index === 0 ? 'A' : 'B'}` }),
    });
    assert.equal(renamed.status(), 200); plans.push(await renamed.json());
  }
  report.planIds = plans.map(plan => plan.id);
  await page.goto(origin + '/wellness/nutrition-plans');
  await expect(page.getByRole('heading', { name: 'Planes de alimentación', level: 1, exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder('Buscar por nombre...', { exact: true }).fill('QA Diomedes');
  const rowA = () => page.getByRole('row').filter({ hasText: 'QA Diomedes A' });
  await rowA().getByTitle('Editar', { exact: true }).click();
  await expect(page.locator('#plan-name')).toHaveValue('QA Diomedes A');
  const snack = page.getByText('Merienda', { exact: true }).last().locator('..').locator('..')
    .getByPlaceholder('Alimentos (ej: Pollo, aguacate, lechuga)', { exact: true });
  await expect(snack).not.toHaveValue('');
  const changedFood = (await snack.inputValue()) + ' · porción revisada QA';
  await snack.fill(changedFood);
  const save = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/nutrition-plans/' + plans[0].id));
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  assert.equal((await save).status(), 200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  let updated = await get(plans[0].id);
  assert(updated.days.some(meal => meal.dayNumber === 1 && meal.mealType === 'Snack' && meal.foods === changedFood));
  assert.equal(updated.reviewStatus, 'pending_review');
  report.steps.push('Edited the real AI draft through the ERP and read the persisted snack back through the API.');
  const candidateA = page.getByRole('listitem').filter({ hasText: 'QA Diomedes A' });
  await candidateA.getByRole('button', { name: 'Revisar plan', exact: true }).click();
  const publish = page.getByRole('button', { name: 'Aprobar y publicar plan', exact: true });
  await expect(publish).toBeDisabled();
  await page.getByRole('checkbox', { name: /Revisé las comidas, alergias/ }).check();
  await page.getByRole('textbox', { name: 'Notas de revisión', exact: true }).fill('Revisión individual E2E: merienda ajustada y menú revisado.');
  const single = page.waitForResponse(response => response.url().endsWith('/nutrition-plans/approve') && response.request().method() === 'POST');
  await publish.click();assert.equal((await single).status(), 200);
  await expect(page.getByText('Plan aprobado. El paciente puede consultar su ciclo de 30 días.', { exact: true })).toBeVisible();
  updated = await get(plans[0].id);assert.equal(updated.reviewStatus, 'approved');assert.equal(updated.approvedBy, fixtures.reviewer.userId);
  await page.screenshot({ path: path.join(output, 'erp-individual-success-real-db.png'), fullPage: true });
  report.steps.push('Individual approval completed with the real reviewer identity.');
  await page.keyboard.press('Escape');
  // Modificar la misma dieta vuelve a exigir aprobación, conservando el ciclo.
  await rowA().getByTitle('Editar', { exact: true }).click();
  await expect(page.locator('#plan-name')).toHaveValue('QA Diomedes A');
  await page.locator('#plan-desc').fill('Borrador del paciente ajustado por revisión E2E.');
  const resave = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/nutrition-plans/' + plans[0].id));
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();assert.equal((await resave).status(), 200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const revoked = await get(plans[0].id);assert.equal(revoked.reviewStatus, 'pending_review');assert.equal(revoked.approvedAt, null);
  await page.getByRole('checkbox', { name: 'Seleccionar todos los borradores de esta página', exact: true }).check();
  await page.getByRole('button', { name: 'Aprobar seleccionados (2)', exact: true }).click();
  const bulkPublish = page.getByRole('button', { name: 'Aprobar y publicar', exact: true });await expect(bulkPublish).toBeDisabled();
  await page.getByRole('checkbox', { name: /Confirmo que revisé individualmente/ }).check();
  await page.getByRole('textbox', { name: 'Notas de revisión', exact: true }).fill('Lote E2E real: ambos menús revisados, incluidas las meriendas.');
  const bulk = page.waitForResponse(response => response.url().endsWith('/nutrition-plans/approve') && response.request().method() === 'POST');
  await bulkPublish.click();const bulkResponse = await bulk;assert.equal(bulkResponse.status(), 200);
  const published = await bulkResponse.json();assert.equal(published.length, 2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'QA Diomedes A' }).getByText('Activo', { exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'QA Diomedes B' }).getByText('Activo', { exact: true })).toBeVisible();
  for (const plan of plans) { const saved = await get(plan.id);assert.equal(saved.reviewStatus,'approved');assert.equal(saved.approvedBy,fixtures.reviewer.userId); }
  await page.screenshot({ path: path.join(output, 'erp-bulk-success-real-db.png'), fullPage: true });
  report.steps.push('Successful bulk POST returned 200 and both fresh API reads show the approved revisions.');
  const history = await context.request.get(origin + `/api/v1/wellness/nutrition-plans/${plans[0].id}/history`, { headers });
  const events = await history.json();assert(events.some(event => event.action === 'modified'));assert(events.filter(event => event.action === 'approved').length >= 2);
  assert(events.filter(event=>event.action==='approved').every(event=>event.actorUserId===fixtures.reviewer.userId&&event.occurredAt));
  report.history = events;
  if (process.env.COP_E2E_DBNAME) {
    assert(/^copp_review_[a-z0-9]+$/.test(process.env.COP_E2E_DBNAME));
    const ids=plans.map(plan=>{assert(/^[a-f0-9-]{36}$/.test(plan.id));return `'${plan.id}'`;}).join(',');
    const sql=`SELECT json_agg(json_build_object('id',id,'reviewStatus',review_status,'approvedBy',approved_by,'approvedAt',approved_at,'revision',revision)) FROM app.nutrition_plans WHERE id IN (${ids})`;
    report.postgres=JSON.parse(execFileSync('docker',['exec','coppAddresd','psql','-U','app_user','-d',process.env.COP_E2E_DBNAME,'-Atc',sql],{encoding:'utf8'}));
    assert.equal(report.postgres.length,2);assert(report.postgres.every(plan=>plan.reviewStatus==='approved'&&plan.approvedBy===fixtures.reviewer.userId));
    report.steps.push('Direct PostgreSQL SELECT independently confirmed both approvals and their actor/timestamp.');
  }
  await writeFile(path.join(output,'nutrition-real-db-evidence.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({result:'passed',steps:report.steps,apiInterception:false,postgresVerified:Boolean(report.postgres)}));
} catch(error) {
  await page.screenshot({path:path.join(output,'nutrition-real-db-failure.png'),fullPage:true});
  await writeFile(path.join(output,'nutrition-real-db-failure.txt'),error.stack??error.message);
  console.error(error.message);process.exitCode=1;
} finally { await browser.close(); }

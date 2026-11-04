/** ERP browser regression: existing video routine, synthetic API responses, no patient writes. */
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const origin=process.env.E2E_BASE_URL??'http://localhost:3102';
const output=process.env.COP_E2E_OUTPUT;assert(output,'Keep evidence in a temporary output directory.');
const patientId='11111111-1111-4111-8111-111111111111';
const routineId='22222222-2222-4222-8222-222222222222';
const routine={id:routineId,name:'Rutina existente con vídeo QA',category:'Cardio',difficulty:'Beginner',status:'Active',exerciseCount:1,
 exercises:[{name:'Movimiento de prueba',mediaId:'33333333-3333-4333-8333-333333333333',mediaType:'Video',sortOrder:0}]};
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:950}});const page=await context.newPage();
const writes=[];const assignments=[];
try{
 await page.route('**/api/**',async route=>{
  const request=route.request(),p=new URL(request.url()).pathname;
  const reply=(body,status=200)=>route.fulfill({status,json:body});
  if(p==='/api/auth/refresh')return reply({accessToken:'synthetic-qa-token',expiresIn:3600});
  if(p==='/api/auth/me')return reply({id:patientId,firstName:'QA',lastName:'Revisor',email:'qa@example.invalid',roles:['Admin'],permissions:['Wellness.View','Wellness.Manage','Patients.View','Media.View']});
  if(p==='/api/v1/me/context')return reply({userId:patientId,employeeId:null,professionalId:null,organization:null,isProfessional:false,onboardingCompleted:true,employeeStatus:'Active',clinics:[],activeClinicId:null});
  if(request.method()==='POST'){
   const body=request.postDataJSON();writes.push({path:p,body});
   if(p==='/api/v1/wellness/routine-assignments'){
    const saved={id:'44444444-4444-4444-8444-444444444444',...body,patientName:'Paciente QA',routineName:routine.name,createdAt:new Date().toISOString()};assignments.push(saved);return reply(saved,201);
   }
   return reply({detail:'La rutina debe asignarse mediante routine-assignments.'},422);
  }
  if(p==='/api/v1/patients')return reply({data:[{id:patientId,firstName:'Paciente',lastName:'QA',email:'paciente@example.invalid'}],total:1,page:1,pageSize:10,totalPages:1});
  if(p==='/api/v1/wellness/exercise-routines')return reply({data:[routine],total:1,page:1,pageSize:10,totalPages:1});
  if(p==='/api/v1/wellness/routine-assignments')return reply({data:assignments,total:assignments.length,page:1,pageSize:100,totalPages:1});
  if(p==='/api/v1/wellness/nutrition-plan-assignments'||p==='/api/v1/wellness/nutrition-plans')return reply({data:[],total:0,page:1,pageSize:100,totalPages:0});
  return reply({},404);
 });
 await page.goto(origin+'/wellness/assignments/new');
 await page.getByPlaceholder('Buscar paciente por nombre...', {exact:true}).fill('Paciente QA');
 await page.getByRole('button',{name:/Paciente QA paciente@example.invalid/}).click();
 await page.getByPlaceholder('Buscar rutina por nombre...', {exact:true}).fill('Rutina existente');
 await page.getByRole('button',{name:/Rutina existente con vídeo QA/}).click();
 await page.locator('#start-date').fill('2026-11-04');await page.locator('#end-date').fill('2026-11-25');
 const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/api/v1/wellness/'));
 await page.getByRole('button',{name:'Crear asignación',exact:true}).click();await response;
 assert.equal(writes[0]?.path,'/api/v1/wellness/routine-assignments','Existing exercise routines must never be submitted as nutrition plans.');
 assert.equal(writes.length,1);assert.equal(writes[0].body.patientId,patientId);assert.equal(writes[0].body.routineId,routineId);assert.equal(writes[0].body.status,'Active');assert.equal(writes[0].body.frequency,'Diaria');assert.equal(writes[0].body.startDate,'2026-11-04T00:00:00.000Z');assert.equal(writes[0].body.endDate,'2026-11-25T00:00:00.000Z');assert(!('planId'in writes[0].body));
 await expect(page).toHaveURL(/\/wellness\/assignments(?:\?creado=1)?$/);
 await expect(page.getByRole('row').filter({hasText:routine.name})).toContainText('Paciente QA');
 await expect(page.getByText('Asignación creada correctamente.',{exact:true})).toBeVisible();
 await page.screenshot({path:path.join(output,'existing-video-routine-assigned.png'),fullPage:true});
 await writeFile(path.join(output,'result.json'),JSON.stringify({result:'passed',apiInterception:true,existingRoutineUsed:true,newRoutineCreated:false,submitted:writes},null,2));
 console.log('Passed: existing video routine assigned through the exercise endpoint; no new routine created.');
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.error(error.stack??error.message);process.exitCode=1;}finally{await browser.close();}

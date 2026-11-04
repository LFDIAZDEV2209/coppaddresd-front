/** ERP → actual Auth/API/PostgreSQL; isolated QA records, no API interception. */
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';import path from 'node:path';
const output=process.env.COP_E2E_OUTPUT,origin=process.env.E2E_BASE_URL??'http://localhost:3102';assert(output);
const cfg=JSON.parse(await readFile(process.env.COP_E2E_STACK_CONFIG,'utf8'));assert(cfg.database.startsWith('copp_review_'));
const fixtures=JSON.parse(await readFile(process.env.COP_E2E_FIXTURES,'utf8'));
const b=await chromium.launch(),c=await b.newContext({viewport:{width:1440,height:1000}}),page=await c.newPage();let headers,id,assignmentId,weekBackup;
const sql=query=>execFileSync('docker',['exec','-i',process.env.COP_E2E_DATABASE_CONTAINER??'coppAddresd','psql','-U','app_user','-d',cfg.database,'-At','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8'}).trim();
const sqlText=value=>"'"+value.replaceAll("'","''")+"'";
page.setDefaultTimeout(15000);
try{
 // Seed only this QA patient's current-week task schedule; restore it in finally.
 const enrollmentId=fixtures.patients[0].enrollmentId;assert.match(enrollmentId,/^[0-9a-f-]{36}$/i);
 weekBackup=JSON.parse(sql(`SELECT json_build_object('id',w.id,'tasks',w.tasks_snapshot)::text FROM app.program_weeks w JOIN app.program_enrollments e ON e.id=w.enrollment_id WHERE e.id='${enrollmentId}' AND w.week_number=e.current_week_number;`));
 const schedule=[...weekBackup.tasks];for(let weekday=1;weekday<=7;weekday++)if(!schedule.some(t=>t.weekday===weekday&&t.task_code==='ejercicio'))schedule.push({weekday,task_code:'ejercicio',points:50,sort_order:90});
 sql(`UPDATE app.program_weeks SET tasks_snapshot=${sqlText(JSON.stringify(schedule))}::jsonb WHERE id='${weekBackup.id}';`);
 const user=fixtures.admin;const login=await c.request.post(origin+'/api/auth/login',{data:{email:user.email,password:user.password,application:'erp',rememberMe:true}});assert.equal(login.status(),200);headers={Authorization:'Bearer '+(await login.json()).accessToken};
 await page.goto(origin+'/wellness/exercise-routines/new');await page.locator('#routine-name').fill('QA coherencia '+Date.now());
 await page.locator('#routine-target-muscles').fill('Piernas QA');await page.locator('#routine-equipment').fill('Silla QA');await page.locator('#routine-warmup').fill('Preparación QA');await page.locator('#routine-cooldown').fill('Cierre QA');
 await page.getByRole('combobox',{name:'Estado',exact:true}).click();await page.getByRole('option',{name:'Activo',exact:true}).click();
 await page.getByRole('button',{name:'Agregar ejercicio',exact:true}).click();
 await page.getByLabel('Nombre del ejercicio *',{exact:true}).fill('Plancha');await page.getByLabel('Descripción',{exact:true}).last().fill('Instrucción QA');await page.getByLabel('Músculo objetivo',{exact:true}).fill('Core QA');await page.getByLabel('Equipamiento',{exact:true}).fill('Colchoneta QA');await page.getByLabel('Tempo (ej: 2-1-2)',{exact:true}).fill('2-1-2');await page.getByLabel('RPE (1-10)',{exact:true}).fill('4');await page.getByLabel('Tips de forma',{exact:true}).fill('Técnica QA conservada');
 const saved=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/v1/wellness/exercise-routines'));await page.getByRole('button',{name:'Crear rutina',exact:true}).click();const response=await saved;assert.equal(response.status(),201);id=(await response.json()).id;
 const fresh=await c.request.get(origin+'/api/v1/wellness/exercise-routines/'+id,{headers});assert.equal(fresh.status(),200);const routine=await fresh.json();
 assert.equal(routine.targetMuscles,'Piernas QA');assert.equal(routine.equipment,'Silla QA');assert.equal(routine.warmupNotes,'Preparación QA');assert.equal(routine.cooldownNotes,'Cierre QA');
 const exercise=routine.exercises[0];assert.equal(exercise.targetMuscle,'Core QA');assert.equal(exercise.equipment,'Colchoneta QA');assert.equal(exercise.tempo,'2-1-2');assert.equal(exercise.rpe,4);assert.equal(exercise.tips,'Técnica QA conservada');assert.equal(exercise.referenceVideo?.author,'Smart Fit Chile');assert.match(exercise.referenceVideo?.embedUrl??'',/youtube-nocookie.com\/embed\/cCMob-mi19U/);
 await page.getByPlaceholder('Buscar por nombre...', {exact:true}).fill(routine.name);await page.getByTitle('Ver detalles',{exact:true}).first().click();await expect(page.getByRole('dialog').getByText('Técnica QA conservada',{exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByText('Smart Fit Chile',{exact:true})).toBeVisible();
 await page.screenshot({path:path.join(output,'routine-real-db.png'),fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Editar rutina',exact:true}).click();
 await expect(page.getByLabel('Tips de forma',{exact:true})).toHaveValue('Técnica QA conservada');
 await page.getByLabel('Tips de forma',{exact:true}).fill('Técnica QA editada');await page.getByLabel('Tempo (ej: 2-1-2)',{exact:true}).fill('3-1-3');
 const edited=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().endsWith('/api/v1/wellness/exercise-routines/'+id));await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();assert.equal((await edited).status(),200);
 const persisted=await (await c.request.get(origin+'/api/v1/wellness/exercise-routines/'+id,{headers})).json();
 assert.equal(persisted.exercises[0].tips,'Técnica QA editada');assert.equal(persisted.exercises[0].tempo,'3-1-3');assert.equal(persisted.targetMuscles,'Piernas QA');assert.equal(persisted.exercises[0].rpe,4);
 await page.getByTitle('Ver detalles',{exact:true}).first().click();await page.getByRole('button',{name:'Asignar a paciente',exact:true}).click();
 await expect(page).toHaveURL(new RegExp('/wellness/assignments/new\\?routineId='+id));await expect(page.getByText(routine.name,{exact:true})).toBeVisible();

 const patient=await (await c.request.get(origin+'/api/v1/patients/'+fixtures.patients[0].patientId,{headers})).json();
 await page.getByPlaceholder('Buscar paciente por nombre...',{exact:true}).fill(patient.firstName);
 await page.getByRole('button').filter({hasText:patient.email}).click();
 const assigned=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/v1/wellness/routine-assignments'),{timeout:15000});await page.getByRole('button',{name:'Crear asignación',exact:true}).click();const assignmentResponse=await assigned;assert.equal(assignmentResponse.status(),201);assignmentId=(await assignmentResponse.json()).id;
 const freshAssignment=await c.request.get(origin+'/api/v1/wellness/routine-assignments/'+assignmentId,{headers});assert.equal(freshAssignment.status(),200);const assignment=await freshAssignment.json();assert.equal(assignment.routineId,id);assert.equal(assignment.patientId,patient.id);
 const patientLogin=await c.request.post(origin+'/api/auth/login',{data:{email:fixtures.patients[0].email,password:fixtures.patients[0].password,application:'app',rememberMe:true}});assert.equal(patientLogin.status(),200);
 const patientAuth={Authorization:'Bearer '+(await patientLogin.json()).accessToken};const snapshotResponse=await c.request.get(origin+'/api/v1/program/me/snapshot',{headers:patientAuth});assert.equal(snapshotResponse.status(),200);
 const snapshot=await snapshotResponse.json();const content=snapshot.todayTasks.find(task=>task.taskCode==='ejercicio')?.content;assert.equal(content?.exerciseRoutineId,id);assert.equal(content.exercises[0].tips,'Técnica QA editada');assert.equal(content.exercises[0].tempo,'3-1-3');assert.equal(content.exercises[0].referenceVideo.author,'Smart Fit Chile');
 await expect(page.getByText('Asignación creada correctamente.',{exact:true})).toBeVisible();await page.screenshot({path:path.join(output,'routine-assigned-real-db.png'),fullPage:true,animations:'disabled'});await writeFile(path.join(output,'routine-persistence.json'),JSON.stringify({result:'passed',environment:cfg.database,apiInterception:false,metadataPersisted:true,editedMetadataPersisted:true,assignmentPersisted:true,patientSnapshotVerified:true,referenceVideo:exercise.referenceVideo},null,2));console.log('Passed: actual create/edit/read/assign preserve prescription metadata and the shared reference video.');
}catch(error){await page.screenshot({path:path.join(output,'routine-real-db-failure.png'),fullPage:true});console.error(error.stack??error.message);process.exitCode=1;}finally{if(weekBackup)sql(`UPDATE app.program_weeks SET tasks_snapshot=${sqlText(JSON.stringify(weekBackup.tasks))}::jsonb WHERE id='${weekBackup.id}';`);if(assignmentId&&headers)await c.request.delete(origin+'/api/v1/wellness/routine-assignments/'+assignmentId,{headers}).catch(()=>{});if(id&&headers)await c.request.delete(origin+'/api/v1/wellness/exercise-routines/'+id,{headers}).catch(()=>{});await b.close();}

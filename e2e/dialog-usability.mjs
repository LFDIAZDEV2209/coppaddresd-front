/** Real ERP dialogs with explicitly intercepted, synthetic data. No real writes. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import path from 'node:path';
const output=process.env.COP_E2E_OUTPUT;assert(output);const origin=process.env.E2E_BASE_URL??'http://localhost:3102';
const id='11111111-1111-4111-8111-111111111111',mediaId='22222222-2222-4222-8222-222222222222';
const routine={id,name:'Rutina de prueba con video',description:'Contenido sintético para verificar el detalle, la navegación y las indicaciones.',difficulty:'Facil',estimatedMinutes:20,category:'Fuerza',status:'Active',targetMuscles:'Piernas',equipment:'Silla',warmupNotes:'Preparación prescrita de prueba',cooldownNotes:'Cierre prescrito de prueba',mediaId:null,createdAt:'2026-11-04T12:00:00Z',exercises:Array.from({length:8},(_,i)=>({id:`exercise-${i}`,name:i===0?'Marcha en el lugar':`Ejercicio de prueba ${i+1}`,description:'Instrucción de prueba del equipo. '.repeat(12),sets:3,repetitions:10,restSeconds:30,durationSecs:60,weightKg:2,targetMuscle:'Piernas',equipment:'Silla',tempo:'2-1-2',rpe:4,tips:'Consejo de técnica de prueba',mediaId:i===0?mediaId:null,sortOrder:i}))};
const plan={id,name:'Plan de prueba',status:'Draft',isTemplate:true,durationDays:7,revision:1,days:[]};const assignment={id,patientId:id,patientName:'Paciente QA',routineId:id,routineName:routine.name,startDate:'2026-11-04T00:00:00Z',endDate:null,frequency:'Diaria',status:'Active',createdAt:'2026-11-04T12:00:00Z'};
async function mock(page){await page.route('**/api/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname;const reply=body=>route.fulfill({json:body});if(p==='/api/auth/refresh')return reply({accessToken:'qa-dialog-token',expiresIn:3600});if(p==='/api/auth/me')return reply({id,firstName:'QA',lastName:'Dialog',roles:['Admin'],permissions:['Wellness.View','Wellness.Manage','Media.View','Media.Create','Media.Publish']});if(p==='/api/v1/me/context')return reply({userId:id,isProfessional:false,onboardingCompleted:true,employeeStatus:'Active',clinics:[],activeClinicId:null});if(p==='/api/v1/wellness/exercise-routines/'+id)return reply(routine);if(p==='/api/v1/wellness/exercise-routines')return reply({data:[routine],total:1,page:1,pageSize:10,totalPages:1});if(p==='/api/v1/media/'+mediaId)return reply({id:mediaId,title:'Video prescrito de prueba',status:'Published',mediaType:'Video',storageKey:'qa/video.mp4'});if(p==='/api/v1/storage/sign')return reply({url:origin+'/qa/video.mp4'});if(p==='/api/v1/wellness/routine-assignments')return reply({data:[assignment],total:1,page:1,pageSize:100,totalPages:1});if(p==='/api/v1/wellness/nutrition-plan-assignments')return reply({data:[],total:0,page:1,pageSize:100,totalPages:0});if(p==='/api/v1/wellness/nutrition-plans/'+id)return reply(plan);if(p==='/api/v1/wellness/nutrition-plans')return reply({data:[plan],total:1,page:1,pageSize:10,totalPages:1});return route.fulfill({status:404,json:{}});});await page.route('**/qa/video.mp4',route=>route.fulfill({status:204}));}
const b=await chromium.launch(),results=[];
for(const width of [1440,390,320])for(const scenario of ['routine','assignment','nutrition-edit','confirmation']){
 const context=await b.newContext({viewport:{width,height:900}}),page=await context.newPage();await mock(page);
 try{
  await page.goto(origin+(scenario==='assignment'?'/wellness/assignments':scenario==='nutrition-edit'?'/wellness/nutrition-plans':'/wellness/exercise-routines'));
  const opener=page.getByTitle(scenario==='nutrition-edit'?'Editar':scenario==='confirmation'?'Eliminar':'Ver detalles',{exact:true}).first();await opener.click();
  const popup=page.getByRole(scenario==='confirmation'?'alertdialog':'dialog');await popup.waitFor();
  await popup.evaluate(async el => { await Promise.all(el.getAnimations({subtree:true}).map(a => a.finished.catch(()=>{}))); });
  const surface=await popup.evaluate(el => ({background:getComputedStyle(el).backgroundColor,opacity:getComputedStyle(el).opacity,backdrop:getComputedStyle(el).backdropFilter}));assert.equal(surface.opacity,'1','Dialog must settle to an opaque reading surface.');
  const box=await popup.boundingBox();assert(box&&box.x>=8&&box.x+box.width<=width-8,'Dialog must fit the viewport with safe gutters.');assert(box.y>=8&&box.y+box.height<=892,'Dialog must fit the viewport height.');
  if(scenario==='routine'){
   if(width>1000)assert(box.width>=880,'Detailed routine needs room for video and instructions.');
   await expect(popup.locator('video')).toHaveCount(1);
   await popup.getByRole('button',{name:/^2 Ejercicio de prueba 2/}).click();await expect(popup.locator('video')).toHaveCount(0);
   await popup.getByRole('button',{name:/^1 Marcha en el lugar/}).click();await expect(popup.locator('video')).toHaveCount(1);
   assert(await popup.locator('video').evaluate(el=>el.paused&&!el.autoplay&&el.controls));
   await expect(popup.getByRole('button',{name:'Asignar a paciente',exact:true})).toBeVisible();
   await expect(popup.getByText('2-1-2',{exact:true}).first()).toBeVisible();
  }
  if(scenario!=='confirmation'){
   const close=popup.locator('[data-slot="dialog-close"]').last();await expect(close).toHaveAccessibleName('Cerrar');const size=await close.boundingBox();assert(size.height>=40&&size.width>=40,'Close target must be usable on touch.');
   await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);await expect(opener).toBeFocused();
  }else await popup.getByRole('button',{name:'Cancelar',exact:true}).click();
  await opener.click();await page.getByRole(scenario==='confirmation'?'alertdialog':'dialog').waitFor();await page.screenshot({path:path.join(output,`${scenario}-${width}.png`),fullPage:true,animations:"disabled"});results.push({scenario,width,result:'passed'});
 }catch(error){results.push({scenario,width,result:'failed',error:error.message});await page.screenshot({path:path.join(output,`${scenario}-${width}-failure.png`),fullPage:true,animations:"disabled"});}
 await context.close();
}
await b.close();await writeFile(path.join(output,'dialog-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(r=>r.result==='failed'))process.exitCode=1;

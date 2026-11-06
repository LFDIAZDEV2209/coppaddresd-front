/** Browser contract regression. Synthetic APIs; never writes a real patient. */
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=process.env.COP_E2E_OUTPUT;assert(out,'Use a temporary evidence directory');await mkdir(out,{recursive:true});
const id='22222222-2222-4222-8222-222222222222';
const mediaId='33333333-3333-4333-8333-333333333333';
const media={id:mediaId,title:'Plancha · wger',mediaType:'Video',status:'Published',storageKey:'media/exercises/wger.mp4',author:'Goulart',provenance:{provider:'wger',sourceUrl:'https://wger.de/en/exercise/512/view/',author:'Goulart',licenseName:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',changes:'Convertido a MP4 H.264; sin cambios en el movimiento.'}};
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});let submitted,failedJob=false;
try {
 await page.route('**/api/**',async route=>{
  const r=route.request(),p=new URL(r.url()).pathname;const reply=(json,status=200)=>route.fulfill({status,json});
  if(p==='/api/auth/refresh')return reply({accessToken:'qa-token',expiresIn:3600});
  if(p==='/api/auth/me')return reply({id,firstName:'QA',lastName:'Reviewer',roles:['Admin'],permissions:['Wellness.View','Wellness.Manage','Media.View','Media.Create','Media.Publish']});
  if(p==='/api/v1/me/context')return reply({userId:id,clinics:[],onboardingCompleted:true});
  if(p==='/api/v1/wellness/exercise-media/wger')return reply({items:[{id:1,exerciseId:512,kind:'Video',title:'Plancha · wger',author:'Goulart',licenseName:'CC BY-SA 4.0',licenseUrl:media.provenance.licenseUrl,sourceUrl:media.provenance.sourceUrl}],page:1,hasMore:false});
  if(p==='/api/v1/wellness/exercise-media/wger/import')return reply({jobId:'qa-job',status:'queued'},202);
  if(p==='/api/v1/wellness/exercise-media/wger/imports/qa-job')return reply(failedJob?{jobId:'qa-job',status:'failed',error:'No se pudo preparar la demostración.'}:{jobId:'qa-job',status:'completed',media});
  if(p==='/api/v1/media/'+mediaId)return reply(media);
  if(p==='/api/v1/media')return reply({items:[],totalCount:0,page:1,pageSize:20,totalPages:0});
  if(p==='/api/v1/wellness/exercise-routines'&&r.method()==='POST'){submitted=r.postDataJSON();return reply({id,...submitted,exercises:submitted.exercises.map((e,i)=>({id:String(i),...e}))},201);}
  if(p==='/api/v1/wellness/exercise-routines')return reply({data:[],total:0,page:1,pageSize:20,totalPages:0});
  return reply({},404);
 });
 await page.goto((process.env.E2E_BASE_URL??'http://localhost:3102')+'/wellness/exercise-routines/new');
 await page.locator('#routine-name').fill('Rutina con fuentes verificables');
 await page.getByRole('button',{name:'Agregar ejercicio',exact:true}).click();
 await page.getByRole('textbox',{name:'Nombre del ejercicio *',exact:true}).fill('Plancha');
 await page.getByRole('tab',{name:'Mis archivos',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'too-large.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(20*1024*1024+1)});
 await expect(page.getByRole('alert').filter({hasText:'20 MB'})).toBeVisible();
 await page.getByRole('tab',{name:'YouTube',exact:true}).click();
 await page.getByLabel('Enlace de YouTube',{exact:true}).fill('https://youtube.com.evil.invalid/watch?v=cCMob-mi19U');
 await page.getByRole('button',{name:'Usar enlace',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'enlace válido de YouTube'})).toContainText('enlace válido de YouTube');
 await page.getByLabel('Enlace de YouTube',{exact:true}).fill('https://youtu.be/cCMob-mi19U?t=5');
 await page.getByRole('button',{name:'Usar enlace',exact:true}).click();
 await expect(page.locator('iframe')).toHaveAttribute('src',/youtube-nocookie.com\/embed\/cCMob-mi19U/);
 await expect(page.locator('iframe')).not.toHaveAttribute('src',/autoplay=1/);
 for(const width of [320,768,1440]) {
  await page.setViewportSize({width,height:1000});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'ERP must not overflow at '+width);
  const frame=page.locator('iframe');await expect.poll(async()=>!(await frame.count())||(await frame.boundingBox()).width>=200).toBe(true);if(await frame.count()){const box=await frame.boundingBox();assert(box.width>=200&&box.height>=200,'YouTube minimum player size');}
  await page.locator('section[aria-label="Demostración del ejercicio"]').screenshot({path:out+'/erp-youtube-'+width+'.png'});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:out+'/erp-youtube.png',fullPage:true});
 await page.getByRole('button',{name:'Crear rutina',exact:true}).click();
 await expect.poll(()=>submitted?.exercises?.[0]?.youTubeUrl).toBe('https://www.youtube.com/watch?v=cCMob-mi19U');
 assert.equal(submitted.exercises[0].mediaId,null);
 await page.goto((process.env.E2E_BASE_URL??'http://localhost:3102')+'/wellness/exercise-routines/new');
 await page.locator('#routine-name').fill('Rutina de wger');
 await page.getByRole('button',{name:'Agregar ejercicio',exact:true}).click();
 await page.getByRole('textbox',{name:'Nombre del ejercicio *',exact:true}).fill('Plancha');
 await page.getByRole('tab',{name:'wger',exact:true}).click();
 await expect(page.getByText(/Goulart · CC BY-SA 4.0/)).toBeVisible();
 await page.getByRole('button',{name:'Usar esta demostración',exact:true}).click();
 await expect(page.getByText('Goulart',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'CC BY-SA 4.0',exact:true})).toHaveAttribute('href',media.provenance.licenseUrl);
 await page.screenshot({path:out+'/erp-wger.png',fullPage:true});
 await page.getByRole('button',{name:'Crear rutina',exact:true}).click();
 await expect.poll(()=>submitted?.exercises?.[0]?.mediaId).toBe(mediaId);
 assert.equal(submitted.exercises[0].youTubeUrl,null);
 failedJob=true;
 await page.goto((process.env.E2E_BASE_URL??'http://localhost:3102')+'/wellness/exercise-routines/new');
 await page.locator('#routine-name').fill('Reintento de importación');
 await page.getByRole('button',{name:'Agregar ejercicio',exact:true}).click();
 await page.getByRole('textbox',{name:'Nombre del ejercicio *',exact:true}).fill('Plancha');
 await page.getByRole('button',{name:'Usar esta demostración',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'No se pudo preparar la demostración.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Crear rutina',exact:true})).toBeEnabled();
 failedJob=false;
 await page.getByRole('button',{name:'Usar esta demostración',exact:true}).click();
 await expect(page.getByRole('link',{name:'CC BY-SA 4.0',exact:true})).toBeVisible();
 console.log('PASS: YouTube validation/canonical save/official player; wger import, author/license and submitted mediaId. API interception only.');
} catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});console.error(e);process.exitCode=1;}finally{await browser.close();}

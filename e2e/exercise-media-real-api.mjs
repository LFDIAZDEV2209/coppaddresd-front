/** Real ERP -> local API -> isolated PostgreSQL + object storage + real wger.
 * Auth alone is synthetic. Requires a private local QA env; refuses remote APIs. */
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHmac,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.env.COP_E2E_OUTPUT;assert(out);await mkdir(out,{recursive:true});
const config=JSON.parse(await readFile(process.env.COP_E2E_ENV_FILE,'utf8'));
assert(config.ConnectionStrings__DefaultConnection.includes('Database=copp_review_exercise_media_'));
const api=process.env.COP_E2E_REAL_API??'http://127.0.0.1:5128';assert.equal(new URL(api).hostname,'127.0.0.1');
const origin=process.env.E2E_BASE_URL??'http://localhost:3102';
const permissions=['Wellness.View','Wellness.Manage','Media.View','Media.Create','Media.Publish'];
function jwt(id,perms=permissions){const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const body=Buffer.from(JSON.stringify({sub:id,iss:config.Jwt__Issuer,aud:'erp',exp:Math.floor(Date.now()/1000)+3600,permission:perms})).toString('base64url');return head+'.'+body+'.'+createHmac('sha256',config.Jwt__Secret).update(head+'.'+body).digest('base64url');}
const browser=await chromium.launch();const results=[];
for(const source of ['manual','youtube','wger'].filter(s=>!process.env.COP_E2E_SOURCE||s===process.env.COP_E2E_SOURCE)) {
 const id=process.env.COP_E2E_ACTOR_ID??randomUUID(),token=jwt(id);const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(15000);
 let saved,importJob;const writes=[];
 page.on('response',async response=>{
  const request=response.request(),p=new URL(response.url()).pathname;
  if(request.method()!=='POST'||p==='/api/auth/refresh')return;
  writes.push({path:p,status:response.status()});
  if(p==='/api/v1/wellness/exercise-routines'&&response.ok())saved=await response.json();
  if(!response.ok())console.log(source,'API error',p,response.status(),(await response.text()).slice(0,600));
 });
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname;const reply=json=>route.fulfill({json});
  if(p==='/api/auth/refresh')return reply({accessToken:token,expiresIn:3600});
  if(p==='/api/auth/me')return reply({id,firstName:'QA',lastName:'Reviewer',roles:['Admin'],permissions});
  if(p==='/api/v1/me/context')return reply({userId:id,clinics:[],onboardingCompleted:true});
  if(p.startsWith('/api/v1/wellness/')||p.startsWith('/api/v1/media')||p.startsWith('/api/v1/storage/')){
   return route.continue({url:api+p+url.search,headers:{...request.headers(),authorization:'Bearer '+token}});
  }
  return route.fulfill({status:404,json:{}});
 });
 try {
  await page.goto(origin+'/wellness/exercise-routines/new');
  await page.locator('#routine-name').fill('QA persistencia '+source+' '+id.slice(0,8));
  await page.getByRole('button',{name:'Agregar ejercicio',exact:true}).click();
  await page.getByRole('textbox',{name:'Nombre del ejercicio *',exact:true}).fill(source==='wger'?'Remo Gironda':'Plancha QA');
  if(source==='manual'){
   await page.getByRole('tab',{name:'Mis archivos',exact:true}).click();
   await page.locator('input[type=file]').setInputFiles(process.env.COP_E2E_VIDEO_FILE);
   await expect(page.getByRole('button',{name:'Quitar demostración',exact:true})).toBeVisible({timeout:120000});
  }else if(source==='youtube'){
   await page.getByRole('tab',{name:'YouTube',exact:true}).click();
   await page.getByLabel('Enlace de YouTube',{exact:true}).fill('https://youtu.be/cCMob-mi19U');
   await page.getByRole('button',{name:'Usar enlace',exact:true}).click();
  }else{
   await page.getByLabel('Buscar en wger',{exact:true}).fill('Remo Gironda');
   const accepted=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/wger/import'),{timeout:10000});
   await page.getByRole('article').filter({hasText:'Remo Gironda'}).getByRole('button',{name:'Usar esta demostración',exact:true}).first().click();
   const response=await accepted;assert.equal(response.status(),202);importJob=await response.json();assert(importJob.jobId);
   const denied=await page.request.get(api+'/api/v1/wellness/exercise-media/wger/imports/'+importJob.jobId,{headers:{authorization:'Bearer '+jwt(randomUUID())}});assert.equal(denied.status(),404);
   await expect(page.getByRole('link',{name:'CC BY-SA 4.0',exact:true})).toBeVisible({timeout:360000});
  }
  if(source!=='youtube') {
   // La biblioteca usa preload=none para ahorrar tráfico. Cargar explícitamente
   // desde la prueba verifica el archivo real sin activar reproducción automática.
   await expect(page.locator('video')).toHaveAttribute('src',/\/api\/v1\/storage\//);
   await page.locator('video').evaluate(video=>video.load());
   await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
  }
  await page.screenshot({path:out+'/real-'+source+'.png',fullPage:true});
  await page.locator('section[aria-label="Demostración del ejercicio"]').screenshot({path:out+'/source-'+source+'.png'});
  await page.getByRole('button',{name:'Crear rutina',exact:true}).click();
  await expect.poll(()=>saved?.id,{timeout:20000}).toBeTruthy();
  const persisted=await page.request.get(api+'/api/v1/wellness/exercise-routines/'+saved.id,{headers:{authorization:'Bearer '+token}});
  assert.equal(persisted.status(),200);const routine=await persisted.json();const exercise=routine.exercises[0];
  if(source==='youtube'){assert.equal(exercise.youTubeUrl,'https://www.youtube.com/watch?v=cCMob-mi19U');assert.equal(exercise.mediaId,null);assert.match(exercise.referenceVideo.embedUrl,/youtube-nocookie/);}
  else{
   assert(exercise.mediaId);const response=await page.request.get(api+'/api/v1/media/'+exercise.mediaId,{headers:{authorization:'Bearer '+token}});const media=await response.json();
   assert.equal(response.status(),200);assert.equal(media.contentType,'video/mp4');assert(media.fileSizeBytes<=20*1024*1024);assert(media.durationSecs<=180);assert(media.thumbnailKey.endsWith('poster.jpg'));
   if(source==='wger'){
    assert.equal(media.id,importJob.jobId);
    const repeat=await page.request.post(api+'/api/v1/wellness/exercise-media/wger/import',{headers:{authorization:'Bearer '+token},data:{id:1,kind:'Video'}});assert.equal(repeat.status(),202);const reused=await repeat.json();assert.equal(reused.jobId,importJob.jobId);assert.equal(reused.media.id,media.id);
    assert.equal(media.provenance.provider,'wger');assert.equal(media.provenance.licenseName,'CC BY-SA 4.0');assert(media.provenance.originalMetadata.includes('author_history'));assert(exercise.provenance);}
   results.push({source,routineId:routine.id,mediaId:media.id,storageKey:media.storageKey,bytes:media.fileSizeBytes,duration:media.durationSecs,author:media.provenance?.author});
  }
  assert(writes.every(w=>w.status<400),JSON.stringify(writes));
  results.push({source,routineId:routine.id,readBackFromRealApi:true,writes});console.log('PASS real persistence',source);
 }catch(e){await page.screenshot({path:out+'/failure-'+source+'.png',fullPage:true});console.error(source,e);process.exitCode=1;}finally{await page.close();}
}
await writeFile(out+'/results.json',JSON.stringify({database:'isolated PostgreSQL',storage:'local QA provider (production requires S3)',results},null,2));
await browser.close();

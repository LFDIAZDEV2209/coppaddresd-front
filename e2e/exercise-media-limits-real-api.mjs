/** Real UI, API, PostgreSQL quota concurrency and upload rejection. Local QA only. */
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const config=JSON.parse(await readFile(process.env.COP_E2E_ENV_FILE,'utf8'));
const database=/Database=([^;]+)/.exec(config.ConnectionStrings__DefaultConnection)?.[1];assert(database?.startsWith('copp_review_exercise_media_'));
const out=process.env.COP_E2E_OUTPUT;assert(out);await mkdir(out,{recursive:true});
const origin=process.env.E2E_BASE_URL??'http://localhost:3102',api='http://127.0.0.1:5128';
const permissions=['Wellness.View','Wellness.Manage','Media.View','Media.Create','Media.Publish'];
const sql=query=>execFileSync('docker',['exec','copp-qa-postgres-20261013','psql','-U','postgres','-d',database,'-Atc',query],{env:{...process.env,DOCKER_HOST:'unix:///var/run/docker.sock'},encoding:'utf8'}).trim();
function token(id,perms=permissions){const a=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),b=Buffer.from(JSON.stringify({sub:id,iss:config.Jwt__Issuer,aud:'erp',exp:Math.floor(Date.now()/1000)+3600,permission:perms})).toString('base64url');return a+'.'+b+'.'+createHmac('sha256',config.Jwt__Secret).update(a+'.'+b).digest('base64url');}
const browser=await chromium.launch();
async function form(id,perms=permissions){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const jwt=token(id,perms);
 await page.route('**/api/**',route=>{
  const r=route.request(),u=new URL(r.url()),p=u.pathname,reply=json=>route.fulfill({json});
  if(p==='/api/auth/refresh')return reply({accessToken:jwt,expiresIn:3600});
  if(p==='/api/auth/me')return reply({id,firstName:'QA',lastName:'Quota',roles:['Admin'],permissions:perms});
  if(p==='/api/v1/me/context')return reply({userId:id,clinics:[],onboardingCompleted:true});
  if(p.startsWith('/api/v1/'))return route.continue({url:api+p+u.search,headers:{...r.headers(),authorization:'Bearer '+jwt}});
  return route.fulfill({status:404,json:{}});
 });
 await page.goto(origin+'/wellness/exercise-routines/new');
 await page.locator('#routine-name').fill('QA límites');await page.getByRole('button',{name:'Agregar ejercicio',exact:true}).click();
 await page.getByRole('textbox',{name:'Nombre del ejercicio *',exact:true}).fill('Plancha QA');
 await page.getByRole('tab',{name:'Mis archivos',exact:true}).click();return {page,jwt};
}
try {
 const id=randomUUID();
 sql(`INSERT INTO app.exercise_media_usage (id,user_id,bytes,created_at) SELECT gen_random_uuid(),'${id}'::uuid,1,now() FROM generate_series(1,9)`);
 const forms=await Promise.all([form(id),form(id)]);
 const responses=forms.map(({page})=>page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/exercise-media/uploads'),{timeout:120000}));
 await Promise.all(forms.map(({page})=>page.locator('input[type=file]').setInputFiles(process.env.COP_E2E_VIDEO_FILE)));
 const statuses=await Promise.all(responses.map(async r=>(await r).status()));assert.deepEqual([...statuses].sort(),[201,422]);
 assert.equal(sql(`SELECT count(*) FROM app.exercise_media_usage WHERE user_id='${id}'`),'10');
 assert.equal(sql(`SELECT count(*) FROM app.media_items WHERE created_by='${id}'`),'1');
 for(let i=0;i<forms.length;i++){
  const {page}=forms[i];if(statuses[i]===422)await expect(page.getByRole('alert').filter({hasText:'límite diario'})).toBeVisible();
  else await expect(page.getByRole('button',{name:'Quitar demostración',exact:true})).toBeVisible();
  await page.screenshot({path:`${out}/concurrent-${statuses[i]}.png`,fullPage:true});await page.close();
 }
 const other=randomUUID(),{page,jwt}=await form(other);
 await page.locator('input[type=file]').setInputFiles({name:'large.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(20*1024*1024+1)});
 await expect(page.getByRole('alert').filter({hasText:'20 MB'})).toBeVisible();
 const tooLarge=await page.request.post(api+'/api/v1/wellness/exercise-media/uploads',{headers:{authorization:'Bearer '+jwt},multipart:{title:'QA large',file:{name:'large.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(20*1024*1024+1)}}});assert.equal(tooLarge.status(),422);
 const bad=await page.request.post(api+'/api/v1/wellness/exercise-media/uploads',{headers:{authorization:'Bearer '+jwt},multipart:{title:'QA wrong signature',file:{name:'fake.mp4',mimeType:'video/mp4',buffer:Buffer.from('not a video file')}}});assert.equal(bad.status(),422);
 const long=await page.request.post(api+'/api/v1/wellness/exercise-media/uploads',{headers:{authorization:'Bearer '+jwt},multipart:{title:'QA long clip',file:{name:'long.mp4',mimeType:'video/mp4',buffer:await readFile(process.env.COP_E2E_LONG_VIDEO_FILE)}}});assert.equal(long.status(),422);assert.match((await long.json()).detail,/180/);
 assert.equal(sql(`SELECT count(*) FROM app.exercise_media_usage WHERE user_id='${other}'`),'0');assert.equal(sql(`SELECT count(*) FROM app.media_items WHERE created_by='${other}'`),'0');
 await page.screenshot({path:out+'/file-size-limit.png',fullPage:true});await page.close();
 const restricted=await form(randomUUID(),['Wellness.View','Wellness.Manage','Media.View']);
 await expect(restricted.page.locator('input[type=file]')).toHaveCount(0);
 const forbidden=await restricted.page.request.post(api+'/api/v1/wellness/exercise-media/uploads',{headers:{authorization:'Bearer '+restricted.jwt},multipart:{title:'No permission',file:{name:'qa.mp4',mimeType:'video/mp4',buffer:await readFile(process.env.COP_E2E_VIDEO_FILE)}}});assert.equal(forbidden.status(),403);
 await restricted.page.close();
 await writeFile(out+'/results.json',JSON.stringify({result:'passed',concurrentStatuses:statuses,ledgerCount:10,publishedMedia:1,oversize:tooLarge.status(),invalidSignature:bad.status(),duration:long.status(),missingPermission:forbidden.status(),invalidFilesWrittenToStorage:0},null,2));
 console.log('PASS: atomic quota, 20 MB frontend/backend limit, content signature, 180-second server limit, 403 without publish permission.');
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();}

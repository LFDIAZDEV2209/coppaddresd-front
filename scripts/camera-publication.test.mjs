import test from 'node:test';
import assert from 'node:assert/strict';
import {replacePublishedCamera} from '../lib/twilio/camera-publication.ts';
const track = (kind='video',name='camera') => ({kind,name,stopped:false,removed:false,stop(){this.stopped=true},detach(){return [{remove:()=>{this.removed=true}}]}});
test('replaces only the camera and waits for publication before confirming success',async()=>{
 const camera=track(),audio=track('audio'),screen=track('video','screen'),replacement=track();
 const removed=[];let published=false;
 const result=await replacePublishedCamera({current:[camera,audio,screen],create:async()=>replacement,publish:async()=>{published=true},unpublish:t=>removed.push(t),active:()=>true});
 assert.equal(result,replacement);assert.equal(published,true);assert.deepEqual(removed,[camera]);
 assert.equal(camera.stopped,true);assert.equal(audio.stopped,false);assert.equal(screen.stopped,false);
});
test('failed publication stops the new camera rather than leaving a misleading local preview',async()=>{
 const replacement=track();
 await assert.rejects(()=>replacePublishedCamera({current:[],create:async()=>replacement,publish:async()=>{throw Error('publish failed')},unpublish:()=>{},active:()=>true}));
 assert.equal(replacement.stopped,true);assert.equal(replacement.removed,true);
});
test('leaving while publishing cleans up the late camera without retaining a device',async()=>{
 const replacement=track();let active=true;let unpublished=false;
 await assert.rejects(()=>replacePublishedCamera({current:[],create:async()=>replacement,publish:async()=>{active=false},unpublish:()=>{unpublished=true},active:()=>active}));
 assert.equal(unpublished,true);assert.equal(replacement.stopped,true);
});

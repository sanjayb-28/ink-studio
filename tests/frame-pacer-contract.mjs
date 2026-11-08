import assert from 'node:assert/strict';
import {FramePacer} from '../src/frame-pacer.ts';
for(const hz of [60,120]){const p=new FramePacer();p.start(0,2,{hz});let report;for(let i=1;i<=hz*2+1;i++){const r=p.sample(i*1000/hz,1000/hz,2,true);if(r)report=r;}assert.ok(Math.abs(report.fps-hz)<.01);assert.equal(report.over25ms,0);assert.equal(report.renderP95,2);assert.ok(report.frames<hz*2,'Warm-up frames are excluded');}
const bad=new FramePacer();bad.start(0,2,{});let now=0,report;while(now<2200){now+=33.33;report=bad.sample(now,33.33,22,true)??report;}assert.ok(report.fps<31);assert.ok(report.frameP95>33);assert.equal(report.over25ms,report.frames,'Slow frames must not be averaged away');
const cancelled=new FramePacer();cancelled.start(0,2,{});cancelled.cancel();assert.equal(cancelled.sample(3000,16.67,1,true),undefined);
console.log('PASS frame pacer: 60/120 Hz reporting, warm-up exclusion, slow-frame detection and cancellation.');

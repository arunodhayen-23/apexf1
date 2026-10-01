import assert from 'node:assert/strict'
import {makeCircuit,createRace,creditProgress,resetCar,step,standings,pose,tracks} from './racing'

function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 } }
for(let track=0;track<tracks.length;track++){
 const setup={track,driver:0,team:0,laps:1,difficulty:1},c=makeCircuit(track),r=createRace(c,setup,seeded(123)),p=r.cars[0]
 assert.ok(c.length>500)
 const start=pose(c,0),end=pose(c,c.length)
 assert.ok(Math.hypot(start.x-end.x,start.z-end.z)<.001)
 creditProgress(p,c.length*.7,c,1,1)
 assert.equal(p.checkpoint,1,'shortcut must not credit a checkpoint')
 assert.equal(p.progress,8,'teleport must not change progress')
 const saved=p.progress;p.x+=40;resetCar(r,c);assert.equal(p.progress,saved);assert.equal(p.speed,0)
 for(let t=0;t<36000&&!r.cars[1].finish;t++)step(r,c,setup,new Set(),1/60)
 assert.ok(r.cars[1].finish>0,'AI completes all ordered checkpoints')
 assert.equal(p.lap,0,'stationary player gets no laps')
 assert.notEqual(standings(r)[0],p)
 const runner=createRace(c,setup,seeded(123)).cars[0]
 for(let d=9;d<=c.length+2;d+=1)creditProgress(runner,d,c,d/50,1)
 assert.equal(runner.lap,1,'ordered forward lap counts')
 assert.ok(runner.finish>0)
 const reverse=createRace(c,setup,seeded(123)).cars[0]
 for(let d=7;d>-c.length;d--)creditProgress(reverse,d,c,1,1)
 assert.equal(reverse.lap,0,'reverse crossing never counts')
 const paused=createRace(c,setup,seeded(123));paused.paused=true;step(paused,c,setup,new Set(['w']),1);assert.equal(paused.countdown,3.5)
 const driven=createRace(c,setup,seeded(123))
 for(let frame=0;frame<48000&&!driven.finished;frame++){
  const player=driven.cars[0],target=pose(c,player.progress+10)
  const desired=Math.atan2(target.x-player.x,target.z-player.z)
  const error=Math.atan2(Math.sin(desired-player.heading),Math.cos(desired-player.heading))
  const input=new Set<string>([player.speed<19?'w':'s'])
  if(error>.02)input.add('a');if(error<-.02)input.add('d')
  step(driven,c,setup,input,1/60)
 }
 assert.ok(driven.finished,`keyboard-driven player can complete track ${track}`)
 assert.ok(driven.cars[0].best>0)
}
const setup={track:1,driver:0,team:0,laps:1,difficulty:1}, circuit=makeCircuit(1)
const first=createRace(circuit,setup,seeded(22)), second=createRace(circuit,setup,seeded(73))
assert.notDeepEqual(first.cars.map(c=>c.pace),second.cars.map(c=>c.pace),'fresh pace on every race')
assert.notDeepEqual(first.cars.map(c=>c.name),second.cars.map(c=>c.name),'fresh rival grid')
let orderChanges=0,previous=standings(first).map(c=>c.name).join(',')
for(let frame=0;frame<30000&&!first.cars.slice(1).every(c=>c.finish);frame++){
 step(first,circuit,setup,new Set(),1/60)
 const order=standings(first).map(c=>c.name).join(',');if(order!==previous)orderChanges++;previous=order
}
assert.ok(orderChanges>5,'live positions change through the race')
assert.ok(first.cars.slice(1).every(c=>c.finish),'all rivals finish')
console.log('Passed: seven geographic circuits, keyboard laps, shortcut protection, AI finishes, fresh grids, overtakes, ranking, reset and pause.')

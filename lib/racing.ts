import { CatmullRomCurve3, Vector3 } from 'three'
import { circuitPoints, tracks } from './circuits'
export { tracks } from './circuits'

export const drivers = [
  { name: 'Max Verstappen', short: 'VER', number: 1, country: 'NETHERLANDS' },
  { name: 'Lewis Hamilton', short: 'HAM', number: 44, country: 'UNITED KINGDOM' },
  { name: 'Charles Leclerc', short: 'LEC', number: 16, country: 'MONACO' },
  { name: 'Kimi Antonelli', short: 'ANT', number: 12, country: 'ITALY' },
]
export const teams = [
  { name: 'Red Bull Racing', color: '#203574', accent: '#f8d347', code: 'RBR' },
  { name: 'Scuderia Ferrari', color: '#e32932', accent: '#fff0bb', code: 'FER' },
  { name: 'Mercedes-AMG', color: '#20cdb6', accent: '#d3dddd', code: 'MER' },
]
export type Setup = { track: number; driver: number; team: number; laps: number; difficulty: number }
export type Circuit = ReturnType<typeof makeCircuit>
export function makeCircuit(id: number) {
  const curve = new CatmullRomCurve3(circuitPoints(id).map(([x,z]) => new Vector3(x,0,z)), true, 'centripetal')
  curve.arcLengthDivisions = 6000
  curve.updateArcLengths()
  const samples = curve.getSpacedPoints(3000).slice(0,3000)
  return { curve, samples, length: curve.getLength(), width: tracks[id].width }
}
export function pose(c: Circuit, distance: number, lane = 0) {
  const t = ((distance / c.length) % 1 + 1) % 1
  const p = c.curve.getPointAt(t), tangent = c.curve.getTangentAt(t)
  return { x: p.x + tangent.z * lane, z: p.z - tangent.x * lane, heading: Math.atan2(tangent.x,tangent.z) }
}
export type Tyre = 'soft' | 'medium' | 'hard'
export type Racer = { name: string; color: string; x: number; z: number; heading: number; speed: number; progress: number; checkpoint: number; lap: number; lapStart: number; best: number; finish: number; lane: number; pace: number; phase: number; consistency: number; mistakeUntil: number; nextEvent: number; tyre: Tyre; tyreWear: number; battery: number; overtakeEnergy: number; pitState: 'track' | 'entry' | 'stopped' | 'exit'; pitTimer: number }
export type Race = { cars: Racer[]; time: number; countdown: number; paused: boolean; finished: boolean; camera: number; offroad: boolean }
export const tyreSpecs: Record<Tyre, { label: string; color: string; grip: number; wear: number }> = {
  soft: { label: 'SOFT', color: '#ec4949', grip: 1.08, wear: 1.6 },
  medium: { label: 'MEDIUM', color: '#e8c547', grip: 1, wear: 1 },
  hard: { label: 'HARD', color: '#e8edf0', grip: .94, wear: .62 },
}
export function createRace(c: Circuit, setup: Setup, random: () => number = Math.random): Race {
  const rivals = [...drivers.filter((_,i)=>i!==setup.driver).map(d=>d.name), 'Lando Norris', 'Oscar Piastri']
  for (let i = rivals.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [rivals[i], rivals[j]] = [rivals[j], rivals[i]] }
  const names = [drivers[setup.driver].name, ...rivals]
  return { cars: names.map((name,i) => ({name, color: i === 0 ? teams[setup.team].color : ['','#e32932','#20cdb6','#233fc4','#f49b38','#f49b38'][i], ...pose(c, 8 - i*6, i%2 ? -3 : 3), speed:0, progress:8-i*6, checkpoint:1, lap:0, lapStart:0, best:Infinity, finish:0, lane:i%2 ? -3 : 3, pace:.94+random()*.12, phase:random()*Math.PI*2, consistency:.02+random()*.05, mistakeUntil:0, nextEvent:12+random()*22, tyre:'medium', tyreWear:0, battery:4, overtakeEnergy:.5, pitState:'track', pitTimer:0})), time:0, countdown:3.5, paused:false, finished:false, camera:0, offroad:false }
}
export function changeTyres(r: Race, tyre: Tyre) {
  const car=r.cars[0]
  if(car.pitState==='stopped') car.tyre=tyre
}
export function requestPit(r: Race) {
  const car=r.cars[0]
  if(!r.paused&&!r.finished&&r.countdown<=0&&car.pitState==='track') { car.pitState='entry'; car.pitTimer=0 }
}
export function resetCar(r: Race,c: Circuit) {
  const car=r.cars[0]; Object.assign(car,pose(c,car.progress,0)); car.speed=0; car.lane=0; car.pitState='track'; car.pitTimer=0
}
export function creditProgress(car: Racer, next: number, c: Circuit, time: number, laps: number) {
  const delta = next-car.progress
  if(delta < -c.length/2) next+=c.length
  if(delta > c.length/2) next-=c.length
  if(Math.abs(next-car.progress)>15) return
  car.progress=next
  const gate = car.checkpoint*c.length/16
  if(next>=gate && next-gate<15) {
    car.checkpoint++
    if((car.checkpoint-1)%16===0) {
      car.lap++; car.best=Math.min(car.best,time-car.lapStart); car.lapStart=time
      car.overtakeEnergy=.5
      if(car.lap>=laps) car.finish=time
    }
  }
}
export function step(r: Race,c: Circuit,setup: Setup,keys: Set<string>,dt: number) {
  if(r.paused || r.finished) return
  if(r.countdown>0) {r.countdown=Math.max(0,r.countdown-dt);return}
  r.time+=dt
  r.cars.forEach((car,i)=>{
    if(car.finish) return
    if(i>0) {
      const a=pose(c,car.progress), b=pose(c,car.progress+24)
      const bend=Math.abs(Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading)))
      if(r.time > car.nextEvent) {
        car.mistakeUntil = r.time + .6 + (1 + Math.sin(car.phase + car.nextEvent)) * .65
        car.nextEvent = r.time + 18 + (1 + Math.cos(car.phase + r.time)) * 18
      }
      const form = 1 + Math.sin(r.time * .19 + car.phase) * car.consistency
      const ahead = r.cars.filter(other => other !== car && !other.finish && other.progress > car.progress && other.progress - car.progress < 22).sort((a,b)=>a.progress-b.progress)[0]
      const gap = ahead ? ahead.progress - car.progress : Infinity
      const passingLane = ahead ? (ahead.lane >= 0 ? -3.4 : 3.4) : Math.sin(r.time*.12+car.phase)*1.8
      car.lane += (passingLane-car.lane)*Math.min(1,dt*1.8)
      const slipstream = ahead && bend < .15 ? 1.06 : 1
      let target=(46+setup.difficulty*10)*car.pace*form*slipstream/(1+bend*3.1)
      if(r.time < car.mistakeUntil) target *= .68
      if(ahead && gap < 7 && Math.abs(car.lane-ahead.lane) < 2.8) target = Math.min(target,ahead.speed*.94)
      car.speed+=(target-car.speed)*Math.min(1,dt*1.8)
      const next=car.progress+car.speed*dt
      creditProgress(car,next,c,r.time,setup.laps)
      Object.assign(car,pose(c,car.progress,car.lane))
      return
    }
    const accelerate=keys.has('w')||keys.has('arrowup'), brake=keys.has('s')||keys.has('arrowdown')
    const steer=Number(keys.has('a')||keys.has('arrowleft'))-Number(keys.has('d')||keys.has('arrowright'))
    if(keys.has('p')&&car.pitState==='track') { car.pitState='entry'; car.pitTimer=0 }
    if(car.pitState==='entry') {
      car.pitTimer+=dt; car.speed=Math.min(car.speed,16); car.speed=Math.max(0,car.speed-8*dt)
      car.progress+=car.speed*dt; car.lane=-(c.width/2+3.5)
      creditProgress(car,car.progress,c,r.time,setup.laps)
      Object.assign(car,pose(c,car.progress,car.lane))
      if(car.pitTimer>=1.25) { car.pitState='stopped'; car.pitTimer=4.5; car.speed=0 }
      return
    }
    if(car.pitState==='stopped') {
      car.pitTimer=Math.max(0,car.pitTimer-dt); car.speed=0; car.battery=4
      if(car.pitTimer===0) { car.pitState='exit'; car.pitTimer=0 }
      return
    }
    if(car.pitState==='exit') {
      car.pitTimer+=dt; car.lane=-(c.width/2+3.5)*(1-Math.min(1,car.pitTimer/1.5))
      car.progress+=Math.max(car.speed,12)*dt; car.speed=Math.max(car.speed,12)
      creditProgress(car,car.progress,c,r.time,setup.laps)
      Object.assign(car,pose(c,car.progress,car.lane))
      if(car.pitTimer>=1.5) { car.pitState='track'; car.pitTimer=0; car.lane=0 }
      return
    }
    const ahead=r.cars.filter(other=>other!==car&&other.finish===0&&other.progress>car.progress&&other.progress-car.progress<65).sort((a,b)=>a.progress-b.progress)[0]
    const closeAhead=!!ahead&&ahead.progress-car.progress<Math.max(35,car.speed*1.15)
    const deploy=(keys.has('e')||keys.has('shift'))&&car.battery>0&&accelerate
    const overtake=deploy&&closeAhead&&car.overtakeEnergy>0
    const currentGrip=tyreSpecs[car.tyre].grip*(1-car.tyreWear*.32)
    const bendStart=pose(c,car.progress),bendEnd=pose(c,car.progress+24)
    const bend=Math.abs(Math.atan2(Math.sin(bendEnd.heading-bendStart.heading),Math.cos(bendEnd.heading-bendStart.heading)))
    const deployKw=bend<.15?350:250
    const batteryDrain=deploy?deployKw/1000:0
    car.battery=Math.max(0,Math.min(4,car.battery-batteryDrain*dt+(brake?.15:accelerate?0:.045)*dt))
    if(overtake) car.overtakeEnergy=Math.max(0,car.overtakeEnergy-.35*dt)
    car.tyreWear=Math.min(1,car.tyreWear+dt*.00024*tyreSpecs[car.tyre].wear*(1+car.speed/100))
    car.speed=Math.max(0,Math.min(deploy?97:85,car.speed+(accelerate?22*currentGrip: -3)*dt-(brake?42*dt:0)+(deploy?(overtake?15:10)*dt:0)-car.speed*car.speed*.0017*dt))
    car.heading+=steer*dt*1.88*Math.min(car.speed/12,1)/(1+car.speed/92)
    car.x+=Math.sin(car.heading)*car.speed*dt; car.z+=Math.cos(car.heading)*car.speed*dt
    const sampleCount=c.samples.length, hint=((Math.floor(((car.progress%c.length+c.length)%c.length)/c.length*sampleCount)%sampleCount)+sampleCount)%sampleCount
    let index=hint, nearest=Infinity
    const search=(radius:number)=>{for(let offset=-radius;offset<=radius;offset++){const j=(hint+offset+sampleCount)%sampleCount,p=c.samples[j],d=(p.x-car.x)**2+(p.z-car.z)**2;if(d<nearest){nearest=d;index=j}}}
    search(24)
    if(nearest>(c.width*2)**2) { nearest=Infinity; for(let j=0;j<sampleCount;j++){const p=c.samples[j],d=(p.x-car.x)**2+(p.z-car.z)**2;if(d<nearest){nearest=d;index=j}} }
    const distance=Math.sqrt(nearest)
    r.offroad=distance>c.width/2
    if(r.offroad) car.speed*=Math.exp(-dt*1.5)
    if(distance>c.width/2+5){ const p=c.samples[index]; const scale=(c.width/2+4)/distance; car.x=p.x+(car.x-p.x)*scale; car.z=p.z+(car.z-p.z)*scale; car.speed*=.6 }
    let next=index/c.samples.length*c.length+Math.floor(car.progress/c.length)*c.length
    if(distance<c.width/2+2) creditProgress(car,next,c,r.time,setup.laps)
  })
  const p=r.cars[0]
  for(const rival of r.cars.slice(1).filter(car=>!car.finish)){ const dx=p.x-rival.x,dz=p.z-rival.z,dist=Math.hypot(dx,dz); if(dist<2.5&&dist>.01){p.x+=dx/dist*.12;p.z+=dz/dist*.12;p.speed*=.98} }
  if(p.finish) r.finished=true
}
export function standings(r: Race) {return [...r.cars].sort((a,b)=>a.finish&&b.finish?a.finish-b.finish:a.finish?-1:b.finish?1:b.progress-a.progress)}
export function formatTime(s: number){ if(!Number.isFinite(s)||s<=0)return '—'; return `${Math.floor(s/60)}:${(s%60).toFixed(3).padStart(6,'0')}` }

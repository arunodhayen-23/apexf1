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
export type Weather = 'clear' | 'cloudy' | 'rain' | 'heavy-rain'
export type TrackCondition = 'dry' | 'damp' | 'wet'
export type EngineType = 'v8' | 'v10'
export type Setup = { track: number; driver: number; team: number; laps: number; difficulty: number; engine?: EngineType; weather?: Weather; trackCondition?: TrackCondition }
export const engineSpecs: Record<EngineType, { label: string; topSpeed: number; acceleration: number; peakRpm: number }> = {
  v8: { label: 'V8', topSpeed: 86, acceleration: 25, peakRpm: 18000 },
  v10: { label: 'V10', topSpeed: 90, acceleration: 23, peakRpm: 19500 },
}
export type DRSZone = { detection: number; start: number; end: number }
// Fractions follow each circuit's GPS lap line and approximate its DRS straights.
// Drivers must pass the detection point within one second to earn DRS.
const drsLayouts: DRSZone[][] = [
  [{detection:.035,start:.065,end:.17},{detection:.54,start:.57,end:.68}],
  [{detection:.075,start:.105,end:.22},{detection:.47,start:.50,end:.64}],
  [{detection:.095,start:.125,end:.23},{detection:.62,start:.65,end:.77}],
  [{detection:.115,start:.145,end:.26},{detection:.66,start:.69,end:.82}],
  [{detection:.105,start:.135,end:.25},{detection:.69,start:.72,end:.85}],
  [{detection:.135,start:.165,end:.28},{detection:.69,start:.72,end:.85}],
  [{detection:.425,start:.455,end:.56},{detection:.82,start:.85,end:.96}],
  [{detection:.065,start:.095,end:.20},{detection:.44,start:.47,end:.60}],
  [{detection:.31,start:.34,end:.46},{detection:.76,start:.79,end:.91}],
  [{detection:.075,start:.105,end:.22},{detection:.56,start:.59,end:.72}],
  [{detection:.105,start:.135,end:.24},{detection:.52,start:.55,end:.66}],
  [{detection:.055,start:.085,end:.19},{detection:.55,start:.58,end:.69}],
  [{detection:.135,start:.165,end:.29},{detection:.58,start:.61,end:.74}],
  [{detection:.12,start:.15,end:.27},{detection:.67,start:.70,end:.83}],
  [{detection:.13,start:.16,end:.28},{detection:.67,start:.70,end:.83}],
  [{detection:.12,start:.15,end:.27},{detection:.65,start:.68,end:.81}],
  [{detection:.07,start:.10,end:.20},{detection:.53,start:.56,end:.67}],
  [{detection:.23,start:.26,end:.37},{detection:.67,start:.70,end:.82}],
  [{detection:.035,start:.065,end:.17},{detection:.50,start:.53,end:.64}],
  [{detection:.12,start:.15,end:.27},{detection:.69,start:.72,end:.85}],
  [{detection:.075,start:.105,end:.22},{detection:.59,start:.62,end:.74}],
  [{detection:.13,start:.16,end:.28},{detection:.63,start:.66,end:.78}],
  [{detection:.075,start:.105,end:.22},{detection:.65,start:.68,end:.80}],
  [{detection:.095,start:.125,end:.24},{detection:.68,start:.71,end:.83}],
  [{detection:.075,start:.105,end:.22},{detection:.55,start:.58,end:.71}],
  [{detection:.12,start:.15,end:.27},{detection:.59,start:.62,end:.75}],
  [{detection:.075,start:.105,end:.22},{detection:.63,start:.66,end:.78}],
]
export function drsZonesForTrack(track: number) { return drsLayouts[track] ?? drsLayouts[0] }
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
export type Racer = { name: string; color: string; x: number; z: number; heading: number; speed: number; progress: number; checkpoint: number; lap: number; lapStart: number; best: number; finish: number; lane: number; pace: number; phase: number; consistency: number; mistakeUntil: number; nextEvent: number; tyre: Tyre; tyreWear: number; drsEligibleUntil: number; drsOpen: boolean; pitState: 'track' | 'entry' | 'stopped' | 'exit'; pitTimer: number }
export type Race = { cars: Racer[]; time: number; countdown: number; paused: boolean; finished: boolean; camera: number; offroad: boolean; trackWetness: number }
export const tyreSpecs: Record<Tyre, { label: string; color: string; grip: number; wear: number }> = {
  soft: { label: 'SOFT', color: '#ec4949', grip: 1.08, wear: 1.6 },
  medium: { label: 'MEDIUM', color: '#e8c547', grip: 1, wear: 1 },
  hard: { label: 'HARD', color: '#e8edf0', grip: .94, wear: .62 },
}
export function createRace(c: Circuit, setup: Setup, random: () => number = Math.random): Race {
  const rivals = [...drivers.filter((_,i)=>i!==setup.driver).map(d=>d.name), 'Lando Norris', 'Oscar Piastri', 'Carlos Sainz', 'George Russell', 'Fernando Alonso', 'Pierre Gasly', 'Esteban Ocon', 'Alex Albon', 'Yuki Tsunoda', 'Nico Hülkenberg', 'Liam Lawson', 'Oliver Bearman', 'Gabriel Bortoleto', 'Lance Stroll', 'Valtteri Bottas', 'Sergio Pérez']
  for (let i = rivals.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [rivals[i], rivals[j]] = [rivals[j], rivals[i]] }
  const names = [drivers[setup.driver].name, ...rivals]
  const startingWetness=(setup.trackCondition??'dry')==='dry'?0:setup.trackCondition==='damp'?.38:.76
  const rivalColors=['#e32932','#20cdb6','#233fc4','#f49b38','#f1eee8','#e32932','#20cdb6','#f49b38']
  return { cars: names.map((name,i) => ({name, color: i === 0 ? teams[setup.team].color : rivalColors[(i-1)%rivalColors.length], ...pose(c, 8 - i*6, i%2 ? -3 : 3), speed:0, progress:8-i*6, checkpoint:1, lap:0, lapStart:0, best:Infinity, finish:0, lane:i%2 ? -3 : 3, pace:.94+random()*.12, phase:random()*Math.PI*2, consistency:.02+random()*.05, mistakeUntil:0, nextEvent:12+random()*22, tyre:'medium', tyreWear:0, drsEligibleUntil:Number.NEGATIVE_INFINITY, drsOpen:false, pitState:'track', pitTimer:0})), time:0, countdown:3.5, paused:false, finished:false, camera:0, offroad:false, trackWetness:startingWetness }
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
      if(car.lap>=laps) car.finish=time
    }
  }
}
function trackGap(from: number, to: number, length: number) {
  let gap=to-from
  if(gap>length/2) gap-=length
  if(gap< -length/2) gap+=length
  return gap
}
function updateDRS(car: Racer, previousProgress: number, race: Race, track: number, length: number) {
  const zones=drsZonesForTrack(track)
  const firstLap=Math.floor(previousProgress/length),lastLap=Math.floor(car.progress/length)
  for(let lap=firstLap;lap<=lastLap;lap++) for(const zone of zones) {
    const detection=lap*length+zone.detection*length
    if(previousProgress<detection&&car.progress>=detection) {
      const gap=race.cars.filter(other=>other!==car&&!other.finish).map(other=>({other,gap:trackGap(car.progress,other.progress,length)})).filter(item=>item.gap>0).sort((a,b)=>a.gap-b.gap)[0]
      const withinOneSecond=race.trackWetness<=.2&&!!gap&&gap.gap<=Math.max(1,car.speed,gap.other.speed)
      car.drsEligibleUntil=withinOneSecond?lap*length+zone.end*length:Number.NEGATIVE_INFINITY
    }
  }
  const lapDistance=((car.progress%length)+length)%length
  const inZone=zones.some(zone=>lapDistance>=zone.start*length&&lapDistance<=zone.end*length)
  if(!inZone||race.trackWetness>.2) car.drsOpen=false
}
export function step(r: Race,c: Circuit,setup: Setup,keys: Set<string>,dt: number) {
  if(r.paused || r.finished) return
  if(r.countdown>0) {r.countdown=Math.max(0,r.countdown-dt);return}
  r.time+=dt
  const weather=setup.weather??'clear'
  const weatherWetness=weather==='heavy-rain'?1:weather==='rain'?.86:weather==='cloudy'?.05:0
  r.trackWetness+=(weatherWetness-r.trackWetness)*Math.min(1,dt*.012)
  r.cars.forEach((car,i)=>{
    if(car.finish) return
    const previousProgress=car.progress
    if(i>0) {
      const a=pose(c,car.progress), b=pose(c,car.progress+24)
      const bend=Math.abs(Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading)))
      if(setup.difficulty===0&&r.time > car.nextEvent) {
        car.mistakeUntil = r.time + .6 + (1 + Math.sin(car.phase + car.nextEvent)) * .65
        car.nextEvent = r.time + 18 + (1 + Math.cos(car.phase + r.time)) * 18
      }
      const form = 1 + Math.sin(r.time * .19 + car.phase) * car.consistency
      const traffic=r.cars.map(other=>({other,gap:other===car?Infinity:trackGap(car.progress,other.progress,c.length)})).filter(item=>item.gap>0&&item.gap<32).sort((a,b)=>a.gap-b.gap)
      const ahead=traffic[0]?.other, gap=traffic[0]?.gap??Infinity
      const preferredLane=(i%2?-3:3)
      const passingLane=ahead&&gap>13?(ahead.lane>=0?-3.4:3.4):preferredLane
      car.lane+=(passingLane-car.lane)*Math.min(1,dt*1.05)
      const slipstream = ahead && bend < .15 ? 1.06 : 1
      const engine=engineSpecs[setup.engine??'v10']
      const activeZone=drsZonesForTrack(setup.track).some(zone=>{const d=((car.progress%c.length)+c.length)%c.length;return d>=zone.start*c.length&&d<=zone.end*c.length})
      const drsAvailable=activeZone&&car.drsEligibleUntil>=car.progress&&r.trackWetness<=.2
      let target=(70+setup.difficulty*7)*car.pace*form*slipstream*(1-r.trackWetness*.2)/(1+bend*3.1)
      if(drsAvailable)target+=7
      target=Math.min(target,engine.topSpeed+(drsAvailable?8:0))
      car.drsOpen=drsAvailable
      if(r.time < car.mistakeUntil) target *= setup.difficulty===0?.68:.84
      if(ahead&&Math.abs(car.lane-ahead.lane)<3.8){const safeGap=6.2+Math.max(0,car.speed-ahead.speed)*.42;if(gap<safeGap+8)target=Math.min(target,Math.max(0,ahead.speed+(gap-safeGap)*.55))}
      car.speed+=(target-car.speed)*Math.min(1,dt*1.8)
      const next=car.progress+car.speed*dt
      creditProgress(car,next,c,r.time,setup.laps)
      updateDRS(car,previousProgress,r,setup.track,c.length)
      Object.assign(car,pose(c,car.progress,car.lane))
      return
    }
    const accelerate=keys.has('w')||keys.has('arrowup'), brake=keys.has('s')||keys.has('arrowdown')
    const steer=Number(keys.has('a')||keys.has('arrowleft'))-Number(keys.has('d')||keys.has('arrowright'))
    if(keys.has('p')&&car.pitState==='track') { car.pitState='entry'; car.pitTimer=0 }
    if(car.pitState==='entry') {
      car.drsOpen=false
      car.pitTimer+=dt; car.speed=Math.min(car.speed,16); car.speed=Math.max(0,car.speed-8*dt)
      car.progress+=car.speed*dt; car.lane=-(c.width/2+3.5)
      creditProgress(car,car.progress,c,r.time,setup.laps)
      updateDRS(car,previousProgress,r,setup.track,c.length)
      Object.assign(car,pose(c,car.progress,car.lane))
      if(car.pitTimer>=1.25) { car.pitState='stopped'; car.pitTimer=4.5; car.speed=0 }
      return
    }
    if(car.pitState==='stopped') {
      car.pitTimer=Math.max(0,car.pitTimer-dt); car.speed=0; car.drsOpen=false
      if(car.pitTimer===0) { car.pitState='exit'; car.pitTimer=0 }
      return
    }
    if(car.pitState==='exit') {
      car.drsOpen=false
      car.pitTimer+=dt; car.lane=-(c.width/2+3.5)*(1-Math.min(1,car.pitTimer/1.5))
      car.progress+=Math.max(car.speed,12)*dt; car.speed=Math.max(car.speed,12)
      creditProgress(car,car.progress,c,r.time,setup.laps)
      updateDRS(car,previousProgress,r,setup.track,c.length)
      Object.assign(car,pose(c,car.progress,car.lane))
      if(car.pitTimer>=1.5) { car.pitState='track'; car.pitTimer=0; car.lane=0 }
      return
    }
    const engine=engineSpecs[setup.engine??'v10']
    const activeZone=drsZonesForTrack(setup.track).some(zone=>{const d=((car.progress%c.length)+c.length)%c.length;return d>=zone.start*c.length&&d<=zone.end*c.length})
    const drsEligible=car.drsEligibleUntil>=car.progress&&activeZone&&r.trackWetness<=.2
    const drsOpen=drsEligible&&keys.has('e')&&accelerate
    car.drsOpen=drsOpen
    const currentGrip=tyreSpecs[car.tyre].grip*(1-car.tyreWear*.32)*(1-r.trackWetness*.42)
    const bendStart=pose(c,car.progress),bendEnd=pose(c,car.progress+24)
    const bend=Math.abs(Math.atan2(Math.sin(bendEnd.heading-bendStart.heading),Math.cos(bendEnd.heading-bendStart.heading)))
    car.tyreWear=Math.min(1,car.tyreWear+dt*.00024*tyreSpecs[car.tyre].wear*(1+car.speed/100))
    let trafficSpeedCap=Infinity
    for(const rival of r.cars.slice(1)){
      if(rival.finish)continue
      const dx=rival.x-car.x,dz=rival.z-car.z,forward=dx*Math.sin(car.heading)+dz*Math.cos(car.heading),lateral=Math.abs(dx*Math.cos(car.heading)-dz*Math.sin(car.heading))
      if(forward>0&&forward<Math.max(24,car.speed*.75)&&lateral<3.1){const safeGap=5.8;trafficSpeedCap=Math.min(trafficSpeedCap,Math.sqrt(rival.speed*rival.speed+2*36*(Math.max(0,forward-safeGap))))}
    }
    let nextSpeed=Math.max(0,Math.min(engine.topSpeed+(drsOpen?8:0),car.speed+(accelerate?engine.acceleration*currentGrip: -3)*dt-(brake?42*(1-r.trackWetness*.2)*dt:0)-car.speed*car.speed*(drsOpen?.00105:.0017)*dt))
    if(Number.isFinite(trafficSpeedCap)&&nextSpeed>trafficSpeedCap)nextSpeed=Math.max(trafficSpeedCap,car.speed-42*(1-r.trackWetness*.2)*dt)
    car.speed=nextSpeed
    car.heading+=steer*dt*1.88*Math.min(car.speed/12,1)/(1+car.speed/92)
    car.x+=Math.sin(car.heading)*car.speed*dt; car.z+=Math.cos(car.heading)*car.speed*dt
    const sampleCount=c.samples.length, hint=((Math.floor(((car.progress%c.length+c.length)%c.length)/c.length*sampleCount)%sampleCount)+sampleCount)%sampleCount
    let index=hint, nearest=Infinity
    const search=(radius:number)=>{for(let offset=-radius;offset<=radius;offset++){const j=(hint+offset+sampleCount)%sampleCount,p=c.samples[j],d=(p.x-car.x)**2+(p.z-car.z)**2;if(d<nearest){nearest=d;index=j}}}
    search(24)
    if(nearest>(c.width*2)**2) { nearest=Infinity; for(let j=0;j<sampleCount;j++){const p=c.samples[j],d=(p.x-car.x)**2+(p.z-car.z)**2;if(d<nearest){nearest=d;index=j}} }
    const distance=Math.sqrt(nearest)
    r.offroad=distance>c.width/2
    if(r.offroad) car.speed*=Math.exp(-dt*(1.5+r.trackWetness*.8))
    if(distance>c.width/2+5){ const p=c.samples[index]; const scale=(c.width/2+4)/distance; car.x=p.x+(car.x-p.x)*scale; car.z=p.z+(car.z-p.z)*scale; car.speed*=.6 }
    let next=index/c.samples.length*c.length+Math.floor(car.progress/c.length)*c.length
    if(distance<c.width/2+2) creditProgress(car,next,c,r.time,setup.laps)
    updateDRS(car,previousProgress,r,setup.track,c.length)
    if(!steer&&distance<c.width/2) {const tangent=pose(c,index/sampleCount*c.length).heading;const correction=Math.atan2(Math.sin(tangent-car.heading),Math.cos(tangent-car.heading));car.heading+=correction*Math.min(1,dt*(.6+r.trackWetness*.35))}
  })
  const softened=new Set<Racer>()
  for(let pass=0;pass<24;pass++)for(let i=0;i<r.cars.length;i++)for(let j=i+1;j<r.cars.length;j++){
    const a=r.cars[i],b=r.cars[j]
    if(a.finish||b.finish)continue
    const dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz),minimum=6.8
    if(dist>=minimum)continue
    const aBehind=trackGap(a.progress,b.progress,c.length)>0,behind=aBehind?a:b,front=aBehind?b:a
    const angle=(i*31+j*17)*2.399963229728653,ux=dist>.001?dx/dist:Math.cos(angle),uz=dist>.001?dz/dist:Math.sin(angle),push=minimum-dist+.025
    a.x-=ux*push*.5;a.z-=uz*push*.5;b.x+=ux*push*.5;b.z+=uz*push*.5
    if(!softened.has(behind)){behind.speed=Math.min(behind.speed,front.speed*.88);softened.add(behind)}
  }
  if(r.cars[0].finish) r.finished=true
}
export function standings(r: Race) {return [...r.cars].sort((a,b)=>a.finish&&b.finish?a.finish-b.finish:a.finish?-1:b.finish?1:b.progress-a.progress)}
export function formatTime(s: number){ if(!Number.isFinite(s)||s<=0)return '—'; return `${Math.floor(s/60)}:${(s%60).toFixed(3).padStart(6,'0')}` }

'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Component, memo, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { type Circuit, type Race, type Setup, step, teams, drivers, type Weather } from '@/lib/racing'
import CircuitWorld from './circuit-world'

function Box({position,scale,color,rotation=0}:{position:[number,number,number];scale:[number,number,number];color:string;rotation?:number}) {
 return <mesh position={position} rotation={[0,rotation,0]} castShadow receiveShadow><boxGeometry args={scale}/><meshStandardMaterial color={color} roughness={.48} metalness={.35}/></mesh>
}
function RivalCar({color}:{color:string}) {
 return <group>
  <Box position={[0,.39,0]} scale={[1.75,.2,3.9]} color={color}/><Box position={[0,.58,-.45]} scale={[1.05,.42,1.65]} color={color}/>
  <Box position={[0,.35,2.25]} scale={[.65,.15,1.55]} color={color}/><Box position={[0,.42,2.9]} scale={[2.35,.1,.45]} color={color}/>
  <Box position={[0,.92,-1.9]} scale={[2.1,.12,.62]} color={color}/>
  {[-1,1].map(side=>[-1.35,1.35].map(z=><mesh key={`${side}-${z}`} position={[side*1.02,.47,z]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.43,.43,.42,12]}/><meshStandardMaterial color="#111318" roughness={.9}/></mesh>))}
 </group>
}
function WeatherFx({weather}:{weather:Weather}) {
 const count=weather==='heavy-rain'?520:weather==='rain'?300:0
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry(),positions=new Float32Array(count*6);for(let i=0;i<count;i++){const x=(Math.random()-.5)*34,z=(Math.random()-.5)*34,y=2+Math.random()*18,offset=i*6;positions.set([x,y,z,x,y-.8,z],offset)}g.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));return g},[count])
 useEffect(()=>()=>geometry.dispose(),[geometry])
 useFrame((_,delta)=>{if(!count)return;const attribute=geometry.getAttribute('position') as THREE.BufferAttribute,positions=attribute.array as Float32Array,speed=weather==='heavy-rain'?35:23;for(let i=0;i<count;i++){const offset=i*6,y=positions[offset+1]-speed*delta;if(y<0){positions[offset]=(Math.random()-.5)*34;positions[offset+1]=16+Math.random()*5;positions[offset+2]=(Math.random()-.5)*34}else positions[offset+1]=y;positions[offset+4]=positions[offset+1]-.8}attribute.needsUpdate=true})
 if(!count)return null
 return <lineSegments geometry={geometry}><lineBasicMaterial color="#c7dce7" transparent opacity={weather==='heavy-rain'?.27:.18}/></lineSegments>
}
export function Car({color='#233fc4',accent='#f7c633',number=1,tyreColor='#e6b92c'}:{color?:string;accent?:string;number?:number;tyreColor?:string}) {
 const numberMap=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,128,128);ctx.fillStyle='#ffffff';ctx.font='italic bold 80px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(number),64,69);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture},[number,color])
 useEffect(()=>()=>numberMap.dispose(),[numberMap])
 return <group>
  <mesh position={[0,.694,1.3]} rotation={[-Math.PI/2,0,Math.PI]}><planeGeometry args={[.37,.65]}/><meshStandardMaterial map={numberMap}/></mesh>
  <Box position={[0,.39,2.18]} scale={[2.2,.065,.22]} color="#1d2026"/>
  <Box position={[0,.5,2.05]} scale={[1.95,.065,.22]} color={color}/>
  <Box position={[0,1.09,-2.03]} scale={[2.2,.08,.35]} color="#171a22"/>
  <Box position={[0,.7,1.95]} scale={[.32,.035,.24]} color={accent}/>
  <Box position={[0,.36,0]} scale={[1.8,.18,4.4]} color="#121419"/>
  <Box position={[0,.63,-.55]} scale={[1.2,.55,2.5]} color={color}/>
  <Box position={[0,.53,1.45]} scale={[.4,.3,2.1]} color={color}/>
  <Box position={[0,.28,2.35]} scale={[2.45,.12,.55]} color={color}/>
  <Box position={[0,.98,-2]} scale={[2.2,.14,.65]} color={color}/>
  <Box position={[0,.66,-2]} scale={[.15,.65,.2]} color="#15171b"/>
  {[-1,1].map(side=><group key={side}>
   <Box position={[side*.7,.57,-.2]} scale={[.5,.4,1.8]} color={color}/>
   <Box position={[side*.9,.34,1.4]} scale={[1.1,.06,.12]} color="#15171b" rotation={side*.3}/>
   <Box position={[side*1.06,.53,2.36]} scale={[.06,.45,.6]} color={color}/>
   {[-1.45,1.45].map(z=><group key={z} position={[side*1.07,.48,z]} rotation={[0,0,Math.PI/2]}>
    <mesh castShadow><cylinderGeometry args={[.48,.48,.48,24]}/><meshStandardMaterial color="#101114" roughness={.9}/></mesh>
    <mesh position={[0,side*.245,0]}><cylinderGeometry args={[.28,.28,.015,16]}/><meshStandardMaterial color="#34363b" metalness={.9} roughness={.3}/></mesh>
    <mesh position={[0,side*.26,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.37,.018,6,24]}/><meshStandardMaterial color={tyreColor}/></mesh>
   </group>)}
  </group>)}
  <mesh position={[0,.96,.15]}><sphereGeometry args={[.26,16,12]}/><meshStandardMaterial color={accent}/></mesh>
  <mesh position={[0,1.05,-.6]} rotation={[.2,0,0]}><coneGeometry args={[.38,1.1,4]}/><meshStandardMaterial color={color}/></mesh>
  <mesh position={[0,1.03,.15]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.42,.045,8,24,Math.PI]}/><meshStandardMaterial color="#16181c"/></mesh>
 </group>
}
function RaceWorld({race,c,setup,keys,onUpdate}:{race:Race;c:Circuit;setup:Setup;keys:Set<string>;onUpdate:()=>void}){
 const cars=useRef<(THREE.Group|null)[]>([]), previous=useRef<{x:number;z:number;heading:number}[]>([]), accumulator=useRef(0), timer=useRef(0), mounted=useRef(false)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 const target=useMemo(()=>new THREE.Vector3(),[]), look=useMemo(()=>new THREE.Vector3(),[])
 useFrame(({camera},delta)=>{
  accumulator.current+=Math.min(delta,.1)
  if(previous.current.length!==race.cars.length)previous.current=race.cars.map(car=>({x:car.x,z:car.z,heading:car.heading}))
  while(accumulator.current>=1/60){race.cars.forEach((car,i)=>Object.assign(previous.current[i],{x:car.x,z:car.z,heading:car.heading}));step(race,c,setup,keys,1/60);accumulator.current-=1/60}
  const alpha=race.paused||race.countdown>0?1:accumulator.current*60
  const rendered=race.cars.map((car,i)=>{const old=previous.current[i];let turn=Math.atan2(Math.sin(car.heading-old.heading),Math.cos(car.heading-old.heading));return{x:old.x+(car.x-old.x)*alpha,z:old.z+(car.z-old.z)*alpha,heading:old.heading+turn*alpha}})
  race.cars.forEach((car,i)=>{const g=cars.current[i],pose=rendered[i];if(g){g.visible=i===0||!car.finish;g.position.set(pose.x,0,pose.z);g.rotation.y=pose.heading}})
  const p=rendered[0], distance=race.camera?-.45:9
  target.set(p.x-Math.sin(p.heading)*distance,race.camera?1.35:4.3,p.z-Math.cos(p.heading)*distance)
  camera.position.lerp(target,1-Math.exp(-delta*12));look.set(p.x+Math.sin(p.heading)*18,1,p.z+Math.cos(p.heading)*18);camera.lookAt(look)
  timer.current+=delta;if(timer.current>.1&&mounted.current){onUpdate();timer.current=0}
 })
 return <><CircuitWorld c={c} track={setup.track} weather={setup.weather??'clear'} wetness={race.trackWetness}/>{race.cars.map((car,i)=><group key={i} ref={el=>{cars.current[i]=el}}>{i===0?<><Car color={car.color} number={drivers[setup.driver].number} accent={teams[setup.team].accent} tyreColor={({soft:'#ec4949',medium:'#e8c547',hard:'#e8edf0'} as const)[car.tyre]}/><WeatherFx weather={setup.weather??'clear'}/></>:<RivalCar color={car.color}/>}</group>)}</>
}
class GraphicsBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="graphics-error">3D rendering is unavailable. Enable hardware acceleration and reload in a WebGL-compatible desktop browser.</div>:this.props.children}
}
function Scene({team=0,number=1,race,c,setup,keys,onUpdate}:{team?:number;number?:number;race?:Race;c?:Circuit;setup?:Setup;keys?:Set<string>;onUpdate?:()=>void}) {
 return <GraphicsBoundary><Canvas dpr={[1,1.35]} camera={{position:[6,3.4,6],fov:race?65:32}} gl={{antialias:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping}} fallback={<div className="graphics-error">A WebGL-compatible browser is required to race.</div>}>
  {race&&c&&setup&&keys&&onUpdate?<RaceWorld race={race} c={c} setup={setup} keys={keys} onUpdate={onUpdate}/>:<>
   <ambientLight intensity={1.6}/><directionalLight position={[5,8,3]} intensity={4}/><directionalLight position={[-6,3,-2]} intensity={3} color="#7c9bff"/>
   <group rotation={[0,-.45,0]}><Car color={teams[team].color} accent={teams[team].accent} number={number}/></group>
   <ContactShadows position={[0,-.01,0]} opacity={.5} scale={15} blur={2.5} far={5}/>
   <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={.35} minPolarAngle={.7} maxPolarAngle={1.4} target={[0,.4,0]}/>
  </>}
 </Canvas></GraphicsBoundary>
}
export default memo(Scene)

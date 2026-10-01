'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Component, memo, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { type Circuit, type Race, type Setup, step, teams, drivers } from '@/lib/racing'
import CircuitWorld from './circuit-world'

function Box({position,scale,color,rotation=0}:{position:[number,number,number];scale:[number,number,number];color:string;rotation?:number}) {
 return <mesh position={position} rotation={[0,rotation,0]} castShadow receiveShadow><boxGeometry args={scale}/><meshStandardMaterial color={color} roughness={.48} metalness={.35}/></mesh>
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
 const cars=useRef<(THREE.Group|null)[]>([]), accumulator=useRef(0), timer=useRef(0), mounted=useRef(false)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 const target=useMemo(()=>new THREE.Vector3(),[]), look=useMemo(()=>new THREE.Vector3(),[])
 useFrame(({camera},delta)=>{
  accumulator.current+=Math.min(delta,.1)
  while(accumulator.current>=1/60){step(race,c,setup,keys,1/60);accumulator.current-=1/60}
  race.cars.forEach((car,i)=>{const g=cars.current[i];if(g){g.visible=i===0||!car.finish;g.position.set(car.x,0,car.z);g.rotation.y=car.heading}})
  const p=race.cars[0], distance=race.camera?-.45:9
  target.set(p.x-Math.sin(p.heading)*distance,race.camera?1.35:4.3,p.z-Math.cos(p.heading)*distance)
  camera.position.lerp(target,1-Math.exp(-delta*9));look.set(p.x+Math.sin(p.heading)*18,1,p.z+Math.cos(p.heading)*18);camera.lookAt(look)
  timer.current+=delta;if(timer.current>.1&&mounted.current){onUpdate();timer.current=0}
 })
 return <><CircuitWorld c={c} track={setup.track}/>{race.cars.map((car,i)=><group key={i} ref={el=>{cars.current[i]=el}}><Car color={car.color} number={i===0?drivers[setup.driver].number:drivers.find(d=>d.name===car.name)?.number??(i===4?4:81)} accent={i===0?teams[setup.team].accent:undefined} tyreColor={i===0?({soft:'#ec4949',medium:'#e8c547',hard:'#e8edf0'} as const)[car.tyre]:'#d4d7d9'}/></group>)}</>
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

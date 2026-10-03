'use client'

import { Sky } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { pose, tracks, type Circuit, type Weather } from '@/lib/racing'
import { circuitVisual } from '@/lib/circuit-visuals'

type Placement = { x: number; y: number; z: number; heading?: number; scale: [number, number, number]; color: string }
function Instances({ items, shape = 'box', glow = false }: { items: Placement[]; shape?: 'box' | 'cone'; glow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    items.forEach((p, i) => {
      object.position.set(p.x, p.y, p.z); object.rotation.set(0, p.heading ?? 0, 0); object.scale.set(...p.scale); object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix); ref.current!.setColorAt(i, new THREE.Color(p.color))
    })
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>{shape === 'cone' ? <coneGeometry args={[1, 1, 7]} /> : <boxGeometry />}{glow?<meshBasicMaterial toneMapped={false}/>:<meshStandardMaterial roughness={.92}/>}</instancedMesh>
}
function Block({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={position} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.8} /></mesh>
}
function TrackSurface({ c, visual, wetness }: { c: Circuit; visual: ReturnType<typeof circuitVisual>; wetness: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')!, image = ctx.createImageData(256, 256)
    for (let i = 0; i < image.data.length; i += 4) { const hash = Math.sin(i * 78.233) * 43758.5453; const v = 57 + (hash - Math.floor(hash)) * 15; image.data[i] = v; image.data[i + 1] = v + 1; image.data[i + 2] = v + 3; image.data[i + 3] = 255 }
    ctx.putImageData(image, 0, 0)
    const map = new THREE.CanvasTexture(canvas); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4
    return map
  }, [])
  const geometry = useMemo(() => {
    const positions: number[] = [], colors: number[] = [], uv: number[] = [], indices: number[] = []
    const half = c.width / 2, count = c.samples.length
    const bands = [
      [-half - 7, -half - 1, visual.runoff],
      [-half - 1, -half - .22, 'curb'], [-half - .22, -half, visual.kerbs[0]],
      [-half, half, 'road'], [half, half + .22, visual.kerbs[0]],
      [half + .22, half + 1, 'curb'], [half + 1, half + 7, visual.runoff],
    ] as const
    bands.forEach(([left, right, color]) => {
      const base = positions.length / 3
      for (let i = 0; i <= count; i++) {
        const distance = i / count * c.length, p = pose(c, distance)
        for (const lane of [left, right]) {
          positions.push(p.x + Math.cos(p.heading) * lane, .035, p.z - Math.sin(p.heading) * lane)
          uv.push(lane / 5, distance / 5)
          const col = new THREE.Color(color === 'curb' ? (Math.floor(distance / 4) % 2 ? visual.kerbs[0] : visual.kerbs[1]) : color === 'road' ? '#ffffff' : color)
          colors.push(col.r, col.g, col.b)
        }
        if (i < count) { const a = base + i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
      }
    })
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals()
    const stripSize = count * 6
    bands.forEach((band, i) => g.addGroup(i * stripSize, stripSize, band[2] === 'road' ? 0 : 1))
    return g
  }, [c, visual])
  useEffect(() => () => { texture.dispose() }, [texture])
  useEffect(() => () => { geometry.dispose() }, [geometry])
  const night=visual.daypart!=='day'
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial attach="material-0" map={texture} vertexColors color={new THREE.Color(1-wetness*.19,1-wetness*.12,1-wetness*.08)} emissive={night?'#9dcfff':'#000000'} emissiveIntensity={night?.42:0} roughness={.96-wetness*.53} metalness={wetness*.12} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /><meshStandardMaterial attach="material-1" vertexColors roughness={.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /></mesh>
}
function PitLane({ c }: { c: Circuit }) {
  const geometry=useMemo(()=>{
    const positions:number[]=[],indices:number[]=[],count=c.samples.length,offset=-(c.width/2+3.5),halfWidth=2.5
    for(let i=0;i<=count;i++){
      const p=pose(c,i/count*c.length,offset)
      positions.push(p.x+Math.sin(p.heading)*-halfWidth,.055,p.z+Math.cos(p.heading)*-halfWidth)
      positions.push(p.x+Math.sin(p.heading)*halfWidth,.055,p.z+Math.cos(p.heading)*halfWidth)
      if(i<count){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g
  },[c])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#31383d" roughness={.94} side={THREE.DoubleSide}/></mesh>
}
function Sign({ text, width = 10 }: { text: string; width?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#123d34'; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 66, 480)
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map
  }, [text])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh><boxGeometry args={[width, width / 4, .18]} /><meshStandardMaterial map={texture} /></mesh>
}
function Floodlights({ c, color }: { c: Circuit; color: string }) {
  const stations=Math.max(8,Math.min(12,Math.ceil(c.length/500)))
  const positions=useMemo(()=>Array.from({length:stations},(_,i)=>pose(c,(i+.35)/stations*c.length)),[c,stations])
  return <>{positions.map((p,i)=><pointLight key={i} position={[p.x,24,p.z]} color={color} intensity={50000} distance={280} decay={2}/>)}</>
}
export default function CircuitWorld({ c, track, weather, wetness }: { c: Circuit; track: number; weather: Weather; wetness: number }) {
  const venue = tracks[track], visual=circuitVisual(venue.name), night=visual.daypart==='night', twilight=visual.daypart==='twilight'
  const desert = venue.environment === 'desert' || visual.terrain==='desert', urban = venue.environment === 'harbour' || venue.environment === 'city' || visual.terrain==='city' || visual.terrain==='stadium'
  const scenery = useMemo(() => {
    const barriers: Placement[] = [], trees: Placement[] = [], trunks: Placement[] = [], buildings: Placement[] = [], windows: Placement[] = [], crowds: Placement[] = []
    const count = Math.ceil(c.length / 7)
    for (let i = 0; i < count; i++) for (const side of [-1, 1]) {
      const p = pose(c, i / count * c.length, side * (c.width / 2 + (urban ? 2 : 9)))
      barriers.push({ ...p, y: .65, scale: [.45, 1.3, c.length / count + .15], color: i % 10 < 5 ? '#dcded9' : visual.kerbs[1] })
      if (i % 2 === 0) barriers.push({ ...p, y: 2.1, scale: [.09, 3, .09], color: '#777f80' })
      for (const y of [1.5, 2.2, 2.9]) barriers.push({ ...p, y, scale: [.045, .035, c.length / count + .15], color: '#939b99' })
    }
    const scenicSamples=c.samples.filter((_,index)=>index%16===0)
    for (let i = 0; i < (urban ? 100 : 420); i++) {
      const p = pose(c, i / (urban ? 100 : 420) * c.length, (i % 2 ? 1 : -1) * (30 + (i * 17 % 95)))
      if (scenicSamples.some(s => Math.hypot(s.x - p.x, s.z - p.z) < 23)) continue
      if (urban) {
        const height = 9 + i % 7 * 4
        buildings.push({ ...p, y: height / 2, scale: [15, height, 18], color: ['#d3c5b1', '#e3d7c3', '#babec0', visual.ground][i % 4] })
        for (let floor = 3; floor < height; floor += 3.5) {
          const nx = Math.cos(p.heading), nz = -Math.sin(p.heading)
          for (const side of [-1, 1]) {
            const glass=night?['#f3cd8a','#a8d9e2','#f0e5d1'][Math.floor(i/3)%3]:'#546c78'
            windows.push({ ...p, x: p.x + nx * 7.55 * side, z: p.z + nz * 7.55 * side, y: floor, scale: [.1, 1.6, 14], color: glass })
            windows.push({ ...p, x: p.x + Math.sin(p.heading) * 9.05 * side, z: p.z + Math.cos(p.heading) * 9.05 * side, y: floor, scale: [12, 1.6, .1], color: glass })
          }
        }
      } else if (!desert) {
        const h = 8 + i % 9
        trunks.push({ ...p, y: h / 4, scale: [.7, h / 2, .7], color: '#655745' })
        trees.push({ ...p, y: h * .7, scale: [3 + i % 3, h, 3 + i % 3], color: [visual.ground, '#456c44', '#536d43'][i % 3] })
      }
    }
    for (let row = 0; row < 5; row++) for (let col = 0; col < 75; col++) for (let stand = 0; stand < 4; stand++) {
      const p = pose(c, 65 + stand * 65), side = c.width / 2 + 20 + row * 1.8, along = (col - 37) * .65
      crowds.push({ x: p.x + Math.cos(p.heading) * side + Math.sin(p.heading) * along, z: p.z - Math.sin(p.heading) * side + Math.cos(p.heading) * along, y: 2 + row * .85, heading: p.heading, scale: [.4, .85, .4], color: ['#dc4940', '#ead8b4', '#e3e6e8', '#2c3c57', '#e6b84b'][col % 5] })
    }
    return { barriers, trees, trunks, buildings, windows, crowds }
  }, [c, urban, desert, visual, night])
  const bounds = useMemo(() => ({ x: Math.max(...c.samples.map(p => p.x)), z: c.samples[0].z }), [c])
  const brakingBoards = useMemo(() => {
    const boards: { x: number; z: number; heading: number; text: string }[] = []
    for (let distance = 200; distance < c.length; distance += 60) {
      const a = pose(c, distance), b = pose(c, distance + 60)
      const bend = Math.abs(Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading)))
      if (bend < .65) continue
      for (const offset of [150, 100, 50]) boards.push({ ...pose(c, distance + 60 - offset, -c.width/2-11), text: String(offset) })
      distance += 240
    }
    return boards
  }, [c])
  const start = pose(c, 0)
  return <>
    {night||twilight?<color attach="background" args={[visual.sky]}/>:<Sky distance={450000} sunPosition={desert ? [120, 40, 90] : [80, 100, 40]} turbidity={weather==='heavy-rain'?10:weather==='rain'?8:weather==='cloudy'?6:desert?7:3} rayleigh={weather==='clear'?.6:.35} />}
    <fog attach="fog" args={[night||twilight?visual.fog:weather==='heavy-rain'?'#82949d':weather==='rain'?'#99aab2':visual.fog,weather==='heavy-rain'?100:night||twilight?95:250,weather==='heavy-rain'?850:night||twilight?1150:1500]} />
    <hemisphereLight args={[night?'#435b79':twilight?'#a0b2ce':'#e0efff', desert ? '#8b785d' : visual.ground, night?.38:twilight?.75:weather==='heavy-rain'?1.1:weather==='rain'?1.4:2]} />
    <directionalLight position={[80, 100, 40]} intensity={night?.16:twilight?.55:weather==='heavy-rain'?.95:weather==='rain'?1.35:weather==='cloudy'?1.8:2.5} color={night?'#8197b8':twilight?'#e4a276':desert&&weather==='clear'?'#ffdfae':'#fff6e4'} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.05, 0]} receiveShadow><planeGeometry args={[14000, 14000]} /><meshStandardMaterial color={night?new THREE.Color(visual.ground).multiplyScalar(.28):twilight?new THREE.Color(visual.ground).multiplyScalar(.62):visual.ground} roughness={1} /></mesh>
    <TrackSurface c={c} visual={visual} wetness={wetness} />
    {(night||twilight)&&<Floodlights c={c} color={twilight?'#d7b9ff':'#d9f0ff'}/>}
    <PitLane c={c}/>
    <Instances items={scenery.barriers} /><Instances items={scenery.trunks} /><Instances items={scenery.trees} shape="cone" /><Instances items={scenery.buildings} /><Instances items={scenery.windows} glow={night||twilight}/><Instances items={scenery.crowds} />
    {[0, 1, 2, 3].map(i => { const p = pose(c, 65 + i * 65); return <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.heading, 0]}>
      {[0, 1, 2, 3, 4].map(row => <Block key={row} position={[c.width / 2 + 20 + row * 1.8, .5 + row * .45, 0]} size={[1.8, 1 + row * .9, 51]} color="#969f9f" />)}
      <Block position={[c.width / 2 + 24, 8.5, 0]} size={[14, .4, 55]} color="#d8dedb" />
      {[-24, 24].map(z => <Block key={z} position={[c.width / 2 + 30, 4, z]} size={[.4, 8, .4]} color="#59676d" />)}
      <Block position={[-c.width / 2 - 17, 3, 0]} size={[11, 6, 52]} color="#dddcd4" />
      <Block position={[-c.width / 2 - 11.4, 4.5, 0]} size={[.15, 1.4, 48]} color="#516c7a" />
      {[-20, -10, 0, 10, 20].map(z => <Block key={z} position={[-c.width / 2 - 11.4, 1.2, z]} size={[.2, 2.4, 7]} color="#313a3c" />)}
    </group> })}
    <group position={[start.x, 0, start.z]} rotation={[0, start.heading, 0]}>
      {[-1, 1].map(side => <Block key={side} position={[side * (c.width / 2 + 1.4), 4.5, 0]} size={[.5, 9, .5]} color="#667477" />)}
      <group position={[0, 8, 0]}><Sign text={venue.name.toUpperCase()} width={c.width + 3} /></group>
      {Array.from({ length: 24 }, (_, i) => <Block key={i} position={[-c.width / 2 + (i % 12 + .5) * c.width / 12, .06, Math.floor(i / 12) * .8]} size={[c.width / 12, .03, .8]} color={(i + Math.floor(i / 12)) % 2 ? '#ecece7' : '#191d1f'} />)}
    </group>
    {brakingBoards.map((p,i) => <group key={i} position={[p.x, 1.5, p.z]} rotation={[0, p.heading, 0]}><Sign text={p.text} width={2} /></group>)}
    {venue.environment === 'harbour' && <group position={[bounds.x + 125, 0, bounds.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[220, 850]} /><meshStandardMaterial color="#408a9a" roughness={.2} metalness={.45} /></mesh>
      <Block position={[-105, .35, 0]} size={[5, .7, 850]} color="#c3b8a1" />
      {Array.from({ length: 12 }, (_, i) => <group key={i} position={[-65 + i % 3 * 32, .8, -210 + Math.floor(i / 3) * 110]} rotation={[0, .3, 0]}><Block position={[0, 0, 0]} size={[9, 2, 28]} color="#e8e7df" /><Block position={[0, 2, -3]} size={[6, 2, 14]} color="#faf9ed" /><Block position={[0, 3.2, -2]} size={[5, .5, 10]} color="#476776" /></group>)}
    </group>}
  </>
}

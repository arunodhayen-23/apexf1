'use client'

import { Sky } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { pose, tracks, type Circuit } from '@/lib/racing'

type Placement = { x: number; y: number; z: number; heading?: number; scale: [number, number, number]; color: string }
function Instances({ items, shape = 'box' }: { items: Placement[]; shape?: 'box' | 'cone' }) {
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
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>{shape === 'cone' ? <coneGeometry args={[1, 1, 7]} /> : <boxGeometry />}<meshStandardMaterial roughness={.92} /></instancedMesh>
}
function Block({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={position} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.8} /></mesh>
}
function TrackSurface({ c, desert }: { c: Circuit; desert: boolean }) {
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
      [-half - 7, -half - 1, desert ? '#bba487' : '#65908a'],
      [-half - 1, -half - .22, 'curb'], [-half - .22, -half, '#eeeeea'],
      [-half, half, 'road'], [half, half + .22, '#eeeeea'],
      [half + .22, half + 1, 'curb'], [half + 1, half + 7, desert ? '#bba487' : '#65908a'],
    ] as const
    bands.forEach(([left, right, color]) => {
      const base = positions.length / 3
      for (let i = 0; i <= count; i++) {
        const distance = i / count * c.length, p = pose(c, distance)
        for (const lane of [left, right]) {
          positions.push(p.x + Math.cos(p.heading) * lane, .035, p.z - Math.sin(p.heading) * lane)
          uv.push(lane / 5, distance / 5)
          const col = new THREE.Color(color === 'curb' ? (Math.floor(distance / 3) % 2 ? '#ffffff' : '#ec3e37') : color === 'road' ? '#ffffff' : color)
          colors.push(col.r, col.g, col.b)
        }
        if (i < count) { const a = base + i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
      }
    })
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals()
    const stripSize = count * 6
    bands.forEach((band, i) => g.addGroup(i * stripSize, stripSize, band[2] === 'road' ? 0 : 1))
    return g
  }, [c, desert])
  useEffect(() => () => { texture.dispose() }, [texture])
  useEffect(() => () => { geometry.dispose() }, [geometry])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial attach="material-0" map={texture} vertexColors roughness={.96} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /><meshStandardMaterial attach="material-1" vertexColors roughness={.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /></mesh>
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
export default function CircuitWorld({ c, track }: { c: Circuit; track: number }) {
  const venue = tracks[track], desert = venue.environment === 'desert', urban = venue.environment === 'harbour' || venue.environment === 'city'
  const scenery = useMemo(() => {
    const barriers: Placement[] = [], trees: Placement[] = [], trunks: Placement[] = [], buildings: Placement[] = [], windows: Placement[] = [], crowds: Placement[] = []
    const count = Math.ceil(c.length / 7)
    for (let i = 0; i < count; i++) for (const side of [-1, 1]) {
      const p = pose(c, i / count * c.length, side * (c.width / 2 + (urban ? 2 : 9)))
      barriers.push({ ...p, y: .65, scale: [.45, 1.3, c.length / count + .15], color: i % 10 < 5 ? '#dcded9' : '#234f43' })
      if (i % 2 === 0) barriers.push({ ...p, y: 2.1, scale: [.09, 3, .09], color: '#777f80' })
      for (const y of [1.5, 2.2, 2.9]) barriers.push({ ...p, y, scale: [.045, .035, c.length / count + .15], color: '#939b99' })
    }
    const scenicSamples=c.samples.filter((_,index)=>index%16===0)
    for (let i = 0; i < (urban ? 100 : 420); i++) {
      const p = pose(c, i / (urban ? 100 : 420) * c.length, (i % 2 ? 1 : -1) * (30 + (i * 17 % 95)))
      if (scenicSamples.some(s => Math.hypot(s.x - p.x, s.z - p.z) < 23)) continue
      if (urban) {
        const height = 9 + i % 7 * 4
        buildings.push({ ...p, y: height / 2, scale: [15, height, 18], color: ['#d3c5b1', '#e3d7c3', '#babec0'][i % 3] })
        for (let floor = 3; floor < height; floor += 3.5) {
          const nx = Math.cos(p.heading), nz = -Math.sin(p.heading)
          for (const side of [-1, 1]) {
            windows.push({ ...p, x: p.x + nx * 7.55 * side, z: p.z + nz * 7.55 * side, y: floor, scale: [.1, 1.6, 14], color: '#546c78' })
            windows.push({ ...p, x: p.x + Math.sin(p.heading) * 9.05 * side, z: p.z + Math.cos(p.heading) * 9.05 * side, y: floor, scale: [12, 1.6, .1], color: '#546c78' })
          }
        }
      } else if (!desert) {
        const h = 8 + i % 9
        trunks.push({ ...p, y: h / 4, scale: [.7, h / 2, .7], color: '#655745' })
        trees.push({ ...p, y: h * .7, scale: [3 + i % 3, h, 3 + i % 3], color: ['#355841', '#456c44', '#536d43'][i % 3] })
      }
    }
    for (let row = 0; row < 5; row++) for (let col = 0; col < 75; col++) for (let stand = 0; stand < 4; stand++) {
      const p = pose(c, 65 + stand * 65), side = c.width / 2 + 20 + row * 1.8, along = (col - 37) * .65
      crowds.push({ x: p.x + Math.cos(p.heading) * side + Math.sin(p.heading) * along, z: p.z - Math.sin(p.heading) * side + Math.cos(p.heading) * along, y: 2 + row * .85, heading: p.heading, scale: [.4, .85, .4], color: ['#dc4940', '#ead8b4', '#e3e6e8', '#2c3c57', '#e6b84b'][col % 5] })
    }
    return { barriers, trees, trunks, buildings, windows, crowds }
  }, [c, urban, desert])
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
    <Sky distance={450000} sunPosition={desert ? [120, 40, 90] : [80, 100, 40]} turbidity={desert ? 7 : 3} rayleigh={.6} />
    <fog attach="fog" args={[desert ? '#d8c8b3' : '#bbcdd2', 250, 1500]} />
    <hemisphereLight args={['#e0efff', desert ? '#b89e75' : '#657259', 2]} />
    <directionalLight position={[80, 100, 40]} intensity={2.5} color={desert ? '#ffdfae' : '#fff6e4'} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.05, 0]} receiveShadow><planeGeometry args={[14000, 14000]} /><meshStandardMaterial color={desert ? '#baa382' : urban ? '#aaa897' : '#6d8050'} roughness={1} /></mesh>
    <TrackSurface c={c} desert={desert} />
    <PitLane c={c}/>
    <Instances items={scenery.barriers} /><Instances items={scenery.trunks} /><Instances items={scenery.trees} shape="cone" /><Instances items={scenery.buildings} /><Instances items={scenery.windows} /><Instances items={scenery.crowds} />
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
    {desert && <group position={[...([pose(c, 300, -65).x, 0, pose(c, 300, -65).z] as [number, number, number])]}>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[0, 4 + i * 5, 0]}><cylinderGeometry args={[13 + i, 14 + i, 3.5, 32]} /><meshStandardMaterial color={i % 2 ? '#dfd5c2' : '#65808b'} /></mesh>)}
    </group>}
  </>
}

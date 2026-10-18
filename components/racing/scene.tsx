'use client'

import { memo, useEffect, useMemo, useRef } from 'react'
import { circuitVisual } from '@/lib/circuit-visuals'
import { drsZonesForTrack, pose, step, teams, tracks, type Circuit, type Race, type Setup } from '@/lib/racing'

type SceneProps = {
  team?: number
  number?: number
  race?: Race
  c?: Circuit
  setup?: Setup
  keys?: Set<string>
  onUpdate?: () => void
}

type Scenery = {
  x: number
  z: number
  heading: number
  kind: 'tree' | 'building' | 'dune' | 'water' | 'stand'
  size: number
  depth: number
  color: string
  accent: string
}

const rainDrops = Array.from({ length: 125 }, (_, i) => ({
  x: ((i * 127.1) % 997) / 997,
  y: ((i * 311.7) % 991) / 991,
  length: 7 + (i * 13 % 13),
}))

function makeScenery(c: Circuit, trackId: number, visual: ReturnType<typeof circuitVisual>): Scenery[] {
  const terrain = visual.terrain
  const items: Scenery[] = []
  const seed = trackId * 37 + 19
  const count = Math.ceil(c.length / 62)

  for (let i = 0; i < count; i++) {
    const distance = (i + .37) / count * c.length
    for (const side of [-1, 1] as const) {
      const sample = pose(c, distance, side * (c.width / 2 + 18 + ((i * 29 + seed) % 55)))
      const choice = (i * 17 + trackId * 11 + (side > 0 ? 7 : 0)) % 10
      let kind: Scenery['kind']

      if (terrain === 'city') kind = choice < 7 ? 'building' : 'stand'
      else if (terrain === 'stadium') kind = choice < 6 ? 'stand' : 'tree'
      else if (terrain === 'desert' || terrain === 'dunes') kind = 'dune'
      else if (terrain === 'coast' || terrain === 'lake') kind = choice < 3 ? 'water' : choice < 7 ? 'tree' : 'building'
      else kind = choice < 8 ? 'tree' : 'stand'

      // Leave gaps between coastal water cutouts so the course still reads as
      // a proper circuit map instead of a repeated pattern.
      if (kind === 'water' && choice > 1) continue

      const size = kind === 'building' ? 12 + (i * 13 % 23) : kind === 'stand' ? 18 + (i * 7 % 16) : 6 + (i * 11 % 10)
      const depth = kind === 'building' ? 12 + (i * 19 % 24) : kind === 'stand' ? 8 + (i * 5 % 8) : 7 + (i * 3 % 8)
      const buildingColors = visual.daypart === 'night'
        ? ['#26313a', '#303942', '#3b4145', '#202c36']
        : ['#b9b4a8', '#8d9693', '#c2b9a8', '#777f7c']
      items.push({
        x: sample.x, z: sample.z, heading: sample.heading, kind, size, depth,
        color: kind === 'building' ? buildingColors[(i + trackId) % buildingColors.length]
          : kind === 'water' ? '#397887'
            : kind === 'dune' ? (i % 2 ? '#a58b68' : '#927b5d')
              : kind === 'stand' ? (visual.daypart === 'night' ? '#313747' : '#777c79')
                : (i % 3 ? '#263d31' : '#344b38'),
        accent: kind === 'building' && visual.daypart !== 'day' ? ['#e5bf78', '#9dc8d5', '#dd936c'][i % 3]
          : kind === 'tree' ? (i % 2 ? '#607a4c' : '#728552')
            : kind === 'stand' ? visual.accent : visual.sky,
      })
    }
  }
  return items
}

type ScreenPoint = { x: number; y: number; depth: number }
type Projector = (x: number, z: number) => ScreenPoint | null

function projectPoint(x: number, z: number, cameraX: number, cameraZ: number, heading: number, focal: number, cameraHeight: number, horizon: number, width: number): ScreenPoint | null {
  const dx = x - cameraX, dz = z - cameraZ
  const depth = dx * Math.sin(heading) + dz * Math.cos(heading)
  if (depth <= 2) return null
  const lateral = dx * Math.cos(heading) - dz * Math.sin(heading)
  return { x: width / 2 + lateral * focal / depth, y: horizon + cameraHeight * focal / depth, depth }
}

function ribbon(ctx: CanvasRenderingContext2D, project: Projector, c: Circuit, from: number, to: number, halfWidth: number, color: string) {
  const aL = pose(c, from, -halfWidth), aR = pose(c, from, halfWidth)
  const bL = pose(c, to, -halfWidth), bR = pose(c, to, halfWidth)
  const p1 = project(aL.x, aL.z), p2 = project(aR.x, aR.z), p3 = project(bR.x, bR.z), p4 = project(bL.x, bL.z)
  if (!p1 || !p2 || !p3 || !p4) return
  ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill()
}

function ribbonBand(ctx: CanvasRenderingContext2D, project: Projector, c: Circuit, from: number, to: number, offsetA: number, offsetB: number, color: string) {
  const a = pose(c, from, offsetA), b = pose(c, from, offsetB)
  const c1 = pose(c, to, offsetB), d = pose(c, to, offsetA)
  const p1 = project(a.x, a.z), p2 = project(b.x, b.z), p3 = project(c1.x, c1.z), p4 = project(d.x, d.z)
  if (!p1 || !p2 || !p3 || !p4) return
  ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill()
}

function drawProjectedScenery(ctx: CanvasRenderingContext2D, items: Scenery[], project: Projector, night: boolean, width: number, height: number) {
  const visible = items.map(item => ({ item, point: project(item.x, item.z) }))
    .filter((entry): entry is { item: Scenery; point: ScreenPoint } => !!entry.point && entry.point.depth > 15 && entry.point.depth < 340 && entry.point.x > -width * .35 && entry.point.x < width * 1.35)
    .sort((a, b) => b.point.depth - a.point.depth)
  for (const { item, point } of visible) {
    const scale = Math.min(22, 720 / point.depth)
    const w = Math.max(2, item.size * scale), h = Math.max(2, item.depth * scale * .55)
    ctx.save()
    if (item.kind === 'tree') {
      const r = Math.max(2, w * .42)
      ctx.fillStyle = '#10191288'; ctx.beginPath(); ctx.ellipse(point.x + r * .15, point.y + r * .25, r * 1.1, r * .63, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = item.color; ctx.beginPath(); ctx.ellipse(point.x, point.y, r, r * .7, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = item.accent; ctx.globalAlpha = .7; ctx.beginPath(); ctx.ellipse(point.x - r * .2, point.y - r * .12, r * .56, r * .4, 0, 0, Math.PI * 2); ctx.fill()
    } else if (item.kind === 'water' || item.kind === 'dune') {
      ctx.globalAlpha = item.kind === 'water' ? .8 : .65; ctx.fillStyle = item.color
      ctx.beginPath(); ctx.ellipse(point.x, point.y, w * .65, h * .62, 0, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = .35; ctx.strokeStyle = item.accent; ctx.lineWidth = Math.max(1, scale * .65)
      ctx.beginPath(); ctx.ellipse(point.x, point.y, w * .43, h * .38, 0, .15, Math.PI * 1.7); ctx.stroke()
    } else {
      ctx.fillStyle = '#11182066'; ctx.fillRect(point.x - w / 2 + 2, point.y - h / 2 + 3, w, h)
      ctx.fillStyle = item.color; ctx.fillRect(point.x - w / 2, point.y - h / 2, w, h)
      ctx.strokeStyle = '#ffffff24'; ctx.lineWidth = Math.max(1, scale * .6); ctx.strokeRect(point.x - w / 2, point.y - h / 2, w, h)
      if (item.kind === 'stand') {
        ctx.fillStyle = item.accent; ctx.globalAlpha = .7
        for (let row = 0; row < 3; row++) ctx.fillRect(point.x - w / 2 + 2, point.y - h / 2 + 2 + row * Math.max(2, h * .13), w - 4, Math.max(1, h * .07))
      } else {
        ctx.fillStyle = item.accent; ctx.globalAlpha = night ? .8 : .22
        ctx.fillRect(point.x - w * .31, point.y - h * .28, Math.max(2, w * .16), Math.max(1, h * .13))
        ctx.fillRect(point.x + w * .08, point.y + h * .12, Math.max(2, w * .2), Math.max(1, h * .1))
      }
    }
    ctx.restore()
  }
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, scale: number, color: string, accent: string, number: number, player: boolean, tyreColor = '#202327') {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(scale, scale)
  if (player) { ctx.shadowColor = accent; ctx.shadowBlur = 15 }
  ctx.fillStyle = '#0b0e12'; ctx.beginPath(); ctx.ellipse(0, .25, 1.43, 2.9, 0, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
  // Four distinct tyres, visible in the overhead view.
  ctx.fillStyle = tyreColor
  for (const xSide of [-1, 1]) for (const yAxle of [-1.55, 1.55]) {
    ctx.beginPath(); ctx.roundRect(xSide * .98 - .24, yAxle - .48, .49, .96, .14); ctx.fill()
    ctx.fillStyle = '#778087'; ctx.globalAlpha = .45
    ctx.fillRect(xSide * .98 - .12, yAxle - .34, .23, .68)
    ctx.globalAlpha = 1; ctx.fillStyle = tyreColor
  }
  // Floor, front wing, sidepods and tapered nose.
  ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(-.42, -2.65); ctx.lineTo(.42, -2.65); ctx.lineTo(.55, -1.62); ctx.lineTo(.82, -1.22); ctx.lineTo(.82, .72); ctx.lineTo(1.02, 1.02); ctx.lineTo(1.28, 1.08); ctx.lineTo(1.28, 1.3); ctx.lineTo(-1.28, 1.3); ctx.lineTo(-1.28, 1.08); ctx.lineTo(-1.02, 1.02); ctx.lineTo(-.82, .72); ctx.lineTo(-.82, -1.22); ctx.lineTo(-.55, -1.62); ctx.closePath(); ctx.fill()
  ctx.fillStyle = accent
  ctx.beginPath(); ctx.moveTo(-.3, -2.55); ctx.lineTo(.3, -2.55); ctx.lineTo(.2, -.72); ctx.lineTo(-.2, -.72); ctx.closePath(); ctx.fill()
  // Cockpit and protective halo.
  ctx.fillStyle = '#10171c'; ctx.beginPath(); ctx.ellipse(0, -.12, .34, .68, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#d3d9dc'; ctx.lineWidth = .075; ctx.beginPath(); ctx.ellipse(0, -.13, .48, .8, 0, Math.PI, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#eef1ed'; ctx.font = 'bold .54px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(number), 0, .63)
  ctx.fillStyle = '#1a1e23'; ctx.fillRect(-1.35, 1.18, 2.7, .16)
  ctx.fillRect(-1.35, -2.5, 2.7, .16)
  ctx.restore()
}

function Scene({ team = 0, number = 1, race, c, setup, keys, onUpdate }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scenery = useMemo(() => race && c && setup ? makeScenery(c, setup.track, circuitVisual(tracks[setup.track].name)) : [], [race, c, setup])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return
    let frame = 0
    let previous = 0
    let accumulator = 0
    let lastHud = 0
    let width = 0
    let height = 0
    let ratio = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width); height = Math.max(1, rect.height)
      ratio = Math.min(1.6, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    if (!race || !c || !setup || !keys || !onUpdate) {
      const visual = circuitVisual(tracks[0].name)
      const bg = ctx.createRadialGradient(width * .53, height * .58, 2, width * .53, height * .58, Math.max(width, height) * .7)
      bg.addColorStop(0, '#263040'); bg.addColorStop(.54, '#171c23'); bg.addColorStop(1, '#111419')
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = `${visual.accent}30`; ctx.lineWidth = 1
      for (let y = 20; y < height; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
      drawCar(ctx, width * .5, height * .55, -.22, Math.min(width, height) / 11, teams[team].color, teams[team].accent, number, true)
      return () => observer.disconnect()
    }

    const visual = circuitVisual(tracks[setup.track].name)
    const night = visual.daypart === 'night'
    const draw = (timestamp: number) => {
      if (!previous) previous = timestamp
      const delta = Math.min(.05, Math.max(0, (timestamp - previous) / 1000))
      previous = timestamp
      accumulator += delta
      while (accumulator >= 1 / 60) { step(race, c, setup, keys, 1 / 60); accumulator -= 1 / 60 }

      const player = race.cars[0]
      const cameraDistance = 27
      const horizon = height * .28
      const playerY = height * .76
      const focal = height * (race.camera ? .72 : .88)
      const cameraHeight = (playerY - horizon) * cameraDistance / focal
      const routePose = pose(c, player.progress)
      const headingError = Math.atan2(Math.sin(player.heading - routePose.heading), Math.cos(player.heading - routePose.heading))
      // Keep the chase camera aligned to the circuit's forward direction. A
      // small allowance follows steering, while avoiding spins/off-track
      // headings that can turn the road out of view.
      const cameraHeading = routePose.heading + Math.max(-.32, Math.min(.32, headingError))
      const cameraX = routePose.x - Math.sin(cameraHeading) * cameraDistance
      const cameraZ = routePose.z - Math.cos(cameraHeading) * cameraDistance
      const project: Projector = (x, z) => projectPoint(x, z, cameraX, cameraZ, cameraHeading, focal, cameraHeight, horizon, width)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const sky = ctx.createLinearGradient(0, 0, 0, horizon * 1.5)
      sky.addColorStop(0, visual.sky); sky.addColorStop(1, visual.ground)
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height)
      const ground = ctx.createLinearGradient(0, horizon, 0, height)
      ground.addColorStop(0, visual.ground); ground.addColorStop(1, night ? '#10151a' : '#18221c')
      ctx.fillStyle = ground; ctx.fillRect(0, horizon, width, height - horizon)
      const haze = ctx.createLinearGradient(0, horizon - 22, 0, horizon + 55)
      haze.addColorStop(0, `${visual.sky}00`); haze.addColorStop(.52, `${visual.sky}70`); haze.addColorStop(1, `${visual.ground}00`)
      ctx.fillStyle = haze; ctx.fillRect(0, horizon - 22, width, 80)

      // Follow behind the car and rotate the flat GPS ribbon into the direction
      // of travel. The familiar chase view uses perspective projection only;
      // the track itself remains a flat 2D drawing.
      drawProjectedScenery(ctx, scenery, project, night, width, height)
      const segment = 3.2
      const drsZones = drsZonesForTrack(setup.track)
      for (let distance = 355; distance > -16; distance -= segment) {
        const next = Math.min(355, distance + segment)
        const midpoint = ((player.progress + distance + segment / 2) / c.length % 1 + 1) % 1
        ribbon(ctx, project, c, distance, next, c.width / 2 + 10, '#171b1b')
        ribbon(ctx, project, c, distance, next, c.width / 2 + 5, visual.runoff)
        ribbon(ctx, project, c, distance, next, c.width / 2, night ? '#303538' : '#3b3f3d')
        const inner = c.width / 2 - 1.65
        const kerbColor = Math.floor(distance / 9) % 2 ? visual.kerbs[0] : visual.kerbs[1]
        ribbonBand(ctx, project, c, distance, next, inner, c.width / 2, kerbColor)
        ribbonBand(ctx, project, c, distance, next, -c.width / 2, -inner, kerbColor)
        if (Math.abs(Math.round(distance / 18) * 18 - distance) < segment * .55) ribbon(ctx, project, c, distance, next, .12, '#d9d9ce')
        if (drsZones.some(zone => midpoint >= zone.start && midpoint <= zone.end)) ribbon(ctx, project, c, distance, next, .46, '#64d9bd')
        if (race.trackWetness > .08) {
          ctx.globalAlpha = .08 + race.trackWetness * .13
          ribbon(ctx, project, c, distance, next, c.width * .32, '#9dcce0')
          ctx.globalAlpha = 1
        }
      }

      const nearbyCars = race.cars.map((car, index) => ({ car, index, point: project(car.x, car.z) }))
        .filter((entry): entry is { car: typeof player; index: number; point: ScreenPoint } => !!entry.point && !entry.car.finish && entry.point.depth > 4 && entry.point.depth < 380)
        .sort((a, b) => b.point.depth - a.point.depth)
      for (const { car, index, point } of nearbyCars) {
        if (point.y < horizon - 20 || point.y > height + 110 || point.x < -width * .3 || point.x > width * 1.3) continue
        const scale = Math.min(38, focal / point.depth * .72)
        const relativeHeading = Math.atan2(Math.sin(car.heading - cameraHeading), Math.cos(car.heading - cameraHeading))
        drawCar(ctx, point.x, point.y, relativeHeading, scale, car.color, index === 0 ? teams[setup.team].accent : '#f1e9d4', index === 0 ? number : index + 1, index === 0, index === 0 ? ({ soft: '#e94b4d', medium: '#e2bf47', hard: '#d9dfe4' } as const)[car.tyre] : '#21252a')
      }

      if (setup.weather === 'rain' || setup.weather === 'heavy-rain') {
        ctx.strokeStyle = '#d4e5f0'; ctx.lineWidth = .8
        const intensity = setup.weather === 'heavy-rain' ? 1 : .55
        for (let i = 0; i < rainDrops.length * intensity; i++) {
          const drop = rainDrops[i], y = (drop.y * height + timestamp * (setup.weather === 'heavy-rain' ? .42 : .25)) % height
          ctx.globalAlpha = setup.weather === 'heavy-rain' ? .31 : .19
          ctx.beginPath(); ctx.moveTo(drop.x * width, y); ctx.lineTo(drop.x * width - 3, y + drop.length); ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      if (night) {
        const light = ctx.createRadialGradient(width / 2, playerY - 90, 4, width / 2, playerY - 90, Math.max(width, height) * .52)
        light.addColorStop(0, `${visual.accent}1c`); light.addColorStop(.45, `${visual.accent}09`); light.addColorStop(1, '#03081155')
        ctx.fillStyle = light; ctx.fillRect(0, 0, width, height)
      }

      if (timestamp - lastHud > 100) { onUpdate(); lastHud = timestamp }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [race, c, setup, keys, onUpdate, team, number, scenery])

  return <canvas ref={canvasRef} className="race-canvas-2d" aria-label={race ? `${tracks[setup?.track ?? 0].name} behind-the-car race view` : 'Racing car preview'} />
}

export default memo(Scene)

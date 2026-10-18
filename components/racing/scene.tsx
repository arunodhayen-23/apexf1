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

function traceCircuit(ctx: CanvasRenderingContext2D, c: Circuit) {
  ctx.beginPath()
  c.samples.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.z) : ctx.lineTo(p.x, p.z))
  ctx.closePath()
}

function traceEdge(ctx: CanvasRenderingContext2D, c: Circuit, side: number, offset: number) {
  ctx.beginPath()
  const count = c.samples.length
  c.samples.forEach((sample, i) => {
    const prev = c.samples[(i + count - 1) % count], next = c.samples[(i + 1) % count]
    const heading = Math.atan2(next.x - prev.x, next.z - prev.z)
    const x = sample.x + Math.cos(heading) * side * offset
    const z = sample.z - Math.sin(heading) * side * offset
    if (i === 0) ctx.moveTo(x, z)
    else ctx.lineTo(x, z)
  })
  ctx.closePath()
}

function drawScenery(ctx: CanvasRenderingContext2D, items: Scenery[], night: boolean) {
  for (const item of items) {
    ctx.save()
    ctx.translate(item.x, item.z)
    ctx.rotate(-item.heading)
    if (item.kind === 'tree') {
      const r = item.size * .46
      ctx.fillStyle = '#13261c88'
      ctx.beginPath(); ctx.ellipse(1.4, 2, r * 1.15, r * .94, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = item.color
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = item.accent
      ctx.globalAlpha = .72
      ctx.beginPath(); ctx.arc(-r * .27, -r * .22, r * .57, 0, Math.PI * 2); ctx.fill()
    } else if (item.kind === 'building') {
      ctx.fillStyle = '#11182066'
      ctx.fillRect(-item.size / 2 + 2, -item.depth / 2 + 3, item.size, item.depth)
      ctx.fillStyle = item.color
      ctx.fillRect(-item.size / 2, -item.depth / 2, item.size, item.depth)
      ctx.strokeStyle = '#ffffff24'; ctx.lineWidth = .65
      ctx.strokeRect(-item.size / 2, -item.depth / 2, item.size, item.depth)
      ctx.fillStyle = item.accent; ctx.globalAlpha = night ? .78 : .2
      ctx.fillRect(-item.size * .31, -item.depth * .3, item.size * .17, item.depth * .12)
      ctx.fillRect(item.size * .08, item.depth * .15, item.size * .2, item.depth * .1)
      ctx.fillStyle = '#10161c88'; ctx.globalAlpha = 1
      ctx.fillRect(-item.size * .38, -item.depth * .08, item.size * .76, .7)
    } else if (item.kind === 'stand') {
      ctx.fillStyle = '#1118205e'
      ctx.fillRect(-item.size / 2 + 2, -item.depth / 2 + 3, item.size, item.depth)
      ctx.fillStyle = item.color
      ctx.fillRect(-item.size / 2, -item.depth / 2, item.size, item.depth)
      for (let row = 0; row < 3; row++) {
        ctx.fillStyle = row % 2 ? '#d7d1bd' : item.accent
        ctx.globalAlpha = .7
        ctx.fillRect(-item.size / 2 + 2, -item.depth / 2 + 2 + row * 2.1, item.size - 4, 1.2)
      }
      ctx.globalAlpha = 1
    } else if (item.kind === 'dune') {
      ctx.fillStyle = item.color; ctx.globalAlpha = .68
      ctx.beginPath(); ctx.ellipse(0, 0, item.size * .9, item.depth * .85, .08, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = item.accent; ctx.globalAlpha = .45; ctx.lineWidth = .65
      ctx.beginPath(); ctx.ellipse(0, 0, item.size * .58, item.depth * .55, .08, .15, Math.PI * 1.65); ctx.stroke()
    } else {
      ctx.fillStyle = item.color; ctx.globalAlpha = .8
      ctx.beginPath(); ctx.ellipse(0, 0, item.size * 1.25, item.depth * .8, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = item.accent; ctx.globalAlpha = .25; ctx.lineWidth = .8
      ctx.beginPath(); ctx.ellipse(0, 0, item.size * .8, item.depth * .51, 0, 0, Math.PI * 2); ctx.stroke()
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
      const pxPerMeter = race.camera ? 2.9 : 3.8
      const playerY = height * .67
      const cs = Math.cos(player.heading), sn = Math.sin(player.heading)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const ground = ctx.createLinearGradient(0, 0, 0, height)
      ground.addColorStop(0, visual.sky); ground.addColorStop(.42, visual.ground); ground.addColorStop(1, visual.ground)
      ctx.fillStyle = ground; ctx.fillRect(0, 0, width, height)
      const haze = ctx.createRadialGradient(width * .5, height * .57, 5, width * .5, height * .57, Math.max(width, height) * .78)
      haze.addColorStop(0, night ? '#13202c12' : '#f8f0d018'); haze.addColorStop(1, night ? '#03081360' : '#17241d35')
      ctx.fillStyle = haze; ctx.fillRect(0, 0, width, height)

      const a = cs * pxPerMeter, b = -sn * pxPerMeter, cc = -sn * pxPerMeter, d = -cs * pxPerMeter
      const e = width / 2 - (player.x * cs - player.z * sn) * pxPerMeter
      const f = playerY + (player.x * sn + player.z * cs) * pxPerMeter
      ctx.setTransform(ratio * a, ratio * b, ratio * cc, ratio * d, ratio * e, ratio * f)
      drawScenery(ctx, scenery, night)
      // The 2D ribbon follows the GPS-derived centerline of the selected venue.
      traceCircuit(ctx, c)
      if (night) { ctx.save(); ctx.shadowColor = visual.accent; ctx.shadowBlur = 18; ctx.strokeStyle = `${visual.accent}65`; ctx.lineWidth = c.width + 20; ctx.stroke(); ctx.restore() }
      ctx.strokeStyle = '#101519'; ctx.lineWidth = c.width + 14; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
      ctx.strokeStyle = visual.runoff; ctx.lineWidth = c.width + 8; ctx.stroke()
      for (const side of [-1, 1]) {
        traceEdge(ctx, c, side, c.width / 2 + 1.1)
        ctx.strokeStyle = '#ded8c8'; ctx.lineWidth = 2.4; ctx.setLineDash([4, 4]); ctx.stroke()
      }
      ctx.setLineDash([])
      const barrierDistance = c.width / 2 + (tracks[setup.track].environment === 'city' || tracks[setup.track].environment === 'harbour' ? 6 : 11)
      for (const side of [-1, 1]) {
        traceEdge(ctx, c, side, barrierDistance)
        ctx.strokeStyle = '#15191d'; ctx.lineWidth = 2.5; ctx.stroke()
        traceEdge(ctx, c, side, barrierDistance)
        ctx.strokeStyle = visual.kerbs[1]; ctx.globalAlpha = .76; ctx.lineWidth = .9; ctx.setLineDash([3.5, 3.5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
      }
      ctx.beginPath(); c.samples.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.z) : ctx.lineTo(p.x, p.z)); ctx.closePath()
      ctx.strokeStyle = night ? '#69737a' : '#4c5254'; ctx.lineWidth = c.width; ctx.stroke()
      for (const side of [-1, 1]) {
        traceEdge(ctx, c, side, c.width / 2 - 1)
        ctx.strokeStyle = visual.kerbs[0]; ctx.lineWidth = 1.55; ctx.setLineDash([4, 4]); ctx.stroke()
        traceEdge(ctx, c, side, c.width / 2 - 1)
        ctx.lineDashOffset = -4; ctx.strokeStyle = visual.kerbs[1]; ctx.stroke(); ctx.lineDashOffset = 0
      }
      ctx.setLineDash([])
      const pit = (distance: number) => pose(c, distance, -(c.width / 2 + 4.2))
      ctx.beginPath()
      for (let i = 0; i <= 90; i++) { const p = pit(c.length * (.91 + i / 90 * .09)); if (!i) ctx.moveTo(p.x, p.z); else ctx.lineTo(p.x, p.z) }
      for (let i = 0; i <= 45; i++) { const p = pit(c.length * (i / 45 * .09)); ctx.lineTo(p.x, p.z) }
      ctx.strokeStyle = '#242b30'; ctx.lineWidth = 5.4; ctx.lineCap = 'round'; ctx.stroke()
      ctx.strokeStyle = '#b6bcba'; ctx.globalAlpha = .55; ctx.lineWidth = .7; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
      for (const zone of drsZonesForTrack(setup.track)) {
        ctx.beginPath()
        const start = Math.floor(zone.start * c.samples.length), end = Math.ceil(zone.end * c.samples.length)
        for (let i = start; i <= end; i++) { const p = c.samples[i % c.samples.length]; if (i === start) ctx.moveTo(p.x, p.z); else ctx.lineTo(p.x, p.z) }
        ctx.strokeStyle = '#64d9bd'; ctx.globalAlpha = .7; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
      }
      const startLeft = pose(c, 0, -c.width / 2), startRight = pose(c, 0, c.width / 2)
      ctx.beginPath(); ctx.moveTo(startLeft.x, startLeft.z); ctx.lineTo(startRight.x, startRight.z)
      ctx.strokeStyle = '#f5f2e8'; ctx.lineWidth = 1.3; ctx.setLineDash([1.8, 1.8]); ctx.stroke(); ctx.setLineDash([])
      if (race.trackWetness > .08) {
        traceCircuit(ctx, c)
        ctx.strokeStyle = `rgba(142,197,218,${.12 + race.trackWetness * .13})`; ctx.lineWidth = c.width * .72; ctx.lineCap = 'round'; ctx.stroke()
      }

      // Cars are drawn as crisp top-down sprites; the original simulation
      // coordinates preserve safe spacing while the player sees the whole lane.
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      for (let i = race.cars.length - 1; i >= 0; i--) {
        const car = race.cars[i]
        if (car.finish) continue
        const dx = car.x - player.x, dz = car.z - player.z
        const x = width / 2 + (dx * cs - dz * sn) * pxPerMeter
        const y = playerY - (dx * sn + dz * cs) * pxPerMeter
        const angle = Math.atan2(Math.sin(car.heading - player.heading), Math.cos(car.heading - player.heading))
        drawCar(ctx, x, y, angle, pxPerMeter * .93, car.color, i === 0 ? teams[setup.team].accent : '#f1e9d4', i === 0 ? number : i + 1, i === 0, i === 0 ? ({ soft: '#e94b4d', medium: '#e2bf47', hard: '#d9dfe4' } as const)[car.tyre] : '#21252a')
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
        const light = ctx.createRadialGradient(width / 2, playerY - 35, 5, width / 2, playerY - 35, Math.max(width, height) * .46)
        light.addColorStop(0, `${visual.accent}0a`); light.addColorStop(1, '#03081144')
        ctx.fillStyle = light; ctx.fillRect(0, 0, width, height)
      }

      if (timestamp - lastHud > 100) { onUpdate(); lastHud = timestamp }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [race, c, setup, keys, onUpdate, team, number, scenery])

  return <canvas ref={canvasRef} className="race-canvas-2d" aria-label={race ? `${tracks[setup?.track ?? 0].name} top-down race view` : 'Top-down race car preview'} />
}

export default memo(Scene)

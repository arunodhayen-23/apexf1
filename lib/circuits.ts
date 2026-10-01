import { geoMercator } from 'd3-geo'
import monaco from './circuits/monaco.json'
import silverstone from './circuits/silverstone.json'
import madrid from './circuits/madrid.json'
import monza from './circuits/monza.json'
import spa from './circuits/spa.json'
import bahrain from './circuits/bahrain.json'
import interlagos from './circuits/interlagos.json'

const datasets = [monaco, silverstone, madrid, monza, spa, bahrain, interlagos]
export const tracks = [
  { name: 'Monaco', country: 'MONTE CARLO, MONACO', kind: 'STREET CIRCUIT', length: '3.337', turns: 19, flag: 'monaco', environment: 'harbour', width: 14 },
  { name: 'Silverstone', country: 'SILVERSTONE, UNITED KINGDOM', kind: 'HIGH-SPEED CIRCUIT', length: '5.891', turns: 18, flag: 'uk', environment: 'park', width: 18 },
  { name: 'MADRING', country: 'MADRID, SPAIN', kind: 'HYBRID CIRCUIT', length: '5.416', turns: 22, flag: 'spain', environment: 'city', width: 18 },
  { name: 'Monza', country: 'MONZA, ITALY', kind: 'TEMPLE OF SPEED', length: '5.793', turns: 11, flag: 'italy', environment: 'forest', width: 17 },
  { name: 'Spa-Francorchamps', country: 'STAVELOT, BELGIUM', kind: 'ARDENNES CLASSIC', length: '7.004', turns: 19, flag: 'belgium', environment: 'forest', width: 17 },
  { name: 'Bahrain', country: 'SAKHIR, BAHRAIN', kind: 'DESERT GRAND PRIX', length: '5.412', turns: 15, flag: 'bahrain', environment: 'desert', width: 19 },
  { name: 'Interlagos', country: 'SÃO PAULO, BRAZIL', kind: 'COUNTERCLOCKWISE CLASSIC', length: '4.309', turns: 15, flag: 'brazil', environment: 'park', width: 17 },
] as const

// MIT circuit outlines: Tomislav Bacinger, github.com/bacinger/f1-circuits.
export function circuitPoints(id: number) {
  const coords = datasets[id].features[0].geometry.coordinates
  const projection = geoMercator().center(coords[0] as [number, number]).translate([0, 0]).scale(6371000 * Math.cos(coords[0][1] * Math.PI / 180))
  const projected = coords.map(p => projection(p as [number, number])!)
  if (Math.hypot(projected[0][0] - projected.at(-1)![0], projected[0][1] - projected.at(-1)![1]) < 1) projected.pop()
  const heading = Math.atan2(projected[1][0], projected[1][1])
  return projected.filter((p, i) => i === 0 || Math.hypot(p[0] - projected[i - 1][0], p[1] - projected[i - 1][1]) > .2).map(([x, z]) => [x * Math.cos(heading) - z * Math.sin(heading), x * Math.sin(heading) + z * Math.cos(heading)])
}

import { geoMercator } from 'd3-geo'
import monaco from './circuits/monaco.json'
import silverstone from './circuits/silverstone.json'
import madrid from './circuits/madrid.json'
import monza from './circuits/monza.json'
import spa from './circuits/spa.json'
import bahrain from './circuits/bahrain.json'
import interlagos from './circuits/interlagos.json'
import singapore from './circuits/sg-2008.json'
import austin from './circuits/us-2012.json'
import shanghai from './circuits/cn-2004.json'
import suzuka from './circuits/jp-1962.json'
import istanbul from './circuits/tr-2005.json'
import jeddah from './circuits/sa-2021.json'
import baku from './circuits/az-2016.json'
import lusail from './circuits/qa-2004.json'
import sepang from './circuits/my-1999.json'
import hungaroring from './circuits/hu-1986.json'
import redBullRing from './circuits/at-1969.json'
import zandvoort from './circuits/nl-1948.json'
import yasMarina from './circuits/ae-2009.json'
import mexicoCity from './circuits/mx-1962.json'
import montreal from './circuits/ca-1978.json'
import hockenheim from './circuits/de-1932.json'
import barcelona from './circuits/es-1991.json'
import miami from './circuits/us-2022.json'
import lasVegas from './circuits/us-2023.json'
import melbourne from './circuits/au-1953.json'

const datasets = [monaco, silverstone, madrid, monza, spa, bahrain, interlagos, singapore, austin, shanghai, suzuka, istanbul, jeddah, baku, lusail, sepang, hungaroring, redBullRing, zandvoort, yasMarina, mexicoCity, montreal, hockenheim, barcelona, miami, lasVegas, melbourne]
export const tracks = [
  { name: 'Monaco', country: 'MONTE CARLO, MONACO', kind: 'STREET CIRCUIT', length: '3.337', turns: 19, flag: 'monaco', environment: 'harbour', width: 14 },
  { name: 'Silverstone', country: 'SILVERSTONE, UNITED KINGDOM', kind: 'HIGH-SPEED CIRCUIT', length: '5.891', turns: 18, flag: 'uk', environment: 'park', width: 18 },
  { name: 'MADRING', country: 'MADRID, SPAIN', kind: 'HYBRID CIRCUIT', length: '5.416', turns: 22, flag: 'spain', environment: 'city', width: 18 },
  { name: 'Monza', country: 'MONZA, ITALY', kind: 'TEMPLE OF SPEED', length: '5.793', turns: 11, flag: 'italy', environment: 'forest', width: 17 },
  { name: 'Spa-Francorchamps', country: 'STAVELOT, BELGIUM', kind: 'ARDENNES CLASSIC', length: '7.004', turns: 19, flag: 'belgium', environment: 'forest', width: 17 },
  { name: 'Bahrain', country: 'SAKHIR, BAHRAIN', kind: 'DESERT GRAND PRIX', length: '5.412', turns: 15, flag: 'bahrain', environment: 'desert', width: 19 },
  { name: 'Interlagos', country: 'SÃO PAULO, BRAZIL', kind: 'COUNTERCLOCKWISE CLASSIC', length: '4.309', turns: 15, flag: 'brazil', environment: 'park', width: 17 },
  { name: 'Singapore', country: 'MARINA BAY, SINGAPORE', kind: 'NIGHT STREET CIRCUIT', length: '4.940', turns: 19, flag: 'singapore', environment: 'harbour', width: 14 },
  { name: 'Circuit of the Americas', country: 'AUSTIN, UNITED STATES', kind: 'GRAND PRIX CIRCUIT', length: '5.513', turns: 20, flag: 'us', environment: 'park', width: 18 },
  { name: 'Shanghai', country: 'SHANGHAI, CHINA', kind: 'GRAND PRIX CIRCUIT', length: '5.451', turns: 16, flag: 'china', environment: 'city', width: 19 },
  { name: 'Suzuka', country: 'SUZUKA, JAPAN', kind: 'FIGURE-EIGHT CIRCUIT', length: '5.807', turns: 18, flag: 'japan', environment: 'forest', width: 17 },
  { name: 'Istanbul Park', country: 'ISTANBUL, TÜRKİYE', kind: 'GRAND PRIX CIRCUIT', length: '5.338', turns: 14, flag: 'turkey', environment: 'park', width: 18 },
  { name: 'Jeddah Corniche', country: 'JEDDAH, SAUDI ARABIA', kind: 'NIGHT STREET CIRCUIT', length: '6.174', turns: 27, flag: 'saudi', environment: 'city', width: 16 },
  { name: 'Baku City Circuit', country: 'BAKU, AZERBAIJAN', kind: 'STREET CIRCUIT', length: '6.003', turns: 20, flag: 'azerbaijan', environment: 'city', width: 14 },
  { name: 'Lusail', country: 'LUSAIL, QATAR', kind: 'DESERT GRAND PRIX', length: '5.419', turns: 16, flag: 'qatar', environment: 'desert', width: 18 },
  { name: 'Sepang', country: 'SEPANG, MALAYSIA', kind: 'GRAND PRIX CIRCUIT', length: '5.543', turns: 15, flag: 'malaysia', environment: 'forest', width: 18 },
  { name: 'Hungaroring', country: 'BUDAPEST, HUNGARY', kind: 'TWISTY GRAND PRIX CIRCUIT', length: '4.381', turns: 14, flag: 'hungary', environment: 'park', width: 17 },
  { name: 'Red Bull Ring', country: 'SPIELBERG, AUSTRIA', kind: 'ALPINE GRAND PRIX CIRCUIT', length: '4.318', turns: 10, flag: 'austria', environment: 'park', width: 18 },
  { name: 'Zandvoort', country: 'ZANDVOORT, NETHERLANDS', kind: 'COASTAL GRAND PRIX CIRCUIT', length: '4.259', turns: 14, flag: 'netherlands', environment: 'park', width: 16 },
  { name: 'Yas Marina', country: 'ABU DHABI, UNITED ARAB EMIRATES', kind: 'TWILIGHT GRAND PRIX CIRCUIT', length: '5.281', turns: 16, flag: 'uae', environment: 'desert', width: 18 },
  { name: 'Mexico City', country: 'MEXICO CITY, MEXICO', kind: 'HIGH-ALTITUDE GRAND PRIX', length: '4.304', turns: 17, flag: 'mexico', environment: 'city', width: 17 },
  { name: 'Circuit Gilles-Villeneuve', country: 'MONTREAL, CANADA', kind: 'ISLAND STREET CIRCUIT', length: '4.361', turns: 14, flag: 'canada', environment: 'park', width: 17 },
  { name: 'Hockenheimring', country: 'HOCKENHEIM, GERMANY', kind: 'GRAND PRIX CIRCUIT', length: '4.574', turns: 17, flag: 'germany', environment: 'forest', width: 18 },
  { name: 'Barcelona-Catalunya', country: 'BARCELONA, SPAIN', kind: 'GRAND PRIX CIRCUIT', length: '4.657', turns: 14, flag: 'spain', environment: 'park', width: 18 },
  { name: 'Miami', country: 'MIAMI GARDENS, UNITED STATES', kind: 'STREET CIRCUIT', length: '5.412', turns: 19, flag: 'us', environment: 'city', width: 17 },
  { name: 'Las Vegas', country: 'LAS VEGAS, UNITED STATES', kind: 'NIGHT STREET CIRCUIT', length: '6.201', turns: 17, flag: 'us', environment: 'city', width: 16 },
  { name: 'Albert Park', country: 'MELBOURNE, AUSTRALIA', kind: 'PARKLAND STREET CIRCUIT', length: '5.278', turns: 14, flag: 'australia', environment: 'park', width: 17 },
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

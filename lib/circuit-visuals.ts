import { tracks } from './circuits'

export type CircuitVisual = {
  daypart: 'day' | 'twilight' | 'night'
  terrain: 'city' | 'coast' | 'desert' | 'forest' | 'park' | 'airfield' | 'mountain' | 'dunes' | 'stadium' | 'tropical' | 'lake'
  ground: string
  runoff: string
  kerbs: [string, string]
  accent: string
  sky: string
  fog: string
  signature: string
}

// Visual treatments are keyed by the circuit name so the drawing stays tied to
// the real GPS-derived layout instead of depending on a fragile array index.
const looks = {
  Monaco: { daypart: 'day', terrain: 'coast', ground: '#53664f', runoff: '#b9b3a0', kerbs: ['#f4f1e8', '#df4548'], accent: '#f04b4a', sky: '#a5c9d5', fog: '#a8b8bd', signature: 'PORT HERCULE · CASINO SQUARE' },
  Silverstone: { daypart: 'day', terrain: 'airfield', ground: '#54764c', runoff: '#89a87a', kerbs: ['#f4f1e8', '#df4548'], accent: '#d94a44', sky: '#98c4d8', fog: '#a9c2cb', signature: 'FORMER RAF AIRFIELD · MAGGOTS / BECKETTS' },
  MADRING: { daypart: 'day', terrain: 'city', ground: '#776e58', runoff: '#d0bda0', kerbs: ['#fff5e7', '#e34d4a'], accent: '#ed514c', sky: '#aac5cd', fog: '#b0b9b8', signature: 'MADRID STREET & PARKLAND LOOP' },
  Monza: { daypart: 'day', terrain: 'forest', ground: '#3c6547', runoff: '#9ca986', kerbs: ['#fff5e7', '#df4548'], accent: '#e24942', sky: '#a3c7d4', fog: '#a8babd', signature: 'ROYAL PARK · TEMPLE OF SPEED' },
  'Spa-Francorchamps': { daypart: 'day', terrain: 'mountain', ground: '#365c44', runoff: '#9aae87', kerbs: ['#fff3e2', '#e34b45'], accent: '#f04b49', sky: '#9dbbc6', fog: '#9baeb0', signature: 'ARDENNES FOREST · EAU ROUGE / RAIDILLON' },
  Bahrain: { daypart: 'night', terrain: 'desert', ground: '#625748', runoff: '#9c8566', kerbs: ['#f4f0e7', '#d54442'], accent: '#ff8b49', sky: '#07111f', fog: '#111c2d', signature: 'SAKHIR DESERT · FLOODLIT NIGHT RACE' },
  Interlagos: { daypart: 'day', terrain: 'park', ground: '#466c4d', runoff: '#a9ac8b', kerbs: ['#f5f0e6', '#dc4647'], accent: '#f0d04e', sky: '#9fc7d0', fog: '#a8b9b9', signature: 'AUTÓDROMO JOSÉ CARLOS PACE · LAKE PARK' },
  Singapore: { daypart: 'night', terrain: 'coast', ground: '#263b38', runoff: '#376969', kerbs: ['#dcecf0', '#e04c68'], accent: '#58d8d0', sky: '#07121f', fog: '#111e2d', signature: 'MARINA BAY · SKYLINE & FLOODLIGHTS' },
  'Circuit of the Americas': { daypart: 'day', terrain: 'mountain', ground: '#708152', runoff: '#c4b9a0', kerbs: ['#f4f0e8', '#e34b45'], accent: '#e4544e', sky: '#90bfd5', fog: '#a6bdc4', signature: 'AUSTIN HILLCLIMB · OBSERVATION TOWER' },
  Shanghai: { daypart: 'day', terrain: 'city', ground: '#778477', runoff: '#b5bcb0', kerbs: ['#f0efe9', '#db4847'], accent: '#df4c49', sky: '#a0c2ce', fog: '#aebfc1', signature: 'SHANGHAI INTERNATIONAL · PAGODA CITY' },
  Suzuka: { daypart: 'day', terrain: 'forest', ground: '#3c6548', runoff: '#9cac88', kerbs: ['#f6f0e5', '#e3433d'], accent: '#ee4d46', sky: '#9ec3ce', fog: '#a5b8bc', signature: 'FIGURE EIGHT · SUZUKA FERRIS WHEEL' },
  'Istanbul Park': { daypart: 'day', terrain: 'park', ground: '#50734f', runoff: '#a0ad88', kerbs: ['#f3f1e7', '#dd4b45'], accent: '#d34f48', sky: '#a3c1cd', fog: '#adbec0', signature: 'TUZLA HILLS · THE FAMOUS TURN 8' },
  'Jeddah Corniche': { daypart: 'night', terrain: 'coast', ground: '#343e48', runoff: '#397a77', kerbs: ['#f4f3ec', '#3b9a87'], accent: '#43d2cb', sky: '#06111e', fog: '#10202d', signature: 'RED SEA CORNICHE · FLOODLIT STREET RACE' },
  'Baku City Circuit': { daypart: 'day', terrain: 'coast', ground: '#797568', runoff: '#c4b79f', kerbs: ['#f4f0e8', '#dd4644'], accent: '#f0644e', sky: '#a1c8d1', fog: '#acbdbe', signature: 'OLD CITY WALLS · CASPIAN WATERFRONT' },
  Lusail: { daypart: 'night', terrain: 'desert', ground: '#605849', runoff: '#a18c6d', kerbs: ['#f0eee7', '#d84442'], accent: '#e9bf6a', sky: '#07111e', fog: '#131d2b', signature: 'LUSAIL DESERT · FLOODLIT NIGHT RACE' },
  Sepang: { daypart: 'day', terrain: 'tropical', ground: '#39704f', runoff: '#a8b382', kerbs: ['#f4f1e6', '#dc4541'], accent: '#e44942', sky: '#87b8c4', fog: '#9eb4b4', signature: 'TROPICAL RAINFOREST · TWIN GRANDSTANDS' },
  Hungaroring: { daypart: 'day', terrain: 'forest', ground: '#426b48', runoff: '#9cac82', kerbs: ['#f2efe4', '#df4845'], accent: '#ec514a', sky: '#a1c4cf', fog: '#a8b8b9', signature: 'HUNGARIAN HILLS · TWISTING WOODLAND BOWL' },
  'Red Bull Ring': { daypart: 'day', terrain: 'mountain', ground: '#51734e', runoff: '#a0b28b', kerbs: ['#f3f0e5', '#e44b43'], accent: '#e65048', sky: '#93c0d1', fog: '#9db4b7', signature: 'SPIELBERG · AUSTRIAN ALPINE VALLEY' },
  Zandvoort: { daypart: 'day', terrain: 'dunes', ground: '#617b58', runoff: '#c1ad86', kerbs: ['#f6f1e5', '#e84c43'], accent: '#f47b3d', sky: '#95c5d5', fog: '#a8c2c3', signature: 'NORTH SEA · BANKED TURNS & SAND DUNES' },
  'Yas Marina': { daypart: 'twilight', terrain: 'coast', ground: '#625d52', runoff: '#3b7180', kerbs: ['#edf0eb', '#31a6bb'], accent: '#b890f0', sky: '#29334c', fog: '#374250', signature: 'YAS MARINA · VIOLET HOTEL CANOPY AT DUSK' },
  'Mexico City': { daypart: 'day', terrain: 'stadium', ground: '#4e6e4b', runoff: '#b5ac91', kerbs: ['#f2eee5', '#df4a43'], accent: '#e04c43', sky: '#9dc3d0', fog: '#aababc', signature: 'FORO SOL STADIUM · HIGH ALTITUDE' },
  'Circuit Gilles-Villeneuve': { daypart: 'day', terrain: 'lake', ground: '#4b754f', runoff: '#a9b593', kerbs: ['#f4f1e8', '#df4546'], accent: '#f04b48', sky: '#98c5d5', fog: '#a7bec2', signature: 'ÎLE NOTRE-DAME · ST. LAWRENCE RIVER' },
  Hockenheimring: { daypart: 'day', terrain: 'forest', ground: '#3a6245', runoff: '#9eaa8a', kerbs: ['#f3f0e5', '#db4644'], accent: '#e94c45', sky: '#9ac4d0', fog: '#a5b9bd', signature: 'BADEN FOREST · MOTODROM STADIUM' },
  'Barcelona-Catalunya': { daypart: 'day', terrain: 'park', ground: '#688052', runoff: '#c1b794', kerbs: ['#f1f0e8', '#e34b43'], accent: '#e4524c', sky: '#96c1d0', fog: '#a9bec0', signature: 'MONTMELÓ · DRY CATALAN HILLS' },
  Miami: { daypart: 'day', terrain: 'stadium', ground: '#54815b', runoff: '#b9b197', kerbs: ['#f1f2eb', '#44a6d0'], accent: '#55cae2', sky: '#81bdce', fog: '#9bbabc', signature: 'MIAMI GARDENS · STADIUM PARK' },
  'Las Vegas': { daypart: 'night', terrain: 'city', ground: '#242a34', runoff: '#5b4e55', kerbs: ['#f3eee4', '#e44449'], accent: '#ec4d66', sky: '#080b17', fog: '#151827', signature: 'THE STRIP · SPHERE & NEON NIGHT RACE' },
  'Albert Park': { daypart: 'day', terrain: 'lake', ground: '#54764e', runoff: '#b8b49a', kerbs: ['#f4f0e5', '#db4843'], accent: '#62c6cf', sky: '#94c5d1', fog: '#a7bfc1', signature: 'ALBERT PARK · LAKE & PARKLAND STREETS' },
} satisfies Record<(typeof tracks)[number]['name'], CircuitVisual>

export function circuitVisual(name: string): CircuitVisual {
  return looks[name as keyof typeof looks]
}

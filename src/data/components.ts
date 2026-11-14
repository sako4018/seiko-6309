export type Stage =
  | 'ROTOR' | 'WINDING' | 'MAINSPRING' | 'GEAR TRAIN' | 'ESCAPEMENT' | 'BALANCE'
  | 'TIME DISPLAY' | 'CALENDAR' | 'STRUCTURE' | 'EXTERIOR';

export const ENERGY_PATH: Stage[] = ['ROTOR', 'WINDING', 'MAINSPRING', 'GEAR TRAIN', 'ESCAPEMENT', 'BALANCE'];

export type Status = 'photo' | 'spec' | 'schematic' | 'simplified' | 'uncertain';

export const STATUS_LABEL: Record<Status, string> = {
  photo: 'From your photos',
  spec: 'Documented 6309 fact',
  schematic: 'Schematic geometry',
  simplified: 'Simplified behaviour',
  uncertain: 'Not verifiable',
};

export const STATUS_HINT: Record<Status, string> = {
  photo: 'Shape, finish and layout matched to the owner\'s photo collage (low resolution).',
  spec: 'Widely documented characteristic of the 6309 calibre. No service manual was in the reference pack, so it is not checked against Seiko documents here.',
  schematic: 'Correct part and role in the 6309 architecture; exact shape and position are approximated, not taken from a parts diagram.',
  simplified: 'Motion is educational, not a physical simulation of torque, friction or tooth geometry.',
  uncertain: 'Detail cannot be read in the available references; a conservative rendition is shown.',
};

export interface Info {
  name: string;
  stage: Stage;
  role: string;
  interacts: string[];
  status: Status[];
  note?: string;
}

export const INFO: Record<string, Info> = {
  // ----- Exterior -----
  case: {
    name: 'Case', stage: 'EXTERIOR',
    role: 'Rounded stainless-steel case with broad integrated lugs. Polished sides, brushed lug tops. Holds the movement on its spacer and carries crystal, crown and caseback.',
    interacts: ['bezel', 'crystal', 'crown', 'caseback', 'bracelet'],
    status: ['photo'],
    note: 'Approx. 37 mm wide and 42 mm lug to lug, estimated from proportions in the photos.',
  },
  bezel: {
    name: 'Bezel', stage: 'EXTERIOR',
    role: 'Polished, rounded fixed bezel that retains the crystal.',
    interacts: ['case', 'crystal'], status: ['photo'],
  },
  crystal: {
    name: 'Crystal', stage: 'EXTERIOR',
    role: 'Slightly domed crystal protecting dial and hands.',
    interacts: ['bezel', 'dial'], status: ['photo', 'uncertain'],
    note: 'The crystal material (Hardlex mineral glass or acrylic) cannot be confirmed from the photos.',
  },
  dial: {
    name: 'Dial', stage: 'TIME DISPLAY',
    role: 'Warm ivory / champagne-white dial with a fine sunburst. Printed SEIKO / AUTOMATIC at 12, Seiko 5 emblem at 6. The day-date aperture at 3 o\'clock is a real cut-out showing the calendar discs below.',
    interacts: ['markers', 'dayDateWindow', 'dateDial', 'dayDisc', 'hourHand'],
    status: ['photo', 'uncertain'],
    note: 'The small print at 6 is not legible in the collage; "17 JEWELS" matches the 6309A but is unconfirmed for this dial.',
  },
  markers: {
    name: 'Hour markers', stage: 'TIME DISPLAY',
    role: 'Applied polished rectangular indices with a dark inlay. Doubled at 12; replaced by the day-date window at 3.',
    interacts: ['dial'], status: ['photo'],
  },
  dayDateWindow: {
    name: 'Day-date window', stage: 'CALENDAR',
    role: 'Polished frame around the day (left) and date (right) apertures at 3 o\'clock.',
    interacts: ['dayDisc', 'dateDial', 'dial'], status: ['photo'],
  },
  hourHand: {
    name: 'Hour hand', stage: 'TIME DISPLAY',
    role: 'Polished baton hand with dark inlay, mounted on the hour wheel pipe. One turn every 12 hours.',
    interacts: ['hourWheel', 'minuteHand'], status: ['photo'],
  },
  minuteHand: {
    name: 'Minute hand', stage: 'TIME DISPLAY',
    role: 'Polished baton hand with dark inlay, friction-fitted on the cannon pinion. One turn per hour.',
    interacts: ['cannonPinion', 'centerWheel'], status: ['photo'],
  },
  secondHand: {
    name: 'Seconds hand', stage: 'TIME DISPLAY',
    role: 'Thin centre-seconds hand. It advances in 6 small steps per second, the visible signature of 21,600 vph.',
    interacts: ['fourthWheel'], status: ['photo', 'simplified'],
    note: 'Driven from the fourth wheel rate (1 turn per minute). The exact centre-seconds layout of the 6309 is not modeled.',
  },
  crown: {
    name: 'Crown', stage: 'EXTERIOR',
    role: 'Knurled crown at 3 o\'clock. On the 6309 it only sets the time: there is no hand-winding and no hacking (the seconds do not stop).',
    interacts: ['stem', 'case'], status: ['photo', 'spec'],
  },
  caseback: {
    name: 'Caseback', stage: 'EXTERIOR',
    role: 'Circular stainless-steel caseback with a central medallion and an engraved ring of text.',
    interacts: ['case', 'rotor'], status: ['photo', 'uncertain'],
    note: 'Engravings are not legible in the collage. Model number and generic text are shown; no serial number is invented.',
  },
  bracelet: {
    name: 'Bracelet', stage: 'EXTERIOR',
    role: 'Multi-row stainless-steel bracelet: wide centre links with staggered outer rows and a fold-over clasp.',
    interacts: ['case'], status: ['photo'],
  },

  // ----- Structure -----
  mainPlate: {
    name: 'Main plate', stage: 'STRUCTURE',
    role: 'Foundation of the movement. The train side (caseback) carries the wheels and bridges; the dial side carries the motion and calendar works.',
    interacts: ['trainBridge', 'barrelBridge', 'balanceBridge', 'palletBridge', 'stem'], status: ['schematic'],
  },
  stem: {
    name: 'Winding stem', stage: 'STRUCTURE',
    role: 'Connects the crown to the keyless works. On the 6309 it is used to set the hands only.',
    interacts: ['crown', 'cannonPinion', 'minuteWheel'], status: ['spec', 'schematic'],
  },
  trainBridge: {
    name: 'Train wheel bridge', stage: 'STRUCTURE',
    role: 'Holds the upper pivots of the centre, third, fourth and escape wheels in jewel bearings.',
    interacts: ['centerWheel', 'thirdWheel', 'fourthWheel', 'escapeWheel', 'jewels'], status: ['schematic'],
  },
  barrelBridge: {
    name: 'Barrel bridge', stage: 'STRUCTURE',
    role: 'Holds the barrel arbor and carries the ratchet wheel and click.',
    interacts: ['barrel', 'ratchetWheel', 'secondReduction'], status: ['schematic'],
  },
  palletBridge: {
    name: 'Pallet bridge', stage: 'STRUCTURE',
    role: 'Small bridge holding the upper pivot of the pallet fork.',
    interacts: ['palletFork', 'jewels'], status: ['schematic'],
  },
  balanceBridge: {
    name: 'Balance bridge (cock) with Diashock', stage: 'STRUCTURE',
    role: 'Supports the balance staff. The Diashock spring setting protects the balance pivots from impacts. The hairspring stud is fixed to it.',
    interacts: ['balance', 'hairspring', 'jewels'], status: ['spec', 'schematic'],
  },
  autoBridge: {
    name: 'Automatic train bridge', stage: 'STRUCTURE',
    role: 'Carries the reduction wheels of the automatic winding and the rotor axle.',
    interacts: ['rotor', 'firstReduction', 'secondReduction'], status: ['schematic'],
  },
  jewels: {
    name: 'Jewels', stage: 'STRUCTURE',
    role: 'Synthetic ruby bearings that cut friction at pivots, on the pallet stones and on the impulse pin. The 6309A is a 17-jewel calibre.',
    interacts: ['trainBridge', 'palletBridge', 'balanceBridge', 'palletFork', 'balance'], status: ['spec', 'schematic'],
    note: 'Only the visible jewels are drawn; their positions are schematic.',
  },
  screws: {
    name: 'Screws', stage: 'STRUCTURE',
    role: 'Hold bridges, the ratchet wheel and the rotor in place.',
    interacts: ['trainBridge', 'barrelBridge', 'balanceBridge', 'rotor'], status: ['schematic'],
  },

  // ----- Energy path -----
  rotor: {
    name: 'Oscillating weight (rotor)', stage: 'ROTOR',
    role: 'Half-moon weight that swings with wrist movement. Its pinion drives the first reduction wheel. Thanks to the magic lever, the 6309 winds in both rotor directions.',
    interacts: ['firstReduction', 'autoBridge'], status: ['spec', 'schematic', 'simplified'],
    note: 'In Simulation mode drag the rotor or hold "Swing wrist". Rotor motion is a simple pendulum model.',
  },
  firstReduction: {
    name: 'First reduction wheel (eccentric)', stage: 'WINDING',
    role: 'Driven by the rotor pinion. Its eccentric moves the magic lever back and forth.',
    interacts: ['rotor', 'magicLever'], status: ['spec', 'schematic'],
  },
  magicLever: {
    name: 'Magic lever (pawl lever)', stage: 'WINDING',
    role: 'Seiko\'s bidirectional winding device. Its two hooks pull and push the teeth of the second reduction wheel, turning it the same way whichever way the rotor turns.',
    interacts: ['firstReduction', 'secondReduction'], status: ['spec', 'schematic', 'simplified'],
  },
  secondReduction: {
    name: 'Second reduction wheel & pinion', stage: 'WINDING',
    role: 'Turned in one direction only by the magic lever. Its pinion drives the ratchet wheel.',
    interacts: ['magicLever', 'ratchetWheel'], status: ['spec', 'schematic'],
  },
  ratchetWheel: {
    name: 'Ratchet wheel & click', stage: 'WINDING',
    role: 'Sits on the barrel arbor and winds the mainspring. The click stops it running back.',
    interacts: ['secondReduction', 'barrel', 'mainspring'], status: ['schematic'],
  },
  mainspring: {
    name: 'Mainspring', stage: 'MAINSPRING',
    role: 'Spiral spring that stores energy. The coils pack around the arbor when wound and against the barrel wall when let down. A slipping bridle stops over-winding on automatic movements.',
    interacts: ['barrel', 'ratchetWheel'], status: ['schematic', 'simplified'],
    note: 'Reserve is shown as about 40 h, used linearly. Real torque curves are not modeled.',
  },
  barrel: {
    name: 'Mainspring barrel', stage: 'MAINSPRING',
    role: 'Toothed drum that holds the mainspring. As the spring unwinds, the drum turns and drives the centre wheel pinion.',
    interacts: ['mainspring', 'centerWheel', 'barrelBridge'], status: ['schematic', 'simplified'],
    note: 'Shown turning about once per 7 h. The real ratio is not verified.',
  },
  centerWheel: {
    name: 'Centre wheel & pinion', stage: 'GEAR TRAIN',
    role: 'First wheel of the going train. Turns once per hour and carries the cannon pinion, and with it the minute hand.',
    interacts: ['barrel', 'thirdWheel', 'cannonPinion'], status: ['schematic'],
  },
  thirdWheel: {
    name: 'Third wheel & pinion', stage: 'GEAR TRAIN',
    role: 'Intermediate wheel between the centre and fourth wheels. Turns opposite to its neighbours.',
    interacts: ['centerWheel', 'fourthWheel'], status: ['schematic'],
  },
  fourthWheel: {
    name: 'Fourth wheel & pinion', stage: 'GEAR TRAIN',
    role: 'Turns once per minute (the seconds rate) and drives the escape wheel pinion.',
    interacts: ['thirdWheel', 'escapeWheel', 'secondHand'], status: ['schematic'],
  },
  escapeWheel: {
    name: 'Escape wheel', stage: 'ESCAPEMENT',
    role: '15-tooth club-tooth wheel. It is released half a tooth (12°) per vibration: 6 steps per second, one turn every 5 s at 21,600 vph. Its teeth give impulse to the pallet stones.',
    interacts: ['fourthWheel', 'palletFork'], status: ['schematic', 'simplified'],
  },
  palletFork: {
    name: 'Pallet fork', stage: 'ESCAPEMENT',
    role: 'Swiss lever. Two ruby pallet stones lock and unlock the escape wheel. The fork passes impulse to the balance\'s impulse pin, then rests against its banking until the balance returns.',
    interacts: ['escapeWheel', 'balance', 'palletBridge'], status: ['schematic', 'simplified'],
  },
  balance: {
    name: 'Balance wheel', stage: 'BALANCE',
    role: 'Oscillator of the watch: 3 full oscillations (6 vibrations) per second at 21,600 vph. Amplitude falls as the mainspring runs down.',
    interacts: ['hairspring', 'palletFork', 'balanceBridge'], status: ['spec', 'schematic', 'simplified'],
  },
  hairspring: {
    name: 'Hairspring', stage: 'BALANCE',
    role: 'Fine spiral spring that returns the balance to centre and sets its period. Inner end on the collet (moves with the balance), outer end on the stud (fixed).',
    interacts: ['balance', 'balanceBridge'], status: ['schematic', 'simplified'],
  },

  // ----- Motion & calendar works -----
  cannonPinion: {
    name: 'Cannon pinion', stage: 'TIME DISPLAY',
    role: 'Friction-fitted on the centre wheel arbor so the hands can be set. Carries the minute hand and drives the minute wheel.',
    interacts: ['centerWheel', 'minuteWheel', 'minuteHand'], status: ['schematic'],
  },
  minuteWheel: {
    name: 'Minute wheel', stage: 'TIME DISPLAY',
    role: 'Part of the 12:1 reduction from the cannon pinion to the hour wheel.',
    interacts: ['cannonPinion', 'hourWheel'], status: ['schematic'],
  },
  hourWheel: {
    name: 'Hour wheel', stage: 'TIME DISPLAY',
    role: 'Turns once every 12 h and carries the hour hand. Drives the date driving wheel.',
    interacts: ['minuteWheel', 'hourHand', 'dateDriver'], status: ['schematic'],
  },
  dateDriver: {
    name: 'Date driving wheel', stage: 'CALENDAR',
    role: 'Turns once per 24 h. Near midnight its finger advances the date dial and the day star.',
    interacts: ['hourWheel', 'dateDial', 'dayDisc'], status: ['schematic', 'simplified'],
  },
  dateDial: {
    name: 'Date dial (31)', stage: 'CALENDAR',
    role: 'Printed ring with 31 internal teeth. It advances one position per day. Short months need manual correction.',
    interacts: ['dateDriver', 'dayDateWindow'], status: ['schematic', 'simplified'],
  },
  dayDisc: {
    name: 'Day star with dial disc', stage: 'CALENDAR',
    role: 'Day disc driven through a seven-point day star. Shown with 14 positions (two sets of days).',
    interacts: ['dateDriver', 'dayDateWindow'], status: ['schematic', 'uncertain'],
    note: 'The real disc may be bilingual; the language set cannot be read in the photos.',
  },
};

export interface AssemblyStep {
  title: string;
  parts: string[];
  text: string;
}

export const ASSEMBLY: AssemblyStep[] = [
  { title: 'Main plate', parts: ['mainPlate'], text: 'Everything is built on the main plate: train side towards the caseback, dial side towards the dial.' },
  { title: 'Winding stem', parts: ['stem'], text: 'The stem goes in at 3 o\'clock. On the 6309 it sets the hands. Winding is automatic only.' },
  { title: 'Barrel & mainspring', parts: ['barrel', 'mainspring'], text: 'The barrel holds the mainspring, the power source. Its teeth will drive the going train.' },
  { title: 'Centre wheel', parts: ['centerWheel'], text: 'Driven by the barrel; turns once per hour and later carries the cannon pinion and minute hand.' },
  { title: 'Third wheel', parts: ['thirdWheel'], text: 'Reduces speed between the centre and fourth wheels and reverses direction.' },
  { title: 'Fourth wheel', parts: ['fourthWheel'], text: 'Turns once a minute: the seconds rate.' },
  { title: 'Escape wheel', parts: ['escapeWheel'], text: 'Last wheel of the train. Its 15 club teeth meet the pallet stones.' },
  { title: 'Train wheel bridge', parts: ['trainBridge'], text: 'Holds the upper pivots of the train wheels in jewel bearings.' },
  { title: 'Barrel bridge & ratchet', parts: ['barrelBridge', 'ratchetWheel'], text: 'Fixes the barrel arbor. The ratchet wheel on top winds the spring and the click holds it.' },
  { title: 'Pallet fork & bridge', parts: ['palletFork', 'palletBridge'], text: 'The lever escapement: the pallets lock and release the escape wheel one half-tooth per vibration.' },
  { title: 'Balance & hairspring', parts: ['balance', 'hairspring'], text: 'The oscillator: 6 vibrations per second (21,600 vph). Its impulse pin engages the pallet fork.' },
  { title: 'Balance bridge (Diashock)', parts: ['balanceBridge'], text: 'Supports the balance staff in shock-protected jewels and holds the hairspring stud.' },
  { title: 'Automatic train', parts: ['autoBridge', 'firstReduction', 'secondReduction'], text: 'Reduction wheels that turn fast rotor swings into slow, strong winding of the ratchet wheel.' },
  { title: 'Magic lever', parts: ['magicLever'], text: 'Seiko\'s bidirectional winding: the lever on the eccentric pulls and pushes the second reduction wheel the same way.' },
  { title: 'Rotor', parts: ['rotor'], text: 'The oscillating weight. Wrist motion is the energy input of the whole system.' },
  { title: 'Motion works', parts: ['cannonPinion', 'minuteWheel', 'hourWheel'], text: 'On the dial side: 12:1 reduction from the minute hand to the hour hand.' },
  { title: 'Calendar works', parts: ['dateDriver', 'dateDial', 'dayDisc'], text: 'Once per 24 h the date driving wheel advances the date dial and the day disc.' },
  { title: 'Dial', parts: ['dial'], text: 'Ivory/champagne dial with applied markers and the day-date window at 3 o\'clock.' },
  { title: 'Hands', parts: ['hourHand', 'minuteHand', 'secondHand'], text: 'Hour hand on the hour wheel, minute hand on the cannon pinion, then the centre seconds hand.' },
  { title: 'Casing', parts: ['case', 'bezel', 'crystal', 'crown'], text: 'The movement goes into the case; crystal and bezel close the front, and the crown connects to the stem.' },
  { title: 'Caseback', parts: ['caseback'], text: 'The caseback closes the watch. Assembly complete.' },
];

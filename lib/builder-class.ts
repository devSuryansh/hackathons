const CLASSES = [
  "KERNEL SURFER",
  "FIBER WITCH",
  "247 RUNTIME",
  "OCEAN COMPILER",
  "SHIP OR SHIP",
  "SANDBOX CAPTAIN",
  "GOA POINTER",
  "LESS NOISE",
  "MORE SIGNAL",
  "TERMINAL LOCAL",
  "BEACH KERNEL",
  "STACK STORM",
  "NIGHT HACKER",
  "DEMO SPRINTER",
  "RSVP LOCKED",
  "OPEN TRIAL",
  "SANDBOX PILOT",
  "WIRED BUILDER",
];

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function builderClass(name: string, stack: string, salt = 0): string {
  const seed = hashSeed(`${name.trim().toLowerCase()}|${stack.trim().toLowerCase()}|${salt}`);
  return CLASSES[seed % CLASSES.length];
}

export function passId(name: string, salt = 0): string {
  const seed = hashSeed(`${name}|${salt}|hhgoa26`);
  return `HHG-26-${String(seed % 10000).padStart(4, "0")}`;
}

// ── Neon Jump · shop catalog (skins & backgrounds, exact from server) ─

export type Rarity = "common" | "rare" | "epic" | "legend" | "mythic";

export type HatType =
  | "none" | "band" | "cap" | "antenna" | "horns" | "flame" | "crown"
  | "halo" | "hood" | "helmet" | "wings" | "tiara";

export type EyesType =
  | "normal" | "angry" | "cute" | "visor" | "cyclops" | "mask" | "glow";

export type EmblemType =
  | "web" | "arc" | "shield" | "atom" | "bolt" | "claw" | "hex" | "star";

export interface Skin {
  id: string;
  name: string;
  price: number;
  desc: string;
  rarity: Rarity;
  body1: string;
  body2: string;
  leg: string;
  eye: string;
  accent: string;
  trail: string; // "r,g,b"
  aura?: string;
  hat: HatType;
  eyes: EyesType;
  emblem?: EmblemType;
  cape?: string;
  hero?: boolean;
}

export interface Background {
  id: string;
  name: string;
  price: number;
  desc: string;
  rarity: Rarity;
  /** stops: [altitude, bottomColor, topColor] */
  sky: [number, string, string][];
  star: string; // "r,g,b"
  cloud: string;
  weather: "none" | "snow" | "petals" | "bubbles" | "embers" | "code" | "rain";
  weatherColor: string; // "r,g,b"
  preview: string;
}

export const RARITY_META: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Обычный", color: "#94a3b8" },
  rare: { label: "Редкий", color: "#38bdf8" },
  epic: { label: "Эпический", color: "#c084fc" },
  legend: { label: "Легендарный", color: "#f59e0b" },
  mythic: { label: "Мифический", color: "#fb7185" },
};

export const SKINS: Skin[] = [
  { id: "slime", name: "Неон-слайм", price: 0, desc: "С чего всё начиналось", rarity: "common", body1: "#ffffff", body2: "#c7d2fe", leg: "#818cf8", eye: "#1e1b4b", accent: "rgba(244,114,182,0.55)", trail: "139,92,246", hat: "none", eyes: "normal" },
  { id: "ninja", name: "Тень", price: 1500, desc: "Бесшумный прыжок", rarity: "common", body1: "#475569", body2: "#0f172a", leg: "#1e293b", eye: "#f43f5e", accent: "rgba(248,113,113,0.4)", trail: "71,85,105", hat: "band", eyes: "angry" },
  { id: "kitty", name: "Котик", price: 3000, desc: "Мягкие лапки", rarity: "rare", body1: "#fed7aa", body2: "#fb923c", leg: "#c2410c", eye: "#134e4a", accent: "rgba(190,24,93,0.4)", trail: "251,146,60", hat: "cap", eyes: "cute" },
  { id: "robot", name: "Меха-бот", price: 4000, desc: "Титановый корпус", rarity: "rare", body1: "#e2e8f0", body2: "#64748b", leg: "#334155", eye: "#22d3ee", accent: "rgba(34,211,238,0.5)", trail: "34,211,238", aura: "rgba(34,211,238,0.35)", hat: "antenna", eyes: "visor" },
  { id: "ghost", name: "Призрак", price: 8000, desc: "Полупрозрачный дух", rarity: "epic", body1: "#f0f9ff", body2: "#a5b4fc", leg: "#c4b5fd", eye: "#4c1d95", accent: "rgba(196,181,253,0.6)", trail: "165,180,252", aura: "rgba(165,180,252,0.45)", hat: "none", eyes: "cute" },
  { id: "alien", name: "Пришелец", price: 11000, desc: "Гость с Проксимы", rarity: "epic", body1: "#bbf7d0", body2: "#16a34a", leg: "#14532d", eye: "#0f172a", accent: "rgba(163,230,53,0.5)", trail: "74,222,128", aura: "rgba(74,222,128,0.4)", hat: "antenna", eyes: "cyclops" },
  { id: "dragon", name: "Дракончик", price: 15000, desc: "Чешуя и рожки", rarity: "epic", body1: "#86efac", body2: "#15803d", leg: "#166534", eye: "#facc15", accent: "rgba(250,204,21,0.45)", trail: "34,197,94", aura: "rgba(74,222,128,0.35)", hat: "horns", eyes: "angry" },
  { id: "phoenix", name: "Феникс", price: 22000, desc: "Пламя не гаснет", rarity: "legend", body1: "#fef08a", body2: "#dc2626", leg: "#7c2d12", eye: "#fff7ed", accent: "rgba(255,237,213,0.6)", trail: "249,115,22", aura: "rgba(249,115,22,0.55)", hat: "flame", eyes: "angry" },
  { id: "golden", name: "Золотой король", price: 30000, desc: "Роскошь чемпиона", rarity: "legend", body1: "#fef9c3", body2: "#f59e0b", leg: "#b45309", eye: "#78350f", accent: "rgba(255,255,255,0.6)", trail: "251,191,36", aura: "rgba(251,191,36,0.55)", hat: "crown", eyes: "normal" },
  { id: "cosmic", name: "Космо-божество", price: 50000, desc: "Соткан из галактик", rarity: "mythic", body1: "#a78bfa", body2: "#1e1b4b", leg: "#4c1d95", eye: "#f0abfc", accent: "rgba(240,171,252,0.6)", trail: "217,70,239", aura: "rgba(217,70,239,0.6)", hat: "halo", eyes: "cyclops" },
  { id: "webslinger", name: "Паутинщик", price: 6000, desc: "Соседский герой на паутине", rarity: "rare", body1: "#ef4444", body2: "#1d4ed8", leg: "#1e3a8a", eye: "#0f172a", accent: "rgba(255,255,255,0.35)", trail: "239,68,68", hat: "hood", eyes: "mask", emblem: "web", hero: true },
  { id: "ironcore", name: "Железное ядро", price: 12000, desc: "Броня с дуговым реактором", rarity: "epic", body1: "#fca5a5", body2: "#b91c1c", leg: "#facc15", eye: "#22d3ee", accent: "rgba(250,204,21,0.5)", trail: "250,204,21", aura: "rgba(34,211,238,0.4)", hat: "helmet", eyes: "glow", emblem: "arc", hero: true },
  { id: "starcaptain", name: "Звёздный капитан", price: 14000, desc: "Щит и звезда на груди", rarity: "epic", body1: "#60a5fa", body2: "#1e40af", leg: "#b91c1c", eye: "#0f172a", accent: "rgba(255,255,255,0.5)", trail: "96,165,250", hat: "hood", eyes: "mask", emblem: "shield", hero: true },
  { id: "greenrage", name: "Зелёный гнев", price: 16000, desc: "Ярость крушит платформы", rarity: "epic", body1: "#86efac", body2: "#166534", leg: "#7c3aed", eye: "#052e16", accent: "rgba(22,101,52,0.5)", trail: "34,197,94", hat: "none", eyes: "angry", emblem: "atom", hero: true },
  { id: "thunderlord", name: "Повелитель грома", price: 20000, desc: "Молот и крылатый шлем", rarity: "legend", body1: "#e2e8f0", body2: "#334155", leg: "#b91c1c", eye: "#38bdf8", accent: "rgba(56,189,248,0.55)", trail: "56,189,248", aura: "rgba(56,189,248,0.45)", hat: "wings", eyes: "glow", emblem: "bolt", cape: "#dc2626", hero: true },
  { id: "nightclaw", name: "Ночной коготь", price: 24000, desc: "Вибраниумный костюм", rarity: "legend", body1: "#4c1d95", body2: "#0f0724", leg: "#1e1b4b", eye: "#c4b5fd", accent: "rgba(196,181,253,0.4)", trail: "139,92,246", aura: "rgba(139,92,246,0.35)", hat: "hood", eyes: "mask", emblem: "claw", cape: "#1e1b4b", hero: true },
  { id: "scarletwitch", name: "Алая чародейка", price: 28000, desc: "Хаос-магия в руках", rarity: "legend", body1: "#fda4af", body2: "#9f1239", leg: "#7f1d1d", eye: "#dc2626", accent: "rgba(220,38,38,0.55)", trail: "244,63,94", aura: "rgba(244,63,94,0.5)", hat: "tiara", eyes: "glow", emblem: "hex", cape: "#be123c", hero: true },
  { id: "infinityfist", name: "Кулак бесконечности", price: 60000, desc: "Шесть камней силы", rarity: "mythic", body1: "#fbbf24", body2: "#7c2d12", leg: "#a16207", eye: "#fde047", accent: "rgba(253,224,71,0.6)", trail: "251,191,36", aura: "rgba(251,191,36,0.65)", hat: "helmet", eyes: "glow", emblem: "star", cape: "#7c2d12", hero: true },
];

export const BACKGROUNDS: Background[] = [
  { id: "night", name: "Ночной неон", price: 0, desc: "Сумерки → космос", rarity: "common", sky: [[0, "#241047", "#5b2a86"], [350, "#140a33", "#3a1d66"], [800, "#0a0620", "#1c1148"], [1400, "#04020c", "#0d0726"]], star: "255,255,255", cloud: "#c4b5fd", weather: "none", weatherColor: "255,255,255", preview: "linear-gradient(180deg,#5b2a86,#241047 55%,#0a0620)" },
  { id: "sunset", name: "Закатный берег", price: 2000, desc: "Тёплые облака", rarity: "common", sky: [[0, "#7c2d12", "#fb923c"], [350, "#7e22ce", "#f97316"], [800, "#1e1b4b", "#7c3aed"], [1400, "#0c0a1f", "#312e81"]], star: "255,237,213", cloud: "#fed7aa", weather: "petals", weatherColor: "251,146,60", preview: "linear-gradient(180deg,#fb923c,#7e22ce 60%,#1e1b4b)" },
  { id: "aurora", name: "Северное сияние", price: 5000, desc: "Снежные вихри", rarity: "rare", sky: [[0, "#042f2e", "#14b8a6"], [350, "#083344", "#0ea5e9"], [800, "#082f49", "#1d4ed8"], [1400, "#020617", "#0f172a"]], star: "204,251,241", cloud: "#99f6e4", weather: "snow", weatherColor: "224,242,254", preview: "linear-gradient(180deg,#14b8a6,#0ea5e9 55%,#082f49)" },
  { id: "ocean", name: "Глубина", price: 7000, desc: "Пузырьки и толща воды", rarity: "rare", sky: [[0, "#0c4a6e", "#38bdf8"], [350, "#075985", "#0284c7"], [800, "#082f49", "#0369a1"], [1400, "#020617", "#0c4a6e"]], star: "186,230,253", cloud: "#7dd3fc", weather: "bubbles", weatherColor: "186,230,253", preview: "linear-gradient(180deg,#38bdf8,#0369a1 55%,#082f49)" },
  { id: "volcano", name: "Вулкан", price: 9000, desc: "Пепел и искры", rarity: "epic", sky: [[0, "#450a0a", "#dc2626"], [350, "#450a0a", "#ea580c"], [800, "#1c1917", "#7f1d1d"], [1400, "#0c0a09", "#292524"]], star: "254,215,170", cloud: "#78716c", weather: "embers", weatherColor: "251,146,60", preview: "linear-gradient(180deg,#dc2626,#7f1d1d 60%,#1c1917)" },
  { id: "candy", name: "Сахарная вата", price: 14000, desc: "Лепестки и мечты", rarity: "epic", sky: [[0, "#831843", "#f9a8d4"], [350, "#9d174d", "#f472b6"], [800, "#4c1d95", "#c084fc"], [1400, "#1e1b4b", "#7c3aed"]], star: "253,242,248", cloud: "#fbcfe8", weather: "petals", weatherColor: "249,168,212", preview: "linear-gradient(180deg,#f9a8d4,#f472b6 55%,#7c3aed)" },
  { id: "matrix", name: "Матрица", price: 25000, desc: "Цифровой дождь", rarity: "legend", sky: [[0, "#052e16", "#22c55e"], [350, "#022c22", "#15803d"], [800, "#011a12", "#064e3b"], [1400, "#000000", "#022c22"]], star: "134,239,172", cloud: "#4ade80", weather: "code", weatherColor: "74,222,128", preview: "linear-gradient(180deg,#22c55e,#15803d 55%,#011a12)" },
  { id: "void", name: "Разлом пустоты", price: 45000, desc: "Метеоритный шторм", rarity: "mythic", sky: [[0, "#1e1b4b", "#7c3aed"], [350, "#2e1065", "#a21caf"], [800, "#0f0524", "#4c1d95"], [1400, "#000000", "#18042e"]], star: "240,171,252", cloud: "#a78bfa", weather: "rain", weatherColor: "217,70,239", preview: "linear-gradient(180deg,#a21caf,#4c1d95 55%,#0f0524)" },
];

export const DEFAULT_SKIN = SKINS[0];
export const DEFAULT_BG = BACKGROUNDS[0];

export function findSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? DEFAULT_SKIN;
}

export function findBackground(id: string): Background {
  return BACKGROUNDS.find((b) => b.id === id) ?? DEFAULT_BG;
}

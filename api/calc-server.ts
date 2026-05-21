import http, { IncomingMessage, ServerResponse } from "http";
import path from "path";
const {
  calculate,
  Generations,
  Pokemon,
  Move,
  Field,
  Side,
} = require(path.resolve(__dirname, "../../src/vendors/smogon/damage-calc-dist"));

type JsonObject = Record<string, any>;

const DEFAULT_PORT = 8787;
const MAX_BODY_BYTES = 1024 * 1024;
const STAT_IDS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const API_BASE_PATH = "/calc/api";

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: any): any {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickStats(stats: unknown, fallback: JsonObject): JsonObject {
  if (!isObject(stats)) {
    return fallback;
  }
  const next = { ...fallback };
  for (const stat of STAT_IDS) {
    if (stats[stat] !== undefined) {
      next[stat] = toNumber(stats[stat], fallback[stat]);
    }
  }
  return next;
}

function normalizePokemonOptions(input: JsonObject): JsonObject {
  const evs = pickStats(input.evs, {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  });
  const ivs = pickStats(input.ivs, {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  });
  const boosts = pickStats(input.boosts, {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  });
  delete boosts.hp;

  const options: JsonObject = {
    level: toNumber(input.level, 50),
    ability: input.ability || undefined,
    item: input.item && input.item !== "(No Item)" ? input.item : undefined,
    nature: input.nature || "Serious",
    teraType: input.isTera === false ? undefined : input.teraType,
    curHP: toNumber(input.curHP ?? input.currentHP, undefined),
    evs,
    ivs,
    boosts,
    status: input.status || undefined,
    isDynamaxed: Boolean(input.isDynamaxed),
    dynamaxLevel: toNumber(input.dynamaxLevel, undefined),
    alliesFainted: toNumber(input.alliesFainted, undefined),
    boostedStat:
      input.boostedStat && input.boostedStat !== "inactive"
        ? input.boostedStat
        : undefined,
    abilityOn: Boolean(input.abilityOn),
    moves: Array.isArray(input.moves) ? input.moves : [],
  };

  if (isObject(input.baseStats)) {
    options.overrides = { baseStats: pickStats(input.baseStats, {}) };
  } else if (isObject(input.overrides)) {
    options.overrides = input.overrides;
  }

  return options;
}

function getPokemonName(input: JsonObject, role: string): string {
  const name = input.name || input.species;
  if (!name || typeof name !== "string") {
    throw new Error(`${role}.name is required`);
  }
  return name;
}

function createPokemon(gen: number, input: unknown, role: string): any {
  if (!isObject(input)) {
    throw new Error(`${role} must be an object`);
  }
  return new Pokemon(
    Generations.get(gen as any),
    getPokemonName(input, role),
    normalizePokemonOptions(input),
  );
}

function normalizeMoveOptions(input: JsonObject, attacker: any): JsonObject {
  const options: JsonObject = {
    ability: input.ability || attacker.ability,
    item: input.item || attacker.item,
    species: input.species || attacker.species.name,
    useZ: Boolean(input.useZ || input.isZ),
    useMax: Boolean(input.useMax || input.isMax),
    isCrit: Boolean(input.isCrit || input.criticalHit),
    isStellarFirstUse: Boolean(input.isStellarFirstUse),
    hits: toNumber(input.hits, undefined),
    timesUsed: toNumber(input.timesUsed, undefined),
    timesUsedWithMetronome: toNumber(input.timesUsedWithMetronome, undefined),
  };

  if (isObject(input.overrides)) {
    options.overrides = input.overrides;
  }
  if (input.bp !== undefined || input.basePower !== undefined) {
    options.overrides = {
      ...(options.overrides || {}),
      basePower: toNumber(input.bp ?? input.basePower, undefined),
    };
  }

  return options;
}

function createMove(gen: number, input: unknown, attacker: any): any {
  if (!isObject(input)) {
    throw new Error("move must be an object");
  }
  const name = input.name || input.move;
  if (!name || typeof name !== "string") {
    throw new Error("move.name is required");
  }
  return new Move(
    Generations.get(gen as any),
    name,
    normalizeMoveOptions(input, attacker),
  );
}

function normalizeSide(side: unknown): any {
  if (!isObject(side)) {
    return new Side({});
  }
  return new Side({
    ...side,
    isSR: Boolean(side.isSR || side.stealthRock),
    isReflect: Boolean(side.isReflect || side.reflect),
    isLightScreen: Boolean(side.isLightScreen || side.lightScreen),
    isProtected: Boolean(side.isProtected || side.protect),
    isSeeded: Boolean(side.isSeeded || side.leechSeed),
    isSaltCured: Boolean(side.isSaltCured || side.saltCure),
    isForesight: Boolean(side.isForesight || side.foresight),
    isTailwind: Boolean(side.isTailwind || side.tailwind),
    isHelpingHand: Boolean(side.isHelpingHand || side.helpingHand),
    isFlowerGift: Boolean(side.isFlowerGift || side.flowerGift),
    isPowerTrick: Boolean(side.isPowerTrick || side.powerTrick),
    isFriendGuard: Boolean(side.isFriendGuard || side.friendGuard),
    isAuroraVeil: Boolean(side.isAuroraVeil || side.auroraVeil),
    isBattery: Boolean(side.isBattery || side.battery),
    isPowerSpot: Boolean(side.isPowerSpot || side.powerSpot),
    isSteelySpirit: Boolean(side.isSteelySpirit || side.steelySpirit),
    spikes: toNumber(side.spikes, 0),
  });
}

function createField(input: unknown): any {
  const fieldInput = isObject(input) ? input : {};
  return new Field({
    ...fieldInput,
    gameType: fieldInput.gameType || "Doubles",
    attackerSide: normalizeSide(fieldInput.attackerSide),
    defenderSide: normalizeSide(fieldInput.defenderSide),
  });
}

function serializePokemon(pokemon: any): JsonObject {
  return {
    name: pokemon.name,
    species: pokemon.species.name,
    level: pokemon.level,
    ability: pokemon.ability,
    item: pokemon.item,
    nature: pokemon.nature,
    types: pokemon.types,
    stats: pokemon.stats,
    rawStats: pokemon.rawStats,
    curHP: pokemon.curHP(),
    maxHP: pokemon.maxHP(),
    boosts: pokemon.boosts,
    status: pokemon.status || undefined,
    teraType: pokemon.teraType,
  };
}

function serializeResult(result: any): JsonObject {
  const range = result.range();
  const defenderMaxHP = result.defender.maxHP();
  const percentRange =
    defenderMaxHP > 0
      ? [
          Number(((range[0] / defenderMaxHP) * 100).toFixed(2)),
          Number(((range[1] / defenderMaxHP) * 100).toFixed(2)),
        ]
      : [0, 0];

  return {
    damage: result.damage,
    range,
    percentRange,
    moveDesc: result.moveDesc(),
    fullDesc: result.fullDesc(),
    kochance: result.kochance(),
    rawDesc: result.rawDesc,
    attacker: serializePokemon(result.attacker),
    defender: serializePokemon(result.defender),
    move: {
      name: result.move.name,
      originalName: result.move.originalName,
      type: result.move.type,
      category: result.move.category,
      bp: result.move.bp,
      hits: result.move.hits,
      isCrit: result.move.isCrit,
      useZ: result.move.useZ,
      useMax: result.move.useMax,
    },
    field: result.field,
  };
}

export function calculateFromPayload(payload: unknown): JsonObject {
  if (!isObject(payload)) {
    throw new Error("request body must be a JSON object");
  }
  const gen = toNumber(payload.gen, 9);
  const attacker = createPokemon(gen, payload.attacker, "attacker");
  const defender = createPokemon(gen, payload.defender, "defender");
  const move = createMove(gen, payload.move, attacker);
  const field = createField(payload.field);
  return serializeResult(calculate(gen as any, attacker, defender, move, field));
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(json),
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(json);
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("request body is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === `${API_BASE_PATH}/health`) {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, {
      ok: false,
      error: "method_not_allowed",
      message: "POST /calc/api is the supported endpoint",
    });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    sendJson(res, 200, { ok: true, result: calculateFromPayload(payload) });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: "bad_request",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (
    url.pathname === API_BASE_PATH ||
    url.pathname === `${API_BASE_PATH}/` ||
    url.pathname === `${API_BASE_PATH}/calculate` ||
    url.pathname === `${API_BASE_PATH}/health` ||
    url.pathname === "/api/calculate"
  ) {
    await handleApiRequest(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, {
    error: "not_found",
    message: "POST /calc/api is the supported endpoint",
  });
}

if (process.argv[1] === __filename) {
  const port = toNumber(process.env.PORT, DEFAULT_PORT);
  const host = process.env.HOST || "0.0.0.0";
  http.createServer(handleRequest).listen(port, host, () => {
    console.log(`VGC calc API listening on http://${host}:${port}`);
  });
}

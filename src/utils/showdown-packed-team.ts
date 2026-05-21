import { ShowdownDataService } from "../services/showdown.data.service";

type StatId = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

interface PackedPokemonSet {
  name?: string;
  species: string;
  item?: string;
  ability?: string;
  moves: string[];
  nature?: string;
  evs?: Record<StatId, number>;
  gender?: string;
  ivs?: Record<StatId, number>;
  shiny?: boolean;
  level?: number;
  happiness?: number;
  teraType?: string;
}

export interface ExternalTeamImportPayload {
  attacker?: string;
  defender?: string;
  hasImportParams: boolean;
}

const STAT_IDS: StatId[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const STAT_LABELS: Record<StatId, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

const guessPackedName = (name: string): string =>
  name
    .replace(/([0-9]+)/g, " $1 ")
    .replace(/([A-Z])/g, " $1")
    .replace(/[ ][ ]/g, " ")
    .trim();

const unpackName = (
  name: string,
  lookup?: (name: string) => { name?: string } | undefined,
): string => {
  if (!name) {
    return "";
  }
  const value = lookup?.(name)?.name;
  return value || guessPackedName(name);
};

const unpackStats = (
  value: string,
  emptyValue: number,
): Record<StatId, number> | undefined => {
  if (!value) {
    return undefined;
  }
  const parts = value.split(",", 6);
  return {
    hp: parts[0] === "" ? emptyValue : Number(parts[0]) || 0,
    atk: parts[1] === "" ? emptyValue : Number(parts[1]) || 0,
    def: parts[2] === "" ? emptyValue : Number(parts[2]) || 0,
    spa: parts[3] === "" ? emptyValue : Number(parts[3]) || 0,
    spd: parts[4] === "" ? emptyValue : Number(parts[4]) || 0,
    spe: parts[5] === "" ? emptyValue : Number(parts[5]) || 0,
  };
};

const unpackPackedTeam = (packedTeam: string): PackedPokemonSet[] => {
  return packedTeam
    .split("]")
    .map((packedSet) => packedSet.trim())
    .filter(Boolean)
    .map((packedSet) => {
      const fields = packedSet.split("|");
      const species = unpackName(
        fields[1] || fields[0] || "",
        ShowdownDataService.getPokemonSpecies,
      );
      const speciesData = ShowdownDataService.getPokemonSpecies(species);
      const abilityValue = fields[3] || "";
      const ability =
        abilityValue === ""
          ? ""
          : ["0", "1", "H", "S"].includes(abilityValue)
            ? speciesData?.abilities?.[abilityValue as "0" | "1" | "H" | "S"]
            : unpackName(abilityValue, ShowdownDataService.getPokemonAbilityInfo);
      const misc = (fields[11] || "").split(",", 6);

      return {
        name: fields[0] || undefined,
        species,
        item: unpackName(fields[2] || "", ShowdownDataService.getPokemonItemInfo),
        ability,
        moves: (fields[4] || "")
          .split(",", 24)
          .filter(Boolean)
          .map((move) => unpackName(move, ShowdownDataService.getPokemonMoveInfo)),
        nature: unpackName(fields[5] || "", ShowdownDataService.getNatureByString),
        evs: unpackStats(fields[6] || "", 0),
        gender: fields[7] || undefined,
        ivs: unpackStats(fields[8] || "", 31),
        shiny: !!fields[9],
        level: fields[10] ? Number(fields[10]) || undefined : undefined,
        happiness: misc[0] ? Number(misc[0]) || undefined : undefined,
        teraType: misc[5] || undefined,
      };
    });
};

const exportSet = (set: PackedPokemonSet): string => {
  const lines: string[] = [];
  const displayName =
    set.name && set.name !== set.species
      ? `${set.name} (${set.species})`
      : set.species;
  const gender = set.gender === "M" || set.gender === "F" ? ` (${set.gender})` : "";
  lines.push(`${displayName}${gender}${set.item ? ` @ ${set.item}` : ""}`);
  if (set.ability) {
    lines.push(`Ability: ${set.ability}`);
  }
  lines.push(`Level: ${set.level ?? 100}`);
  if (set.shiny) {
    lines.push("Shiny: Yes");
  }
  if (typeof set.happiness === "number" && set.happiness !== 255) {
    lines.push(`Happiness: ${set.happiness}`);
  }
  if (set.teraType) {
    lines.push(`Tera Type: ${set.teraType}`);
  }
  if (set.evs) {
    const evText = STAT_IDS.map((statId) =>
      set.evs?.[statId] ? `${set.evs[statId]} ${STAT_LABELS[statId]}` : "",
    ).filter(Boolean);
    if (evText.length > 0) {
      lines.push(`EVs: ${evText.join(" / ")}`);
    }
  }
  if (set.nature) {
    lines.push(`${set.nature} Nature`);
  }
  if (set.ivs) {
    const ivText = STAT_IDS.map((statId) =>
      set.ivs?.[statId] !== undefined && set.ivs[statId] !== 31
        ? `${set.ivs[statId]} ${STAT_LABELS[statId]}`
        : "",
    ).filter(Boolean);
    if (ivText.length > 0) {
      lines.push(`IVs: ${ivText.join(" / ")}`);
    }
  }
  for (const move of set.moves) {
    lines.push(`- ${move}`);
  }
  return lines.join("\n");
};

export const unpackPackedTeamToPasteText = (packedTeam: string): string => {
  return unpackPackedTeam(packedTeam).map(exportSet).join("\n\n");
};

const decodeHashValue = (hashValue: string): string => {
  try {
    return decodeURIComponent(hashValue);
  } catch {
    return hashValue;
  }
};

const parseLabeledHashBlocks = (
  hashValue: string,
): { attacker?: string; defender?: string } | undefined => {
  const lines = hashValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return undefined;
  }

  const payload: { attacker?: string; defender?: string } = {};
  let currentSide: "attacker" | "defender" | undefined;
  let currentLines: string[] = [];
  const flush = () => {
    if (currentSide && currentLines.length > 0) {
      payload[currentSide] = currentLines.join("");
    }
    currentLines = [];
  };

  for (const line of lines) {
    const side =
      line === "1"
        ? "attacker"
        : line === "2"
          ? "defender"
          : undefined;
    if (side) {
      flush();
      currentSide = side;
    } else if (currentSide) {
      currentLines.push(line);
    }
  }
  flush();

  return payload.attacker || payload.defender ? payload : undefined;
};

const parseSingleHashBlock = (
  hashValue: string,
): { attacker?: string; defender?: string } => {
  const sideMatch = hashValue.match(/^([12])([\s\S]+)$/);
  if (!sideMatch) {
    return { attacker: hashValue };
  }
  return sideMatch[1] === "2"
    ? { defender: sideMatch[2] }
    : { attacker: sideMatch[2] };
};

export const readExternalPackedTeamHash = (): ExternalTeamImportPayload => {
  const rawHash = window.location.hash.replace(/^#/, "").trim();
  if (!rawHash) {
    return { hasImportParams: false };
  }

  const parsedHash = decodeHashValue(rawHash).trim();
  const packedPayload =
    parseLabeledHashBlocks(parsedHash) ?? parseSingleHashBlock(parsedHash);

  return {
    attacker: packedPayload.attacker
      ? unpackPackedTeamToPasteText(packedPayload.attacker)
      : undefined,
    defender: packedPayload.defender
      ? unpackPackedTeamToPasteText(packedPayload.defender)
      : undefined,
    hasImportParams: !!packedPayload.attacker || !!packedPayload.defender,
  };
};

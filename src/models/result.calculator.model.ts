import {
  Move,
  Result as CalculatorResult,
} from "../vendors/smogon/damage-calc-dist/index";
import { Field } from "../vendors/smogon/damage-calc-dist/field";
import { ShowdownDataService } from "../services/showdown.data.service";
import { t } from "i18next";
import i18n, { Language } from "../i18n/i18n";
import { translationService } from "../services/translation.service";
import { Pokemon } from "./pokemon.calculator.model";

export interface ResultDescriptionToken {
  kind:
    | "text"
    | "evValue"
    | "evPositive"
    | "evNegative"
    | "evLabel"
    | "move"
    | "vs"
    | "pokemon";
  text: string;
  moveType?: string;
  pokemonTypes?: string[];
}

const championsActualEvToDisplayEv = (actualEv: number): number => {
  const normalized = Math.max(0, Math.floor(actualEv));
  if (normalized === 0) {
    return 0;
  }
  if (normalized <= 4) {
    return 1;
  }
  return Math.floor((normalized + 4) / 8);
};

const formatChampionsEvText = (evText?: string): string | undefined => {
  if (!evText || !ShowdownDataService.isChampionsGame()) {
    return evText;
  }

  const match = evText.match(/^(\d+)([+-]?)(\s+.*)$/);
  if (!match) {
    return evText;
  }

  const evValue = Number.parseInt(match[1], 10);
  if (Number.isNaN(evValue)) {
    return evText;
  }

  return `${championsActualEvToDisplayEv(evValue)}${match[2]}${match[3]}`;
};

export class Result extends CalculatorResult {
  _overrideAttackerPokemonName: string | undefined = undefined;
  _overrideDefenderPokemonName: string | undefined = undefined;

  set overrideAttackerPokemonName(name: string | undefined) {
    this._overrideAttackerPokemonName = name;
  }
  set overrideDefenderPokemonName(name: string | undefined) {
    this._overrideDefenderPokemonName = name;
  }
  /**
   * 文本：伤害范围与百分比，例如 "min-max (minPct-maxPct%)"
   */
  public getDamageRangeText(): string {
    if (this.damage === 0) {
      return "";
    }
    try {
      const damageText = (this.moveDesc() || "")
        .replace("recoil damage", t("damageResult.recoildamage"))
        .replace("crash damage", t("damageResult.crashdamage"))
        .replace("struggle damage", t("damageResult.struggledamage"))
        .replace("recovered", t("damageResult.recovered"));
      return damageText;
    } catch (error) {
      // logResultDescError("moveDesc", error, this.rawDesc);
      return "";
    }
  }

  private getMoveType(): string | undefined {
    const resultMove = this.move as Move | undefined;
    return resultMove?.type || this.rawDesc.moveType;
  }

  private getEvTokenKind(
    evText: string,
  ): ResultDescriptionToken["kind"] {
    if (evText.includes("+")) {
      return "evPositive";
    }
    if (evText.includes("-")) {
      return "evNegative";
    }
    return "evValue";
  }

  private pushEvTokens(
    evText: string,
    pushText: (
      text: string,
      kind?: ResultDescriptionToken["kind"],
      moveType?: string,
      pokemonTypes?: string[],
    ) => void,
  ): void {
    const match = evText.match(/^(\d+[+-]?)(?:\s+(.*))?$/);
    if (!match) {
      pushText(evText);
      return;
    }

    pushText(match[1], this.getEvTokenKind(match[1]));
    if (match[2]) {
      pushText(match[2], "evLabel");
    }
  }

  private createDescriptionToken(
    text: string,
    kind: ResultDescriptionToken["kind"] = "text",
    moveType?: string,
    pokemonTypes?: string[],
  ): ResultDescriptionToken {
    return {
      text,
      kind,
      ...(moveType ? { moveType } : {}),
      ...(pokemonTypes ? { pokemonTypes } : {}),
    };
  }

  private getPokemonTypes(
    pokemon?: Pokemon,
  ): string[] | undefined {
    if (!pokemon?.types || pokemon.types.length === 0) {
      return undefined;
    }
    return pokemon.types.map((type) => type.toLowerCase());
  }

  public getFullDescTokens(): ResultDescriptionToken[] {
    const lang = i18n.language as unknown as Language;
    const rawDesc = this.rawDesc;
    const descriptionTokens: ResultDescriptionToken[] = [];
    const pushText = (
      text: string,
      kind: ResultDescriptionToken["kind"] = "text",
      moveType?: string,
      pokemonTypes?: string[],
    ) => {
      descriptionTokens.push(
        this.createDescriptionToken(text, kind, moveType, pokemonTypes),
      );
    };
    const pushEvText = (evText?: string) => {
      const formattedEvText = formatChampionsEvText(evText);
      if (!formattedEvText) {
        return;
      }
      this.pushEvTokens(formattedEvText, pushText);
    };

    if (rawDesc.attackBoost != null && rawDesc.attackBoost !== 0) {
      pushText(
        rawDesc.attackBoost > 0
          ? `+${rawDesc.attackBoost}`
          : `${rawDesc.attackBoost}`,
      );
    }
    pushEvText(rawDesc.attackEVs);
    if (rawDesc.attackerItem != null) {
      pushText(
        translationService.translateItemSync(lang, rawDesc.attackerItem!),
      );
    }
    if (rawDesc.attackerAbility != null) {
      pushText(
        translationService.translateAbilitySync(lang, rawDesc.attackerAbility!),
      );
    }
    if (rawDesc.isBurned) {
      pushText(t("damageResult.burned"));
    }
    if (rawDesc.alliesFainted && rawDesc.alliesFainted > 0) {
      pushText(
        t("damageResult.alliesFainted", {
          count: rawDesc.alliesFainted,
        }),
      );
    }
    if (rawDesc.attackerTera != null) {
      pushText(t("damageResult.tera"));
      pushText(translationService.translateTypeSync(lang, rawDesc.attackerTera!));
    }
    if (rawDesc.isSwordOfRuin) {
      pushText(t("damageResult.swordofruin"));
    }
    if (rawDesc.isBeadsOfRuin) {
      pushText(t("damageResult.beadsofruin"));
    }
    if (!this._overrideAttackerPokemonName && rawDesc.attackerName) {
      this._overrideAttackerPokemonName = rawDesc.attackerName!;
    }
    if (this._overrideAttackerPokemonName) {
      pushText(
        translationService.translatePokemonSync(
          lang,
          this._overrideAttackerPokemonName,
        ),
        "pokemon",
        undefined,
        this.getPokemonTypes(this.attacker as Pokemon | undefined),
      );
    }
    if (rawDesc.isHelpingHand) {
      pushText(t("damageResult.helpinghand"));
    }
    if (rawDesc.isFlowerGiftAttacker) {
      pushText(t("damageResult.flowergift"));
    }
    if (rawDesc.isSteelySpiritAttacker) {
      pushText(t("damageResult.steelyspirit"));
    }
    if (rawDesc.isBattery) {
      pushText(t("damageResult.batteryboosted"));
    }
    if (rawDesc.isPowerSpot) {
      pushText(t("damageResult.powerspot"));
    }
    if (rawDesc.moveName != null) {
      pushText(
        translationService.translateMoveSync(lang, rawDesc.moveName!),
        "move",
        this.getMoveType(),
      );
    }
    if (rawDesc.moveBP != null && rawDesc.moveBP !== 0) {
      pushText(`(${rawDesc.moveBP}${t("damageResult.bp")})`);
    }
    if (rawDesc.hits != null && rawDesc.hits > 1) {
      pushText(
        t("damageResult.hits").replaceAll("{{hits}}", rawDesc.hits.toString()),
      );
    }

    pushText("VS.", "vs");

    if (rawDesc.defenseBoost != null && rawDesc.defenseBoost !== 0) {
      pushText(
        rawDesc.defenseBoost > 0
          ? `+${rawDesc.defenseBoost}`
          : `${rawDesc.defenseBoost}`,
      );
    }
    if (rawDesc.HPEVs != null) {
      pushEvText(rawDesc.HPEVs);
    }
    if (rawDesc.HPEVs != null && rawDesc.defenseEVs != null) {
      pushText("/", "evLabel");
    }
    if (rawDesc.defenseEVs != null) {
      pushEvText(rawDesc.defenseEVs);
    }
    if (rawDesc.defenderItem != null) {
      pushText(
        translationService.translateItemSync(lang, rawDesc.defenderItem!),
      );
    }
    if (rawDesc.defenderAbility != null) {
      pushText(
        translationService.translateAbilitySync(lang, rawDesc.defenderAbility!),
      );
    }
    if (rawDesc.isDefenderDynamaxed) {
      pushText(t("damageResult.dynamax"));
    }
    if (rawDesc.defenderTera != null) {
      pushText(t("damageResult.tera"));
      pushText(translationService.translateTypeSync(lang, rawDesc.defenderTera!));
    }
    if (rawDesc.isTabletsOfRuin) {
      pushText(t("damageResult.tabletsofruin"));
    }
    if (rawDesc.isVesselOfRuin) {
      pushText(t("damageResult.vesselofruin"));
    }
    if (!this._overrideDefenderPokemonName && rawDesc.defenderName) {
      this._overrideDefenderPokemonName = rawDesc.defenderName!;
    }
    if (this._overrideDefenderPokemonName) {
      pushText(
        translationService.translatePokemonSync(
          lang,
          this._overrideDefenderPokemonName,
        ),
        "pokemon",
        undefined,
        this.getPokemonTypes(this.defender as Pokemon | undefined),
      );
    }
    if (rawDesc.terrain) {
      pushText(
        t("damageResult." + rawDesc.terrain.toLowerCase().replaceAll(" ", "")),
      );
    }
    if (rawDesc.weather) {
      pushText(
        t("damageResult." + rawDesc.weather.toLowerCase().replaceAll(" ", "")),
      );
    }
    if (rawDesc.isFlowerGiftDefender) {
      pushText(t("damageResult.flowergift"));
    }
    if (rawDesc.isReflect) {
      pushText(t("damageResult.reflect"));
    }
    if (rawDesc.isLightScreen) {
      pushText(t("damageResult.lightscreen"));
    }
    if (rawDesc.isFriendGuard) {
      pushText(t("damageResult.friendguard"));
    }
    if (rawDesc.isAuroraVeil) {
      pushText(t("damageResult.auroraveil"));
    }
    if (rawDesc.isCritical) {
      pushText(t("damageResult.criticalhit"));
    }
    if (rawDesc.isWonderRoom) {
      pushText(t("damageResult.wonderroom"));
    }

    return descriptionTokens;
  }

  public getDamageSummaryText(): string {
    const damageStrings2: string[] = [];
    if (this.damage != null && this.damage !== 0) {
      const range = this.range();
      damageStrings2.push(
        `${range[0]} - ${range[1]} (${(
          (range[0] /
            (this.defender.stats.hp *
              (this.defender.isDynamaxed === true ? 2 : 1))) *
          100
        ).toFixed(2)}-${(
          (range[1] /
            (this.defender.stats.hp *
              (this.defender.isDynamaxed === true ? 2 : 1))) *
          100
        ).toFixed(2)}%)`,
      );
      const kochance = this.kochance();
      try {
        const koText = kochance.text.trim();
        if (kochance && koText !== "") {
          const index = koText.indexOf(" (");
          const parts = [];
          if (index > 0) {
            parts.push(koText.substring(0, index));
            parts.push(koText.substring(index + 2, koText.length - 1));
          } else {
            parts.push(koText);
          }
          const koStr = [];
          const part0 = this._getKoChangeDamageStrByPartText(parts[0]);
          if (part0 !== "") {
            koStr.push(part0);
          }
          if (parts.length > 1) {
            const part1 = this._getKoChangeDamageStrByPartText(parts[1]);
            if (part1 !== "") {
              koStr.push(
                t("damageResult.subtext").replaceAll("{{text}}", part1),
              );
            }
          }
          if (koStr.length > 0) {
            damageStrings2.push(" -- ");
            damageStrings2.push(koStr.join(""));
          }
        }
      } catch (e) {
        console.log(e);
        if (
          kochance &&
          kochance.chance &&
          kochance.chance > 0 &&
          kochance.n > 0
        ) {
          damageStrings2.push(` -- `);
          if (kochance.chance === 1) {
            damageStrings2.push(t("damageResult.kochance_guaranteed"));
          } else {
            damageStrings2.push(
              t("damageResult.kochance_chance").replaceAll(
                "{{chance}}",
                `${(kochance.chance * 100).toFixed(2)}%`,
              ),
            );
          }
          if (kochance.n === 1) {
            damageStrings2.push(t("damageResult.kochance_ko_1"));
          } else {
            damageStrings2.push(
              t("damageResult.kochance_ko_n").replaceAll(
                "{{n}}",
                kochance.n.toString(),
              ),
            );
          }
          const after_index = kochance.text.indexOf("after ");
          if (after_index >= 0) {
            const after_text_strings: string[] = [];
            const tmp = kochance.text
              .substring(after_index + 6)
              .replaceAll(" ,", ",")
              .replaceAll("(guaranteed OHKO after", ",")
              .replaceAll(")", "")
              .replaceAll(", and ", "|")
              .replaceAll(",and ", "|")
              .replaceAll(" and ", "|")
              .replaceAll(", ", "|")
              .toLowerCase();
            const list = tmp.split("|");
            for (let i = 0; i < list.length; i++) {
              if (i > 0 && i === list.length - 1) {
                after_text_strings.push(
                  t(`damageResult.chanceaftertextsplitlast`),
                );
              } else if (i > 0) {
                after_text_strings.push(t(`damageResult.chanceaftertextsplit`));
              }
              const text = list[i].trim();
              const tag = `damageResult.${text.replaceAll(" ", "")}`;
              const tran = t(tag);
              after_text_strings.push(tran === tag ? text : tran);
            }
            damageStrings2.push(
              t(`damageResult.chanceaftertext`).replaceAll(
                "{{text}}",
                after_text_strings.join(""),
              ),
            );
          }
        }
      }
    }

    return damageStrings2.join("");
  }

  public getFullDescText(): string {
    const descriptionText = this.getFullDescTokens()
      .map((token) => token.text)
      .join(" ");
    const damageSummaryText = this.getDamageSummaryText();
    return damageSummaryText
      ? descriptionText.concat(": ", damageSummaryText)
      : descriptionText;
  }

  _getKoChangeDamageStrByPartText(text: string): string {
    if (text === "") {
      return "";
    }
    const chanceText = [];
    const parts = text.split(" after ");
    const hitsStr = parts[0].endsWith("HKO")
      ? parts[0].substring(parts[0].lastIndexOf(" ") + 1, parts[0].length - 3)
      : "-1";
    const hits = hitsStr === "O" ? 1 : Number(hitsStr);

    if (parts[0].startsWith("approx. ")) {
      parts[0] = parts[0].substring(8);
      chanceText.push(t("damageResult.approx"));
    } else if (parts[0].startsWith("possible ")) {
      parts[0] = parts[0].substring(9);
      chanceText.push(t("damageResult.possible"));
    }
    const chanceStr = parts[0].startsWith("guaranteed")
      ? "100"
      : parts[0].lastIndexOf("%") > -1
        ? parts[0].substring(0, parts[0].lastIndexOf("%"))
        : "-100";
    const chanceVal = Number(chanceStr.replaceAll("%", ""));
    if (chanceVal === -100) {
    } else if (chanceVal === 100) {
      chanceText.push(t("damageResult.kochance_guaranteed"));
    } else {
      chanceText.push(
        t("damageResult.kochance_chance").replaceAll(
          "{{chance}}",
          `${chanceVal}%`,
        ),
      );
    }
    if (hits === 1) {
      chanceText.push(t("damageResult.kochance_ko_1"));
    } else {
      chanceText.push(
        t("damageResult.kochance_ko_n").replaceAll("{{n}}", hits.toString()),
      );
    }
    const after_index = text.indexOf("after ");
    if (after_index >= 0) {
      const after_text_strings: string[] = [];
      const tmp = text
        .substring(after_index + 6)
        .replaceAll(" ,", ",")
        .replaceAll(", and ", "|")
        .replaceAll(",and ", "|")
        .replaceAll(" and ", "|")
        .replaceAll(", ", "|")
        .toLowerCase();
      const list = tmp.split("|");
      for (let i = 0; i < list.length; i++) {
        if (i > 0 && i === list.length - 1) {
          after_text_strings.push(t(`damageResult.chanceaftertextsplitlast`));
        } else if (i > 0) {
          after_text_strings.push(t(`damageResult.chanceaftertextsplit`));
        }
        const text = list[i].trim();
        const tag = `damageResult.${text.replaceAll(" ", "")}`;
        const tran = t(tag);
        after_text_strings.push(tran === tag ? text : tran);
      }
      chanceText.push(
        t(`damageResult.chanceaftertext`).replaceAll(
          "{{text}}",
          after_text_strings.join(""),
        ),
      );
    }
    return chanceText.join("");
  }

  /**
   * 文本：KO 概率描述（仅当伤害为非空一维数组时返回文本，避免第三方库断言错误）
   */
  public getKoChanceText(): string {
    const dmg = this.damage as unknown;
    if (
      Array.isArray(dmg) &&
      typeof (dmg as any)[0] === "number" &&
      (dmg as any[]).length > 0
    ) {
      try {
        const { text } = this.kochance();
        return text || "";
      } catch (e) {
        return "";
      }
    }
    return "";
  }

  public hasMultiSegmentDamage(): boolean {
    const dmg = this.damage as unknown;
    return Array.isArray(dmg) && Array.isArray((dmg as unknown[])[0]);
  }

  private _computeSumCounts(lists: number[][]): Map<number, number> {
    let sums = new Map<number, number>();
    sums.set(0, 1);
    for (const list of lists) {
      const next = new Map<number, number>();
      for (const [s, c] of sums) {
        for (const v of list) {
          const key = s + v;
          next.set(key, (next.get(key) || 0) + c);
        }
      }
      sums = next;
      if (sums.size === 0) break;
    }
    return sums;
  }

  _possibleDamageAmounts(): number | number[] {
    if (typeof this.damage === "number") return this.damage;
    const arr = this.damage as number[];
    if (arr.length > 0 && Array.isArray(arr[0])) {
      const lists = arr.map((x) =>
        Array.isArray(x)
          ? (x as number[])
              .filter((v) => typeof v === "number")
              .map((v) => v as number)
          : [],
      ) as number[][];
      const sumCounts = this._computeSumCounts(lists);
      const uniqueSums = Array.from(sumCounts.keys()).sort((a, b) => a - b);
      return uniqueSums;
    }
    return arr;
  }
  public getPossibleDamageAmountsText(): string {
    const dmg = this._possibleDamageAmounts();
    if (Array.isArray(dmg)) {
      if (dmg.length > 16) {
        const seen = new Set<number>();
        const values: number[] = [];
        for (const v of dmg) {
          if (typeof v === "number" && !seen.has(v)) {
            seen.add(v);
            values.push(v);
          }
        }
        return values.join(", ");
      }
      return `${dmg.join(", ")}`;
    }
    return `${dmg}`;
  }

  public getPossibleDamageAmounts(): number[] {
    const dmg = this._possibleDamageAmounts();
    return Array.isArray(dmg) ? dmg : [dmg];
  }

  public getDefenderRemainingHp(): number {
    try {
      return this.defender.curHP();
    } catch {
      return this.defender?.stats?.hp || 0;
    }
  }

  public getOhkoChanceValue(): number {
    try {
      const hp =
        this.defender?.stats?.hp * (this.defender?.isDynamaxed ? 2 : 1);
      if (typeof hp !== "number" || !Number.isFinite(hp) || hp <= 0) {
        return 0;
      }
      const dmg = this.damage as unknown;
      if (Array.isArray(dmg) && Array.isArray((dmg as unknown[])[0])) {
        const lists = (dmg as unknown[]).map((x) =>
          Array.isArray(x)
            ? (x as number[])
                .filter((v) => typeof v === "number")
                .map((v) => v as number)
            : [],
        ) as number[][];
        const sumCounts = this._computeSumCounts(lists);
        let success = 0;
        let total = 0;
        for (const [sum, count] of sumCounts) {
          total += count;
          if (sum >= hp) success += count;
        }
        return total > 0 ? success / total : 0;
      }
      const flat = this._possibleDamageAmounts();
      if (
        Array.isArray(flat) &&
        flat.length > 0 &&
        typeof flat[0] === "number"
      ) {
        let success = 0;
        for (const v of flat) {
          if (typeof v === "number" && v >= hp) success++;
        }
        const total = flat.length;
        return total > 0 ? success / total : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

/**
 * 计算指定侧的 4 个招式的伤害结果数组（返回扩展的 Result 或 undefined）
 * 注意：此方法不依赖 React 上下文，需显式传入 Field 与 Side。
 */
export function computeSideMoveResults(
  atkPokemon: Pokemon | undefined,
  defPokemon: Pokemon | undefined,
  getMove: (index: number) => Move | undefined,
  field: Field,
): (Result | undefined)[] {
  const results: (Result | undefined)[] = [
    undefined,
    undefined,
    undefined,
    undefined,
  ];

  if (!atkPokemon || !defPokemon) {
    return results;
  }

  for (let idx = 0; idx < 4; idx++) {
    try {
      const move = getMove(idx);
      if (!move) {
        results[idx] = undefined;
        continue;
      }
      const result: Result = ShowdownDataService.calculate(
        move.gen.num,
        atkPokemon,
        defPokemon,
        move,
        field,
      );
      results[idx] = result;
    } catch (e) {
      console.warn("Failed to compute side move result for index", idx, e);
      results[idx] = undefined;
    }
  }

  return results;
}

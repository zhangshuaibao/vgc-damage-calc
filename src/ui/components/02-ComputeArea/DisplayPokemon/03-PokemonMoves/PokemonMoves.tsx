import React, { useMemo } from "react";
import "./PokemonMoves.css";
import { usePokemonState } from "../../../../../contexts/PokemonStateContext";
import { useDamageCompute } from "../../../../../contexts/DamageComputeContext";
import { useTranslation } from "react-i18next";
import { getTypeColor } from "../../../../../utils/type.colors";
import { getDamageColorFromChance } from "../../../../../utils/damage.colors";
import ToggleButton from "../../../../../ui/widgets/ToggleButton/ToggleButton";
import { ShowdownDataService } from "../../../../../services/showdown.data.service";
import SmartImage from "../../../../widgets/SmartImage/SmartImage";
import { usePokemonTranslation } from "../../../../../contexts/usePokemonTranslation";
// 伤害计算已由 DamageComputeContext 提供汇总，组件不再直接计算

interface PokemonMovesProps {
  isAttacker: boolean;
  className?: string;
  tabIndexStart?: number;
}

export const PokemonMoves: React.FC<PokemonMovesProps> = ({
  isAttacker,
  className,
  tabIndexStart,
}) => {
  const {
    selectedMoveIndex,
    setSelectedMoveIndex,
    getGlobalIndexForSideOriginal,
    attackerSideResults,
    defenderSideResults,
  } = useDamageCompute();

  const { translateMove } = usePokemonTranslation();
  const { t } = useTranslation();
  // 侧状态不再用于本组件的伤害计算，统一由 DamageComputeContext 处理

  type MoveDisplay = { name: string; type: string; originalIndex: number; hasMove: boolean };
  const moves: MoveDisplay[] = useMemo(() => {
    const results = isAttacker ? attackerSideResults : defenderSideResults;
    return results.map((r, idx) => {
      if (r && r.move) {
        const name = translateMove(r.move.name as unknown as string);
        const type = (r.move.type as unknown as string)?.toLowerCase() || "normal";
        return { name, type, originalIndex: idx, hasMove: true };
      }
      const name = t("pokemon.noMove");
      const type = "???";
      return { name, type, originalIndex: idx, hasMove: false };
    });
  }, [isAttacker, attackerSideResults, defenderSideResults, translateMove, t]);

  // 将当前侧有效招式映射为全局索引的选项
  const sideOptions = useMemo(() => {
    return moves.map((move) => {
      const globalIdx = getGlobalIndexForSideOriginal(
        isAttacker,
        move.originalIndex
      );
      const key =
        globalIdx !== undefined
          ? globalIdx
          : (isAttacker ? -101 : -201) - move.originalIndex;
      return {
        key,
        label: (
          <div className="pokemon-moves__move-container">
            <div
              className="pokemon-moves__type-indicator"
              style={{ backgroundColor: getTypeColor(move.type) }}
            />
            <span className="pokemon-moves__move-name">{move.name}</span>
          </div>
        ),
      } as { key: number; label: React.ReactNode };
    });
  }, [moves, isAttacker, getGlobalIndexForSideOriginal]);

  const sideSelectedValue = useMemo(() => {
    return sideOptions.some((opt) => opt.key === selectedMoveIndex)
      ? selectedMoveIndex
      : undefined;
  }, [sideOptions, selectedMoveIndex]);

  // 计算当前侧每个招式的伤害区间文本和颜色
  const damageEntries = useMemo(() => {
    const results = isAttacker ? attackerSideResults : defenderSideResults;

    return moves.map((m) => {
      const r = results[m.originalIndex];
      if (!r)
        return {
          text: "",
          color: undefined as string | undefined,
          className: undefined as string | undefined,
        };

      const text = r.getDamageRangeText();
      if (!text)
        return {
          text: "",
          color: undefined as string | undefined,
          className: undefined as string | undefined,
        };

      let color: string | undefined;
      let className: string | undefined;
      const koChance = r.getOhkoChanceValue();
      if (koChance === 1) {
        className = "pokemon-moves__damage-text--ko";
      } else if (koChance === 0) {
        className = "pokemon-moves__damage-text--impossible";
      } else {
        color = getDamageColorFromChance(r.getOhkoChanceValue());
      }

      return { text, color, className };
    });
  }, [moves, isAttacker, attackerSideResults, defenderSideResults]);

  const {
    move1z,
    setMove1z,
    move2z,
    setMove2z,
    move3z,
    setMove3z,
    move4z,
    setMove4z,
  } = usePokemonState(isAttacker);
  const zFlags = [move1z, move2z, move3z, move4z];
  const setZFns = [setMove1z, setMove2z, setMove3z, setMove4z];

  return (
    <div
      className={`pokemon-moves ${
        isAttacker ? "pokemon-moves--attacker" : "pokemon-moves--defender"
      } ${className || ""}`}
    >
      <div className="pokemon-moves__container">
        {moves.map((move, index) => {
          const globalIdx = getGlobalIndexForSideOriginal(
            isAttacker,
            move.originalIndex
          );
          const key =
            globalIdx !== undefined
              ? globalIdx
              : (isAttacker ? -101 : -201) - move.originalIndex;
          const isActive = sideSelectedValue === key && move.hasMove;

          const isZ = zFlags[move.originalIndex];
          const zCls = `pokemon-moves__z-image ${
            isZ ? "pokemon-moves__z-image--active" : "pokemon-moves__z-image--inactive"
          }`;

          const edgeClass =
            index === 0
              ? "rounded-top"
              : index === moves.length - 1
              ? "rounded-bottom"
              : "";

          const damageEl = (
            <div
              key={`d-${index}`}
              className={`pokemon-moves__damage-text ${
                damageEntries[index]?.className || ""
              }`}
              style={
                damageEntries[index]?.color
                  ? { color: damageEntries[index]?.color }
                  : undefined
              }
            >
              {damageEntries[index]?.text || ""}
            </div>
          );

          const zEl = (
            <div key={`z-${index}`} className="pokemon-moves__z-container">
              <SmartImage
                src={ShowdownDataService.getZMoveImgUrl()}
                alt={t("pokemon.rule.zBadge")}
                className={zCls}
                onClick={() => {
                  const setter = setZFns[move.originalIndex];
                  setter(!isZ);
                }}
              />
            </div>
          );

          const buttonEl = (
            <ToggleButton
              key={`b-${index}`}
              label={
                <div className="pokemon-moves__move-container">
                  <div
                    className="pokemon-moves__type-indicator"
                    style={{ backgroundColor: getTypeColor(move.type) }}
                  />
                  <span className="pokemon-moves__move-name">{move.name}</span>
                </div>
              }
              active={isActive}
              disabled={key < 0 || !move.hasMove}
              onClick={() => {
                if (key < 0) return;
                setSelectedMoveIndex(key);
              }}
              className={edgeClass}
              tabIndex={typeof tabIndexStart === "number" ? tabIndexStart + index : undefined}
            />
          );

          const cells = isAttacker ? [damageEl, zEl, buttonEl] : [buttonEl, zEl, damageEl];

          return (
            <div key={index} className="pokemon-moves__row">
              {cells}
            </div>
          );
        })}
      </div>
    </div>
  );
};

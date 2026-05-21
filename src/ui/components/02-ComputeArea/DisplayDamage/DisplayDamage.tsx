import React, { useState, useMemo } from "react";
import "./DisplayDamage.css";
import { useDamageCompute } from "../../../../contexts/DamageComputeContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  getTypeColor,
} from "../../../../utils/type.colors";
import { getDamageColorFromChance } from "../../../../utils/damage.colors";

interface DisplayDamageProps {
  className?: string;
}

export const DisplayDamage: React.FC<DisplayDamageProps> = ({ className }) => {
  const { isAttackerSelected, selectedResult } = useDamageCompute();
  const { theme } = useTheme();
  const { t } = useTranslation(["app", "calc/damage_result"]);
  const [showSegments, setShowSegments] = useState(false);
  const descriptionTokens = useMemo(
    () => (selectedResult ? selectedResult.getFullDescTokens() : []),
    [selectedResult]
  );
  const damageSummaryText = useMemo(
    () => (selectedResult ? selectedResult.getDamageSummaryText() : ""),
    [selectedResult]
  );
  const damageSummaryParts = useMemo(() => {
    if (!damageSummaryText) {
      return { rangeText: "", suffixText: "" };
    }
    const separatorIndex = damageSummaryText.indexOf(" -- ");
    if (separatorIndex < 0) {
      return { rangeText: damageSummaryText, suffixText: "" };
    }
    return {
      rangeText: damageSummaryText.slice(0, separatorIndex),
      suffixText: damageSummaryText.slice(separatorIndex),
    };
  }, [damageSummaryText]);
  const hasSegments = useMemo(
    () => !!selectedResult && selectedResult.hasMultiSegmentDamage(),
    [selectedResult]
  );
  const segmentValues = useMemo(
    () => (hasSegments && selectedResult ? selectedResult.damage as number[][] : []),
    [hasSegments, selectedResult]
  );
  const summaryColorInfo = useMemo(() => {
    if (!selectedResult) {
      return { color: undefined as string | undefined, className: "" };
    }
    const koChance = selectedResult.getOhkoChanceValue();
    if (koChance === 1) {
      return { color: undefined, className: "display-damage__summary--ko" };
    }
    if (koChance === 0) {
      return {
        color: undefined,
        className: "display-damage__summary--impossible",
      };
    }
    return {
      color: getDamageColorFromChance(koChance),
      className: "",
    };
  }, [selectedResult, theme]);
  const possibleDamageValues = useMemo(
    () => (selectedResult ? selectedResult.getPossibleDamageAmounts() : []),
    [selectedResult]
  );
  const defenderRemainingHp = useMemo(
    () => (selectedResult ? selectedResult.getDefenderRemainingHp() : 0),
    [selectedResult]
  );
  const arrowText = showSegments
    ? t("damageResult.expandArrowUp")
    : t("damageResult.expandArrowDown");

  const handleAmountsClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!hasSegments) {
        return;
      }
      const selection = window.getSelection();
      const hasActiveSelection =
        !!selection &&
        !selection.isCollapsed &&
        selection.rangeCount > 0 &&
        event.currentTarget.contains(selection.anchorNode) &&
        event.currentTarget.contains(selection.focusNode);
      if (hasActiveSelection) {
        return;
      }
      setShowSegments((previousValue) => !previousValue);
    },
    [hasSegments]
  );

  const getPokemonTokenStyle = React.useCallback(
    (pokemonTypes?: string[]): React.CSSProperties | undefined => {
      if (!pokemonTypes || pokemonTypes.length === 0) {
        return undefined;
      }

      if (pokemonTypes.length === 1) {
        return {
          backgroundImage: `linear-gradient(${getTypeColor(pokemonTypes[0])}, ${getTypeColor(pokemonTypes[0])})`,
          backgroundPosition: "0 100%",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 2px",
        };
      }

      const primaryColor = getTypeColor(pokemonTypes[0]);
      const secondaryColor = getTypeColor(pokemonTypes[1]);
      return {
        backgroundImage: `linear-gradient(90deg, ${primaryColor} 0%, ${primaryColor} 50%, ${secondaryColor} 50%, ${secondaryColor} 100%)`,
        backgroundPosition: "0 100%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 2px",
      };
    },
    []
  );

  return (
    <div className={`display-damage ${className || ""}`}>
      {selectedResult &&
      (descriptionTokens.length > 0 || damageSummaryText) ? (
        <div
          className={`display-damage__description ${
            isAttackerSelected
              ? "display-damage__description--left"
              : "display-damage__description--right"
          }`}
        >
          {descriptionTokens.map((token, index) => {
            const classNames = ["display-damage__token"];
            if (token.kind === "evValue") {
              classNames.push("display-damage__token--ev-value");
            } else if (token.kind === "evPositive") {
              classNames.push("display-damage__token--ev-positive");
            } else if (token.kind === "evNegative") {
              classNames.push("display-damage__token--ev-negative");
            } else if (token.kind === "evLabel") {
              classNames.push("display-damage__token--ev-label");
            } else if (token.kind === "move") {
              classNames.push("display-damage__token--move");
            } else if (token.kind === "pokemon") {
              classNames.push("display-damage__token--pokemon");
            } else if (token.kind === "vs") {
              classNames.push("display-damage__token--vs");
            }

            return (
              <React.Fragment key={`${token.kind}-${token.text}-${index}`}>
                {index > 0 ? " " : null}
                <span
                  className={classNames.join(" ")}
                  style={
                    token.kind === "move" && token.moveType
                      ? { color: getTypeColor(token.moveType) }
                      : token.kind === "pokemon"
                        ? getPokemonTokenStyle(token.pokemonTypes)
                        : undefined
                  }
                >
                  {token.text}
                </span>
              </React.Fragment>
            );
          })}
          {damageSummaryText ? (
            <>
              {": "}
              <span className="display-damage__summary">
                <span
                  className={`display-damage__summary-range ${summaryColorInfo.className}`}
                  style={
                    summaryColorInfo.color
                      ? { color: summaryColorInfo.color }
                      : undefined
                  }
                >
                  {damageSummaryParts.rangeText}
                </span>
                {damageSummaryParts.suffixText ? (
                  <span className="display-damage__summary-suffix">
                    {damageSummaryParts.suffixText}
                  </span>
                ) : null}
              </span>
            </>
          ) : null}
        </div>
      ) : null}

      {selectedResult && possibleDamageValues.length > 0 && (
        <div
          className={`display-damage__amounts ${
            isAttackerSelected
              ? "display-damage__amounts--left"
              : "display-damage__amounts--right"
          }`}
          onClick={handleAmountsClick}
        >
          {isAttackerSelected && hasSegments ? (
            <span className="display-damage__amounts-arrow">
              {arrowText}
            </span>
          ) : null}
          <span className="display-damage__amounts-label">
            {t("damageResult.possibleDamageAmounts")}:
          </span>
          <span className="display-damage__amounts-values">
            (
            {possibleDamageValues.map((value, index) => (
              <React.Fragment key={`possible-damage-${value}-${index}`}>
                {index > 0 ? ", " : null}
                <span
                  className={
                    value >= defenderRemainingHp
                      ? "display-damage__amount-value display-damage__amount-value--ko"
                      : "display-damage__amount-value"
                  }
                  style={
                    value >= defenderRemainingHp
                      ? { color: "var(--damage-ko-color)" }
                      : undefined
                  }
                >
                  {value}
                </span>
              </React.Fragment>
            ))}
            )
          </span>
          {!isAttackerSelected && hasSegments ? (
            <span className="display-damage__amounts-arrow">{arrowText}</span>
          ) : null}

          {showSegments && hasSegments ? (
            <>
              <br />
              {isAttackerSelected ? (
                <span className="display-damage__amounts-arrow-col" />
              ) : null}
              <span className="display-damage__segments-block">
                (
                {segmentValues
                  .map(
                    (vals, i) =>
                      `${t("damageResult.segment", { index: i + 1 })}: ${vals.join(
                        t("damageResult.chanceaftertextsplit")
                      )}`
                  )
                  .join("\n")}
                )
              </span>
              {!isAttackerSelected ? (
                <span className="display-damage__amounts-arrow-col" />
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

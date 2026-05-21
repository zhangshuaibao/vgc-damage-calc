import React, { useState, useMemo } from "react";
import "./DisplayDamage.css";
import { useDamageCompute } from "../../../../contexts/DamageComputeContext";
import { useTranslation } from "react-i18next";

interface DisplayDamageProps {
  className?: string;
}

export const DisplayDamage: React.FC<DisplayDamageProps> = ({ className }) => {
  const { isAttackerSelected, selectedResult } = useDamageCompute();
  const { t } = useTranslation(["app", "calc/damage_result"]);
  const [showSegments, setShowSegments] = useState(false);
  const descriptionTokens = useMemo(
    () => (selectedResult ? selectedResult.getFullDescTokens() : []),
    [selectedResult]
  );
  const damageSummarySegments = useMemo(
    () => (selectedResult ? selectedResult.getDamageSummarySegments() : []),
    [selectedResult]
  );
  const hasSegments = useMemo(
    () => !!selectedResult && selectedResult.hasMultiSegmentDamage(),
    [selectedResult]
  );
  const segmentValues = useMemo(
    () => (hasSegments && selectedResult ? selectedResult.damage as number[][] : []),
    [hasSegments, selectedResult]
  );
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

  return (
    <div className={`display-damage ${className || ""}`}>
      {selectedResult &&
      (descriptionTokens.length > 0 || damageSummarySegments.length > 0) ? (
        <div
          className={`display-damage__description ${
            isAttackerSelected
              ? "display-damage__description--left"
              : "display-damage__description--right"
          }`}
        >
          {descriptionTokens.map((token, index) => {
            return (
              <React.Fragment key={`${token.kind}-${token.text}-${index}`}>
                {index > 0 ? " " : null}
                <span className={token.className} style={token.style}>
                  {token.text}
                </span>
              </React.Fragment>
            );
          })}
          {damageSummarySegments.length > 0 ? (
            <>
              {": "}
              <span className="display-damage__summary">
                {damageSummarySegments.map((segment, index) => (
                  <span
                    key={`summary-segment-${index}-${segment.text}`}
                    className={segment.className}
                    style={segment.style}
                  >
                    {segment.text}
                  </span>
                ))}
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

import React from "react";
import EditAreaProps from "../Props/EditAreaProps";
// @ts-ignore
import "./Team.css";
import { useTeamState } from "../../../../contexts/TeamContext";

import { useTranslation } from "react-i18next";
import {
  FiPlus,
  FiTrash2,
  FiArrowLeft,
  FiCopy,
  FiSave,
  FiFolder,
  FiX,
  FiBookmark,
  FiTrendingUp,
} from "react-icons/fi";
import { usePokemonUsage } from "../../../../contexts/PokemonUsageContext";
import { ShowdownDataService } from "../../../../services/showdown.utils/showdown.data.service";
import { createPortal } from "react-dom";
import { confirmable, ContextAwareConfirmation } from "react-confirm";
import ConfirmDialog, {
  type ConfirmPayload,
} from "../../../widgets/ConfirmDialog/ConfirmDialog";
import SmartImage from "../../../widgets/SmartImage/SmartImage";

const TEAM_TOUCH_DRAG_DELAY_MS = 220;
const TEAM_TOUCH_CANCEL_MOVE_PX = 10;
const TEAM_TOUCH_START_DRAG_MOVE_PX = 3;
const TEAM_TOUCH_EDGE_SCROLL_ZONE_PX = 40;
const TEAM_TOUCH_EDGE_SCROLL_STEP_PX = 18;
const TEAM_TOUCH_FORCE_ARM_THRESHOLD = 0.8;

type TeamTouch = React.Touch | Touch;
type TeamTouchListLike = {
  length: number;
  item(index: number): TeamTouch | null;
};

const Team: React.FC<EditAreaProps> = ({ isAttacker }) => {
  const {
    slots,
    selectedIndex,
    selectSlot,
    moveSlot,
    addSlot,
    removeSlot,
    savedTeams,
    currentSavedTeamName,
    saveTeamToStorage,
    loadSavedTeam,
    deleteSavedTeam,
    togglePinTeam,
    setPokemonName,
    clearTeam,
    exportTeamToClipboard,
    importTeamFromClipboard,
    hasUnsavedCurrentPokemonChanges,
  } = useTeamState(isAttacker);
  const { t } = useTranslation("app");
  const { pokemonUsageList } = usePokemonUsage();
  const [toastText, setToastText] = React.useState<string | null>(null);
  const [savedTeamsOpen, setSavedTeamsOpen] = React.useState(false);
  const [showPopular, setShowPopular] = React.useState(false);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [dragOverGapIndex, setDragOverGapIndex] = React.useState<number | null>(
    null
  );
  const [disableMouseNativeDrag, setDisableMouseNativeDrag] =
    React.useState<boolean>(false);
  const slotCardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const slotButtonRefs = React.useRef<Record<number, HTMLButtonElement | null>>({});
  const previousSlotRectsRef = React.useRef<Record<string, DOMRect>>({});
  const shouldAnimateReorderRef = React.useRef<boolean>(false);
  const touchDragIdentifierRef = React.useRef<number | null>(null);
  const touchDragSourceIndexRef = React.useRef<number | null>(null);
  const touchDragStartPointRef = React.useRef<{ x: number; y: number } | null>(
    null
  );
  const touchDragCurrentPointRef = React.useRef<{ x: number; y: number } | null>(
    null
  );
  const touchDragDelayTimerRef = React.useRef<number | null>(null);
  const touchDragAutoScrollFrameRef = React.useRef<number | null>(null);
  const isTouchDragArmedRef = React.useRef<boolean>(false);
  const isTouchDraggingRef = React.useRef<boolean>(false);
  const suppressClickRef = React.useRef<boolean>(false);
  const savedTeamsPickerRef = React.useRef<HTMLDivElement | null>(null);
  const isConfirmingSavedTeamDeleteRef = React.useRef<boolean>(false);
  const tabBase = isAttacker ? 340000 : 350000;

  const confirm = ContextAwareConfirmation.createConfirmation(
    confirmable(ConfirmDialog)
  ) as <R>(payload: ConfirmPayload<R>) => Promise<R>;

  const handleCopyTeam = React.useCallback(async () => {
    const ok = await exportTeamToClipboard();
    if (ok) setToastText(t("team.copyTeamSuccess"));
  }, [exportTeamToClipboard, t]);

  const handleImportTeam = React.useCallback(async () => {
    const ok = await importTeamFromClipboard();
    if (ok) setToastText(t("team.importTeamSuccess"));
  }, [importTeamFromClipboard, t]);

  const handleSaveTeam = React.useCallback(async () => {
    if (hasUnsavedCurrentPokemonChanges()) {
      const shouldContinue = await confirm<boolean>({
        messageKey: "team.confirmSavePaste.message",
        buttons: [
          {
            labelKey: "team.confirmSavePaste.save",
            value: true,
            tone: "primary",
          },
          {
            labelKey: "team.confirmSavePaste.editAgain",
            value: false,
            tone: "default",
          },
        ],
      });
      if (!shouldContinue) {
        return;
      }
    }
    const name = window.prompt(
      t("team.saveNamePrompt"),
      currentSavedTeamName || "",
    );
    if (name === null) {
      return;
    }
    const ok = await saveTeamToStorage(name);
    if (ok) {
      setToastText(t("team.saveTeamSuccess"));
    }
  }, [
    confirm,
    currentSavedTeamName,
    hasUnsavedCurrentPokemonChanges,
    saveTeamToStorage,
    t,
  ]);

  const handleLoadSavedTeam = React.useCallback(
    async (teamId: string) => {
      const ok = await loadSavedTeam(teamId);
      if (ok) {
        setSavedTeamsOpen(false);
        setToastText(t("team.loadTeamSuccess"));
      }
    },
    [loadSavedTeam, t],
  );

  const handleDeleteSavedTeam = React.useCallback(
    async (event: React.MouseEvent, teamId: string) => {
      event.stopPropagation();
      const nextSavedTeamCount = savedTeams.filter(
        (team) => team.id !== teamId,
      ).length;
      isConfirmingSavedTeamDeleteRef.current = true;
      const ok = await confirm<boolean>({
        messageKey: "team.confirmDeleteSavedTeam",
        buttons: [
          {
            labelKey: "team.confirmDelete.ok",
            value: true,
            tone: "danger",
          },
          {
            labelKey: "team.confirmDelete.cancel",
            value: false,
            tone: "default",
          },
        ],
      });
      isConfirmingSavedTeamDeleteRef.current = false;
      if (!ok) {
        return;
      }
      const deleted = await deleteSavedTeam(teamId);
      if (deleted) {
        if (nextSavedTeamCount === 0) {
          setSavedTeamsOpen(false);
        }
        setToastText(t("team.deleteSavedTeamSuccess"));
      }
    },
    [confirm, deleteSavedTeam, savedTeams, t],
  );

  const handleTogglePinTeam = React.useCallback(
    async (event: React.MouseEvent, teamId: string) => {
      event.stopPropagation();
      await togglePinTeam(teamId);
    },
    [togglePinTeam],
  );

  React.useEffect(() => {
    if (!savedTeamsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isConfirmingSavedTeamDeleteRef.current) {
        return;
      }
      if (
        savedTeamsPickerRef.current &&
        !savedTeamsPickerRef.current.contains(event.target as Node)
      ) {
        setSavedTeamsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [savedTeamsOpen]);

  const handleClearTeam = React.useCallback(async () => {
    const ok = await confirm<boolean>({
      messageKey: "team.confirmClearTeam",
      buttons: [
        {
          labelKey: "team.confirmClearTeam.ok",
          value: true,
          tone: "danger",
        },
        {
          labelKey: "team.confirmDelete.cancel",
          value: false,
          tone: "default",
        },
      ],
    });
    if (!ok) {
      return;
    }
    const cleared = await clearTeam();
    if (cleared) {
      setToastText(t("team.clearTeamSuccess"));
    }
  }, [clearTeam, confirm, t]);

  const handleDragStart = React.useCallback((index: number) => {
    setDraggingIndex(index);
    setDragOverGapIndex(index);
  }, []);

  const handleDragEnd = React.useCallback(() => {
    setDraggingIndex(null);
    setDragOverGapIndex(null);
  }, []);

  const clearTouchDragDelayTimer = React.useCallback(() => {
    if (touchDragDelayTimerRef.current !== null) {
      window.clearTimeout(touchDragDelayTimerRef.current);
      touchDragDelayTimerRef.current = null;
    }
  }, []);

  const clearTouchDragAutoScroll = React.useCallback(() => {
    if (touchDragAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(touchDragAutoScrollFrameRef.current);
      touchDragAutoScrollFrameRef.current = null;
    }
  }, []);

  const armTouchDrag = React.useCallback(() => {
    if (isTouchDragArmedRef.current) {
      return;
    }
    clearTouchDragDelayTimer();
    isTouchDragArmedRef.current = true;
  }, [clearTouchDragDelayTimer]);

  const startTouchDragging = React.useCallback((index: number) => {
    if (isTouchDraggingRef.current) {
      return;
    }
    isTouchDraggingRef.current = true;
    setDraggingIndex(index);
    setDragOverGapIndex(index);
  }, []);

  const cancelTouchTracking = React.useCallback(() => {
    clearTouchDragDelayTimer();
    clearTouchDragAutoScroll();
    setDisableMouseNativeDrag(false);
    touchDragIdentifierRef.current = null;
    touchDragSourceIndexRef.current = null;
    touchDragStartPointRef.current = null;
    touchDragCurrentPointRef.current = null;
    isTouchDragArmedRef.current = false;
    isTouchDraggingRef.current = false;
    handleDragEnd();
  }, [clearTouchDragAutoScroll, clearTouchDragDelayTimer, handleDragEnd]);

  const getGapIndexFromClientX = React.useCallback((clientX: number): number => {
    let fallbackGapIndex = slots.length;
    for (let index = 0; index < slots.length; index += 1) {
      const button = slotButtonRefs.current[index];
      if (!button) {
        continue;
      }
      const rect = button.getBoundingClientRect();
      fallbackGapIndex = index + 1;
      if (clientX < rect.left + rect.width / 2) {
        return index;
      }
    }
    return fallbackGapIndex;
  }, [slots.length]);

  const updateTouchDragGap = React.useCallback((clientX: number) => {
    const nextGapIndex = getGapIndexFromClientX(clientX);
    setDragOverGapIndex((prev) => (prev === nextGapIndex ? prev : nextGapIndex));
  }, [getGapIndexFromClientX]);

  const handleDropAtGap = React.useCallback(
    (gapIndex: number) => {
      if (draggingIndex === null) {
        setDraggingIndex(null);
        setDragOverGapIndex(null);
        return;
      }
      const normalizedIndex =
        draggingIndex < gapIndex ? gapIndex - 1 : gapIndex;
      if (normalizedIndex !== draggingIndex) {
        shouldAnimateReorderRef.current = true;
      }
      moveSlot(draggingIndex, gapIndex);
      setDraggingIndex(null);
      setDragOverGapIndex(null);
    },
    [draggingIndex, moveSlot]
  );

  React.useEffect(() => {
    if (draggingIndex === null) {
      return;
    }

    const handleDocumentDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      const nextGapIndex = getGapIndexFromClientX(event.clientX);
      setDragOverGapIndex((prev) =>
        prev === nextGapIndex ? prev : nextGapIndex
      );
    };

    const handleDocumentDrop = (event: DragEvent) => {
      event.preventDefault();
      handleDropAtGap(getGapIndexFromClientX(event.clientX));
    };

    document.addEventListener("dragover", handleDocumentDragOver);
    document.addEventListener("drop", handleDocumentDrop);
    return () => {
      document.removeEventListener("dragover", handleDocumentDragOver);
      document.removeEventListener("drop", handleDocumentDrop);
    };
  }, [draggingIndex, getGapIndexFromClientX, handleDropAtGap]);

  const finishTouchDrag = React.useCallback(
    (touchIdentifier: number, clientX?: number) => {
      if (touchDragIdentifierRef.current !== touchIdentifier) {
        return;
      }
      const sourceIndex = touchDragSourceIndexRef.current;
      const hasMoved = isTouchDraggingRef.current;
      clearTouchDragDelayTimer();
      clearTouchDragAutoScroll();
      setDisableMouseNativeDrag(false);
      touchDragIdentifierRef.current = null;
      touchDragSourceIndexRef.current = null;
      touchDragStartPointRef.current = null;
      touchDragCurrentPointRef.current = null;
      isTouchDragArmedRef.current = false;
      isTouchDraggingRef.current = false;

      if (sourceIndex === null) {
        handleDragEnd();
        return;
      }

      if (hasMoved && typeof clientX === "number") {
        const gapIndex = getGapIndexFromClientX(clientX);
        const normalizedIndex =
          sourceIndex < gapIndex ? gapIndex - 1 : gapIndex;
        if (normalizedIndex !== sourceIndex) {
          shouldAnimateReorderRef.current = true;
          moveSlot(sourceIndex, gapIndex);
          suppressClickRef.current = true;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 180);
        }
      }

      handleDragEnd();
    },
    [
      clearTouchDragAutoScroll,
      clearTouchDragDelayTimer,
      getGapIndexFromClientX,
      handleDragEnd,
      moveSlot,
    ]
  );

  const findTrackedTouch = React.useCallback(
    (touchList: TeamTouchListLike): TeamTouch | null => {
      const activeIdentifier = touchDragIdentifierRef.current;
      if (activeIdentifier === null) {
        return null;
      }
      for (let index = 0; index < touchList.length; index += 1) {
        const touch = touchList.item(index);
        if (touch && touch.identifier === activeIdentifier) {
          return touch;
        }
      }
      return null;
    },
    []
  );

  const getTouchForce = React.useCallback((touch: TeamTouch): number => {
    if ("force" in touch && typeof touch.force === "number") {
      return touch.force;
    }
    return 0;
  }, []);

  const handleRemoveSlot = React.useCallback(
    async (index: number) => {
      const ok = await confirm<boolean>({
        messageKey: "team.confirmDelete",
        buttons: [
          {
            labelKey: "team.confirmDelete.ok",
            value: true,
            tone: "danger",
          },
          {
            labelKey: "team.confirmDelete.cancel",
            value: false,
            tone: "default",
          },
        ],
      });
      if (ok) {
        removeSlot(index);
      }
    },
    [confirm, removeSlot]
  );

  React.useEffect(() => {
    if (!toastText) return;
    const timer = window.setTimeout(() => setToastText(null), 1600);
    return () => window.clearTimeout(timer);
  }, [toastText]);

  React.useEffect(
    () => () => {
      clearTouchDragDelayTimer();
      clearTouchDragAutoScroll();
    },
    [clearTouchDragAutoScroll, clearTouchDragDelayTimer]
  );

  React.useEffect(() => {
    const handleDocumentTouchMove = (event: TouchEvent) => {
      const touch = findTrackedTouch(event.touches);
      if (!touch) {
        return;
      }
      if (isTouchDraggingRef.current) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", handleDocumentTouchMove, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchmove", handleDocumentTouchMove);
    };
  }, [findTrackedTouch]);

  React.useEffect(() => {
    const runTouchDragAutoScroll = () => {
      const point = touchDragCurrentPointRef.current;
      if (!point || !isTouchDraggingRef.current) {
        touchDragAutoScrollFrameRef.current = null;
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const documentElement = document.documentElement;
      const maxScrollX = Math.max(
        0,
        documentElement.scrollWidth - viewportWidth
      );
      const maxScrollY = Math.max(
        0,
        documentElement.scrollHeight - viewportHeight
      );

      let deltaX = 0;
      let deltaY = 0;

      if (point.x < TEAM_TOUCH_EDGE_SCROLL_ZONE_PX && window.scrollX > 0) {
        deltaX = -Math.ceil(
          ((TEAM_TOUCH_EDGE_SCROLL_ZONE_PX - point.x) /
            TEAM_TOUCH_EDGE_SCROLL_ZONE_PX) *
            TEAM_TOUCH_EDGE_SCROLL_STEP_PX
        );
      } else if (
        point.x > viewportWidth - TEAM_TOUCH_EDGE_SCROLL_ZONE_PX &&
        window.scrollX < maxScrollX
      ) {
        deltaX = Math.ceil(
          ((point.x - (viewportWidth - TEAM_TOUCH_EDGE_SCROLL_ZONE_PX)) /
            TEAM_TOUCH_EDGE_SCROLL_ZONE_PX) *
            TEAM_TOUCH_EDGE_SCROLL_STEP_PX
        );
      }

      if (point.y < TEAM_TOUCH_EDGE_SCROLL_ZONE_PX && window.scrollY > 0) {
        deltaY = -Math.ceil(
          ((TEAM_TOUCH_EDGE_SCROLL_ZONE_PX - point.y) /
            TEAM_TOUCH_EDGE_SCROLL_ZONE_PX) *
            TEAM_TOUCH_EDGE_SCROLL_STEP_PX
        );
      } else if (
        point.y > viewportHeight - TEAM_TOUCH_EDGE_SCROLL_ZONE_PX &&
        window.scrollY < maxScrollY
      ) {
        deltaY = Math.ceil(
          ((point.y - (viewportHeight - TEAM_TOUCH_EDGE_SCROLL_ZONE_PX)) /
            TEAM_TOUCH_EDGE_SCROLL_ZONE_PX) *
            TEAM_TOUCH_EDGE_SCROLL_STEP_PX
        );
      }

      if (deltaX !== 0 || deltaY !== 0) {
        window.scrollBy(deltaX, deltaY);
        updateTouchDragGap(point.x);
      }

      touchDragAutoScrollFrameRef.current = window.requestAnimationFrame(
        runTouchDragAutoScroll
      );
    };

    if (!isTouchDraggingRef.current) {
      clearTouchDragAutoScroll();
      return;
    }

    if (touchDragAutoScrollFrameRef.current === null) {
      touchDragAutoScrollFrameRef.current = window.requestAnimationFrame(
        runTouchDragAutoScroll
      );
    }

    return () => {
      clearTouchDragAutoScroll();
    };
  }, [clearTouchDragAutoScroll, draggingIndex, updateTouchDragGap]);

  React.useLayoutEffect(() => {
    const shouldAnimate = shouldAnimateReorderRef.current;
    const nextRects: Record<string, DOMRect> = {};
    slots.forEach((slot) => {
      if (!slot?.id) {
        return;
      }
      const element = slotCardRefs.current[slot.id];
      if (!element) {
        return;
      }
      const nextRect = element.getBoundingClientRect();
      nextRects[slot.id] = nextRect;
      if (!shouldAnimate) {
        return;
      }
      const previousRect = previousSlotRectsRef.current[slot.id];
      if (!previousRect) {
        return;
      }
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }
      element.animate(
        [
          {
            transform: `translate(${deltaX}px, ${deltaY}px)`,
          },
          {
            transform: "translate(0px, 0px)",
          },
        ],
        {
          duration: 240,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }
      );
    });
    previousSlotRectsRef.current = nextRects;
    shouldAnimateReorderRef.current = false;
  }, [slots]);

  const renderDropGap = React.useCallback(
    (gapIndex: number) => (
      <div
        key={`gap-${gapIndex}`}
        className={`team-drop-gap ${
          draggingIndex !== null ? "team-drop-gap--visible" : ""
        } ${dragOverGapIndex === gapIndex ? "team-drop-gap--active" : ""}`}
        onDragOver={(event) => {
          if (draggingIndex === null) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (dragOverGapIndex !== gapIndex) {
            setDragOverGapIndex(gapIndex);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleDropAtGap(gapIndex);
        }}
      />
    ),
    [dragOverGapIndex, draggingIndex, handleDropAtGap]
  );

  return (
    <>
      <div
        className={`p-team-area p-team-${isAttacker ? "attacker" : "defender"}`}
      >
        <div className="team-grid">
          <div className={`team-slots-row${(!isAttacker && showPopular) ? " team-slots-row--popular" : ""}`}>
            {(!isAttacker && showPopular) ? (
              pokemonUsageList.slice(0, 20).map((usage) => {
                const imgUrl = ShowdownDataService.getPokemonImgUrl(usage.pokemon, true);
                return (
                  <button
                    key={usage.pokemon}
                    type="button"
                    className="team-popular-slot"
                    title={`#${usage.rank} ${usage.pokemon} ${usage.usage.toFixed(1)}%`}
                    onClick={() => setPokemonName(usage.pokemon)}
                  >
                    {imgUrl && (
                      <SmartImage
                        className="team-popular-slot__img"
                        src={imgUrl}
                        alt={usage.pokemon}
                        loading="lazy"
                      />
                    )}
                  </button>
                );
              })
            ) : (
              <>
            {renderDropGap(0)}
            {slots
              .map((s, i) => ({ slot: s, index: i }))
              .map(({ slot, index }) => {
              const slotKey = slot?.id ?? `empty-${index}`;
              const img = slot?.imgURL || "";
              const itemImg = slot?.itemImgURL || "";
              const teraTypeImg = slot?.teraTypeImgURL || "";
              const isEmpty = !slot || (!slot.pasteText && !slot.imgURL);
              const selected = selectedIndex === index;
              const isDragging = draggingIndex === index;
              return (
                <React.Fragment key={slotKey}>
                  <div
                    ref={(element) => {
                      slotCardRefs.current[slotKey] = element;
                    }}
                    className={`team-slot-card ${
                      selected ? "team-slot-card--selected" : ""
                    } ${isEmpty ? "team-slot-card--empty" : ""} ${
                      isDragging ? "team-slot-card--dragging" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={`team-slot ${
                        selected ? "team-slot--selected" : ""
                      } ${isEmpty ? "team-slot--empty" : ""}`}
                      onClick={() => {
                        if (suppressClickRef.current) {
                          return;
                        }
                        selectSlot(index);
                      }}
                      aria-label={""}
                      tabIndex={tabBase + 1 + index}
                      draggable={!isEmpty && !disableMouseNativeDrag}
                      ref={(element) => {
                        slotButtonRefs.current[index] = element;
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                      }}
                      onDragStart={(event) => {
                        if (isEmpty) {
                          event.preventDefault();
                          return;
                        }
                        if (touchDragIdentifierRef.current !== null) {
                          event.preventDefault();
                          return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", `${index}`);
                        event.dataTransfer.setDragImage(
                          event.currentTarget,
                          rect.width / 2,
                          rect.height / 2
                        );
                        handleDragStart(index);
                      }}
                      onDragOver={(event) => {
                        if (draggingIndex === null) {
                          return;
                        }
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        const rect = event.currentTarget.getBoundingClientRect();
                        const nextGapIndex =
                          event.clientX - rect.left < rect.width / 2
                            ? index
                            : index + 1;
                        if (dragOverGapIndex !== nextGapIndex) {
                          setDragOverGapIndex(nextGapIndex);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        const nextGapIndex =
                          event.clientX - rect.left < rect.width / 2
                            ? index
                            : index + 1;
                        handleDropAtGap(nextGapIndex);
                      }}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(event) => {
                        if (isEmpty) {
                          return;
                        }
                        const touch = event.changedTouches.item(0);
                        if (!touch) {
                          return;
                        }
                        touchDragIdentifierRef.current = touch.identifier;
                        touchDragSourceIndexRef.current = index;
                        touchDragStartPointRef.current = {
                          x: touch.clientX,
                          y: touch.clientY,
                        };
                        touchDragCurrentPointRef.current = {
                          x: touch.clientX,
                          y: touch.clientY,
                        };
                        clearTouchDragDelayTimer();
                        setDisableMouseNativeDrag(true);
                        isTouchDragArmedRef.current = false;
                        isTouchDraggingRef.current = false;
                        touchDragDelayTimerRef.current = window.setTimeout(() => {
                          if (touchDragSourceIndexRef.current === index) {
                            armTouchDrag();
                          }
                        }, TEAM_TOUCH_DRAG_DELAY_MS);
                      }}
                      onTouchMove={(event) => {
                        const touch = findTrackedTouch(event.touches);
                        if (!touch) {
                          return;
                        }
                        const startPoint = touchDragStartPointRef.current;
                        if (!startPoint) {
                          return;
                        }
                        touchDragCurrentPointRef.current = {
                          x: touch.clientX,
                          y: touch.clientY,
                        };
                        const distance = Math.hypot(
                          touch.clientX - startPoint.x,
                          touch.clientY - startPoint.y
                        );
                        if (!isTouchDragArmedRef.current) {
                          if (getTouchForce(touch) >= TEAM_TOUCH_FORCE_ARM_THRESHOLD) {
                            armTouchDrag();
                          }
                        }
                        if (!isTouchDragArmedRef.current) {
                          if (distance > TEAM_TOUCH_CANCEL_MOVE_PX) {
                            cancelTouchTracking();
                          }
                          return;
                        }
                        if (!isTouchDraggingRef.current) {
                          if (distance < TEAM_TOUCH_START_DRAG_MOVE_PX) {
                            return;
                          }
                          startTouchDragging(index);
                        }
                        updateTouchDragGap(touch.clientX);
                      }}
                      onTouchEnd={(event) => {
                        const touch = findTrackedTouch(event.changedTouches);
                        if (!touch) {
                          cancelTouchTracking();
                          return;
                        }
                        finishTouchDrag(touch.identifier, touch.clientX);
                      }}
                      onTouchCancel={(event) => {
                        const touch = findTrackedTouch(event.changedTouches);
                        if (!touch) {
                          cancelTouchTracking();
                          return;
                        }
                        finishTouchDrag(touch.identifier);
                      }}
                    >
                      <div className="team-tab">
                        {img ? (
                          <SmartImage
                            className="team-slot__image"
                            src={img}
                            alt={""}
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <>
                            <div className="team-slot__placeholder" />
                            <span className="team-slot__new-tag">
                              {t("team.new")}
                            </span>
                          </>
                        )}
                        {itemImg && (
                          <SmartImage
                            className="team-slot__item"
                            src={itemImg}
                            alt=""
                            loading="lazy"
                            draggable={false}
                          />
                        )}
                        {teraTypeImg && (
                          <SmartImage
                            className="team-slot__tera"
                            src={teraTypeImg}
                            alt=""
                            loading="lazy"
                            draggable={false}
                          />
                        )}
                      </div>
                    </button>
                    {!isEmpty && (
                      <button
                        type="button"
                        className="team-slot__remove"
                        title={t("team.removePokemon")}
                        aria-label={t("team.removePokemon")}
                        onClick={() => {
                          void handleRemoveSlot(index);
                        }}
                      >
                        <FiTrash2 className="team-slot__remove-icon" />
                      </button>
                    )}
                  </div>
                  {renderDropGap(index + 1)}
                </React.Fragment>
              );
            })}
            {slots.length < 6 && (
              <div
                className="team-add"
                onClick={() => addSlot()}
                aria-label={t("team.addPokemon")}
                title={t("team.addPokemon")}
                role="button"
                tabIndex={tabBase + 20}
              >
                <FiPlus className="team-add-icon" />
              </div>
            )}
              </>
            )}
          </div>
          <div className="team-actions-col">
            <button
              type="button"
              className="team-action-button team-import"
              title={t("team.importTeam")}
              aria-label={t("team.importTeam")}
              onClick={handleImportTeam}
              tabIndex={tabBase + 21}
            >
              <FiArrowLeft />
            </button>
            <button
              type="button"
              className="team-action-button team-save"
              title={t("team.saveTeam")}
              aria-label={t("team.saveTeam")}
              onClick={handleSaveTeam}
              tabIndex={tabBase + 23}
            >
              <FiSave />
            </button>
            <button
              type="button"
              className="team-action-button team-copy"
              title={t("team.copyTeam")}
              aria-label={t("team.copyTeam")}
              onClick={handleCopyTeam}
              tabIndex={tabBase + 22}
            >
              <FiCopy />
            </button>
            <div className="team-saved-picker" ref={savedTeamsPickerRef}>
              <button
                type="button"
                className="team-action-button team-load"
                title={t("team.loadTeam")}
                aria-label={t("team.loadTeam")}
                onClick={() => setSavedTeamsOpen((open) => !open)}
                tabIndex={tabBase + 24}
              >
                <FiFolder />
              </button>
              {savedTeamsOpen && (
                <div className="team-saved-menu">
                  {savedTeams.length > 0 ? (
                    savedTeams.map((team) => (
                      <div
                        key={team.id}
                        role="button"
                        tabIndex={0}
                        className="team-saved-item"
                        onClick={() => {
                          void handleLoadSavedTeam(team.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleLoadSavedTeam(team.id);
                          }
                        }}
                      >
                        <span className="team-saved-item__name">
                          {team.name}
                        </span>
                        <span className="team-saved-item__pokemons">
                          {team.pokemons.map((pokemon) => (
                            <span
                              key={pokemon.id}
                              className="team-saved-preview"
                            >
                              {pokemon.imgURL && (
                                <SmartImage
                                  className="team-saved-preview__pokemon"
                                  src={pokemon.imgURL}
                                  alt=""
                                  loading="lazy"
                                />
                              )}
                              {pokemon.itemImgURL && (
                                <SmartImage
                                  className="team-saved-preview__item"
                                  src={pokemon.itemImgURL}
                                  alt=""
                                  loading="lazy"
                                />
                              )}
                              {pokemon.teraTypeImgURL && (
                                <SmartImage
                                  className="team-saved-preview__tera"
                                  src={pokemon.teraTypeImgURL}
                                  alt=""
                                  loading="lazy"
                                />
                              )}
                            </span>
                          ))}
                        </span>
                        <span
                          role="button"
                          tabIndex={-1}
                          className={`team-saved-item__pin${team.pinned ? " team-saved-item__pin--active" : ""}`}
                          title={team.pinned ? "取消置顶" : "置顶"}
                          onClick={(event) => {
                            void handleTogglePinTeam(event, team.id);
                          }}
                        >
                          <FiBookmark />
                        </span>
                        <span
                          role="button"
                          tabIndex={-1}
                          className="team-saved-item__delete"
                          title={t("team.deleteSavedTeam")}
                          aria-label={t("team.deleteSavedTeam")}
                          onClick={(event) => {
                            void handleDeleteSavedTeam(event, team.id);
                          }}
                        >
                          <FiX />
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="team-saved-empty">
                      {t("team.noSavedTeams")}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isAttacker && (
              <button
                type="button"
                className={`team-action-button${showPopular ? " team-popular-toggle--active" : ""}`}
                title={showPopular ? "显示我的队伍" : "热门宝可梦"}
                onClick={() => setShowPopular((v) => !v)}
                tabIndex={tabBase + 26}
              >
                <FiTrendingUp />
              </button>
            )}
            <button
              type="button"
              className="team-action-button team-clear"
              title={t("team.clearTeam")}
              aria-label={t("team.clearTeam")}
              onClick={handleClearTeam}
              tabIndex={tabBase + 25}
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      </div>
      {toastText &&
        createPortal(
          <div className="team-actions-toast" role="status" aria-live="polite">
            {toastText}
          </div>,
          document.body
        )}
    </>
  );
};

export default Team;

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePokemonState } from "./PokemonStateContext";
import { confirmable, ContextAwareConfirmation } from "react-confirm";
import ConfirmDialog, {
  type ConfirmPayload,
} from "../ui/widgets/ConfirmDialog/ConfirmDialog";
import { ShowdownDataService } from "../services/showdown.data.service";
import { Pokemon } from "../models/pokemon.calculator.model";
import { useFormats } from "./FormatsContext";

type SaveEditResponse = "save" | "discard" | "edit";

interface TeamSlot {
  id: string;
  pasteText: string | undefined;
  imgURL: string | undefined;
  itemImgURL: string | undefined;
  teraTypeImgURL: string | undefined;
}

export interface SavedTeamPreviewPokemon {
  id: string;
  imgURL: string | undefined;
  itemImgURL: string | undefined;
  teraTypeImgURL: string | undefined;
}

export interface SavedTeam {
  id: string;
  name: string;
  pasteTexts: string[];
  pokemons: SavedTeamPreviewPokemon[];
  createdAt: number;
}

interface TeamState {
  slots: (TeamSlot | undefined)[];
  selectedIndex: number;
  savedTeams: SavedTeam[];
  currentSavedTeamName: string | undefined;
  selectSlot: (index: number) => void;
  moveSlot: (fromIndex: number, toIndex: number) => void;
  addSlot: () => void;
  removeSlot: (index: number) => void;
  saveTeamToStorage: (name: string) => Promise<boolean>;
  loadSavedTeam: (teamId: string) => Promise<boolean>;
  deleteSavedTeam: (teamId: string) => Promise<boolean>;
  clearTeam: () => Promise<boolean>;
  importTeamFromText: (text: string) => Promise<boolean>;
  exportTeamToClipboard: () => Promise<boolean>;
  importTeamFromClipboard: () => Promise<boolean>;
  hasUnsavedCurrentPokemonChanges: () => boolean;
}

const AttackerTeamContext = createContext<TeamState | undefined>(undefined);
const DefenderTeamContext = createContext<TeamState | undefined>(undefined);
const SAVED_TEAM_STORAGE_VERSION = 1;
const SAVED_TEAM_STORAGE_KEY = `vg-calc.savedTeams.v${SAVED_TEAM_STORAGE_VERSION}`;
const SAVED_TEAMS_CHANGED_EVENT = "vgCalcSavedTeamsChanged";
const MAX_SAVED_TEAMS = 10;
const MAX_SAVED_TEAM_NAME_LENGTH = 100;

const getDeprecatedSavedTeamStorageKey = (side: "attacker" | "defender"): string =>
  `vg-calc.savedTeams.v${SAVED_TEAM_STORAGE_VERSION}.${side}`;

const normalizeSavedTeams = (parsed: unknown): SavedTeam[] => {
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .filter((team): team is SavedTeam => {
      return (
        typeof team === "object" &&
        team !== null &&
        typeof (team as SavedTeam).id === "string" &&
        typeof (team as SavedTeam).name === "string" &&
        Array.isArray((team as SavedTeam).pasteTexts)
      );
    })
    .map((team) => ({
      ...team,
      pokemons: Array.isArray(team.pokemons) ? team.pokemons : [],
      createdAt:
        typeof team.createdAt === "number" ? team.createdAt : Date.now(),
    }));
};

const readSavedTeamsByKey = (storageKey: string): SavedTeam[] => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    return normalizeSavedTeams(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
};

const useTeamLogic = (side: "attacker" | "defender"): TeamState => {
  const {
    displayPokemon,
    importPokemonFromPasteText,
    item,
    teraType,
    pokemonSpecies,
    setPokemonName,
    setDisableAutoSelect,
    clearPokemonState,
  } = usePokemonState(side === "attacker");
  const { currentGen, currentGame } = useFormats();
  const isChampionsGame = currentGame === "Champions";

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [slots, setSlots] = useState<(TeamSlot | undefined)[]>([undefined]);
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [currentSavedTeam, setCurrentSavedTeam] = useState<
    Pick<SavedTeam, "id" | "name"> | undefined
  >(undefined);

  const opQueueRef = useRef<Promise<void>>(Promise.resolve());
  const slotIdRef = useRef<number>(0);
  const isApplyingSelectedSlotRef = useRef<boolean>(false);

  const lastImportedPasteTextRef = useRef<string | undefined>(undefined);
  const selectedIndexRef = useRef<number>(selectedIndex);
  const selectedSlotPasteTextRef = useRef<string | undefined>(
    slots[selectedIndex]?.pasteText,
  );

  const readSavedTeamsFromStorage = useCallback((): SavedTeam[] => {
    try {
      const globalRaw = window.localStorage.getItem(SAVED_TEAM_STORAGE_KEY);
      if (globalRaw !== null) {
        return normalizeSavedTeams(JSON.parse(globalRaw) as unknown)
          .slice(0, MAX_SAVED_TEAMS)
          .sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch {
      return [];
    }

    const merged = [
      ...readSavedTeamsByKey(getDeprecatedSavedTeamStorageKey("attacker")),
      ...readSavedTeamsByKey(getDeprecatedSavedTeamStorageKey("defender")),
    ];
    const seen = new Set<string>();
    const uniqueTeams: SavedTeam[] = [];
    for (const team of merged) {
      const key = team.id || team.name;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      uniqueTeams.push(team);
    }
    return uniqueTeams
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SAVED_TEAMS);
  }, []);

  const writeSavedTeamsToStorage = useCallback(
    (nextTeams: SavedTeam[]): boolean => {
      try {
        window.localStorage.setItem(
          SAVED_TEAM_STORAGE_KEY,
          JSON.stringify(nextTeams),
        );
        setSavedTeams(nextTeams);
        window.dispatchEvent(new Event(SAVED_TEAMS_CHANGED_EVENT));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  async function runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const prev = opQueueRef.current;
    let release: () => void;
    opQueueRef.current = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  const enqueueExclusive = (fn: () => Promise<void> | void): void => {
    void runExclusive(async () => {
      await fn();
    });
  };

  const createSlotId = useCallback((): string => {
    const nextId = slotIdRef.current;
    slotIdRef.current += 1;
    return `${side}-team-slot-${nextId}`;
  }, [side]);

  const normalizePasteText = useCallback(
    (pasteText?: string): string | undefined => {
      const trimmedText = pasteText?.trim();
      if (!trimmedText) {
        return undefined;
      }
      try {
        const pokemon = Pokemon.importFromPasteText(currentGen, trimmedText, {
          useChampionsEVs: isChampionsGame,
        })[0];
        return (
          pokemon?.exportToPasteText({
            useChampionsEVs: isChampionsGame,
          })?.trim() || trimmedText
        );
      } catch {
        return trimmedText;
      }
    },
    [currentGen, isChampionsGame],
  );

  const getCurrentExportedPasteText = useCallback((): string | undefined => {
    return (
      displayPokemon
        ?.exportToPasteText({
          useChampionsEVs: isChampionsGame,
        })
        ?.trim() || undefined
    );
  }, [displayPokemon, isChampionsGame]);

  const hasCurrentPokemonChanged = useCallback(
    (savedText?: string): boolean => {
      const currentText = getCurrentExportedPasteText();
      const normalizedSavedText = normalizePasteText(savedText);
      if (!currentText) {
        return false;
      }
      return currentText !== normalizedSavedText;
    },
    [getCurrentExportedPasteText, normalizePasteText],
  );

  const hasUnsavedCurrentPokemonChanges = useCallback((): boolean => {
    return hasCurrentPokemonChanged(slots[selectedIndex]?.pasteText);
  }, [hasCurrentPokemonChanged, selectedIndex, slots]);

  const buildSlotFromPasteText = (
    pasteText?: string,
    existingId?: string,
  ): TeamSlot | undefined => {
    if (!pasteText?.trim()) {
      return undefined;
    }
    try {
      const pokemon = Pokemon.importFromPasteText(currentGen, pasteText, {
        useChampionsEVs: isChampionsGame,
      })[0];
      const pokemonName = pokemon?.species.name;
      const itemName =
        pokemon?.item && pokemon.item !== ShowdownDataService.NoItem.name
          ? pokemon.item
          : undefined;
      const teraTypeName = pokemon?.settingTeraType;
      return {
        id: existingId ?? createSlotId(),
        pasteText,
        imgURL: ShowdownDataService.getPokemonImgUrl(pokemonName),
        itemImgURL: ShowdownDataService.getItemImgUrl(itemName),
        teraTypeImgURL: ShowdownDataService.getTeraTypeImgUrl(teraTypeName),
      };
    } catch {
      return {
        id: existingId ?? createSlotId(),
        pasteText,
        imgURL: undefined,
        itemImgURL: undefined,
        teraTypeImgURL: undefined,
      };
    }
  };

  const buildSlotFromCurrentState = (
    pasteText?: string,
    existingId?: string,
  ): TeamSlot | undefined => {
    const pokemonName = pokemonSpecies?.value?.name;
    if (!pasteText?.trim() && !pokemonName) {
      return undefined;
    }
    const itemName =
      item?.name && item.name !== ShowdownDataService.NoItem.name
        ? item.name
        : undefined;
    return {
      id: existingId ?? createSlotId(),
      pasteText,
      imgURL: ShowdownDataService.getPokemonImgUrl(pokemonName),
      itemImgURL: ShowdownDataService.getItemImgUrl(itemName),
      teraTypeImgURL: ShowdownDataService.getTeraTypeImgUrl(teraType),
    };
  };

  const setSlotAtIndex = useCallback((
    index: number,
    nextSlot: TeamSlot | undefined,
  ): void => {
    setSlots((prev) => {
      if (index < 0 || index >= prev.length) {
        return prev;
      }
      const currentSlot = prev[index];
      const normalizedSlot = nextSlot
        ? {
            ...nextSlot,
            id: currentSlot?.id ?? nextSlot.id ?? createSlotId(),
          }
        : undefined;
      if (
        currentSlot?.id === normalizedSlot?.id &&
        currentSlot?.pasteText === normalizedSlot?.pasteText &&
        currentSlot?.imgURL === normalizedSlot?.imgURL &&
        currentSlot?.itemImgURL === normalizedSlot?.itemImgURL &&
        currentSlot?.teraTypeImgURL === normalizedSlot?.teraTypeImgURL
      ) {
        return prev;
      }
      const next = [...prev];
      next[index] = normalizedSlot;
      return next;
    });
  }, [createSlotId]);

  const confirm = ContextAwareConfirmation.createConfirmation(
    confirmable(ConfirmDialog)
  ) as <R>(payload: ConfirmPayload<R>) => Promise<R>;

  const ensureSaveCurrentIfDirty = async (): Promise<
    SaveEditResponse | "none"
  > => {
    const currentText = getCurrentExportedPasteText();
    const savedText = slots[selectedIndex]?.pasteText;
    if (currentText && hasCurrentPokemonChanged(savedText)) {
      const action = await confirm<SaveEditResponse>({
        messageKey: "team.confirmSavePaste.message",
        buttons: [
          {
            labelKey: "team.confirmSavePaste.save",
            value: "save",
            tone: "primary",
          },
          {
            labelKey: "team.confirmSavePaste.discard",
            value: "discard",
            tone: "danger",
          },
          {
            labelKey: "team.confirmSavePaste.editAgain",
            value: "edit",
            tone: "default",
          },
        ],
      });
      if (action === "save") {
        lastImportedPasteTextRef.current = currentText;
        setSlotAtIndex(selectedIndex, buildSlotFromCurrentState(currentText));
      }
      return action;
    }
    return "none";
  };

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    setSavedTeams(readSavedTeamsFromStorage());
  }, [readSavedTeamsFromStorage]);

  useEffect(() => {
    const handleSavedTeamsChanged = () => {
      setSavedTeams(readSavedTeamsFromStorage());
    };
    window.addEventListener(SAVED_TEAMS_CHANGED_EVENT, handleSavedTeamsChanged);
    window.addEventListener("storage", handleSavedTeamsChanged);
    return () => {
      window.removeEventListener(
        SAVED_TEAMS_CHANGED_EVENT,
        handleSavedTeamsChanged,
      );
      window.removeEventListener("storage", handleSavedTeamsChanged);
    };
  }, [readSavedTeamsFromStorage]);

  useEffect(() => {
    selectedSlotPasteTextRef.current = slots[selectedIndex]?.pasteText;
  }, [selectedIndex, slots]);

  useEffect(() => {
    let isCancelled = false;
    if (selectedIndex >= slots.length) {
      isApplyingSelectedSlotRef.current = false;
      return;
    }
    const pasteText = slots[selectedIndex]?.pasteText;

    const applySelectedSlot = async (): Promise<void> => {
      isApplyingSelectedSlotRef.current = true;

      // 避免在保存当前配置时重复导入
      if (pasteText === lastImportedPasteTextRef.current) {
        if (!isCancelled) {
          isApplyingSelectedSlotRef.current = false;
        }
        return;
      }
      lastImportedPasteTextRef.current = pasteText;

      if (pasteText) {
        setDisableAutoSelect(true);
        await importPokemonFromPasteText(pasteText);
      } else {
        setPokemonName(undefined);
      }

      if (!isCancelled) {
        isApplyingSelectedSlotRef.current = false;
      }
    };

    void applySelectedSlot();

    return () => {
      isCancelled = true;
    };
  }, [selectedIndex, slots, setDisableAutoSelect, importPokemonFromPasteText, setPokemonName]);

  useEffect(() => {
    if (isApplyingSelectedSlotRef.current) {
      return;
    }
    const currentIndex = selectedIndexRef.current;
    if (currentIndex < 0) {
      return;
    }
    const savedText = selectedSlotPasteTextRef.current;
    const pokemonName = pokemonSpecies?.value?.name;
    const itemName =
      item?.name && item.name !== ShowdownDataService.NoItem.name
        ? item.name
        : undefined;
    const existingId = slots[currentIndex]?.id;
    const nextSlot =
      !savedText?.trim() && !pokemonName
        ? undefined
        : {
            id: existingId ?? createSlotId(),
            pasteText: savedText,
            imgURL: ShowdownDataService.getPokemonImgUrl(pokemonName),
            itemImgURL: ShowdownDataService.getItemImgUrl(itemName),
            teraTypeImgURL: ShowdownDataService.getTeraTypeImgUrl(teraType),
          };
    if (!nextSlot && savedText) {
      return;
    }
    setSlotAtIndex(currentIndex, nextSlot);
  }, [createSlotId, item, pokemonSpecies, setSlotAtIndex, slots, teraType]);

  const selectSlot = (index: number) => {
    if (selectedIndex === index) return;
    enqueueExclusive(async () => {
      isApplyingSelectedSlotRef.current = true;
      const prevIndex = selectedIndex;
      const prevSaved = slots[prevIndex]?.pasteText;
      const currentText = getCurrentExportedPasteText();
      if (currentText && hasCurrentPokemonChanged(prevSaved)) {
        const decision = await ensureSaveCurrentIfDirty();
        if (decision === "edit") {
          isApplyingSelectedSlotRef.current = false;
          return;
        }
        if (decision === "discard") {
          setSlotAtIndex(prevIndex, buildSlotFromPasteText(prevSaved));
        }
      }
      setSlots((prev) => {
        let targetIndex = Math.max(
          0,
          Math.min(index, Math.max(0, slots.length - 1))
        );
        let next = [...prev];
        const shouldRemovePrev = !next[prevIndex] && !currentText && !prevSaved;

        if (shouldRemovePrev) {
          next.splice(prevIndex, 1);
          if (targetIndex > prevIndex)
            targetIndex = Math.max(0, targetIndex - 1);
        }
        setSelectedIndex(targetIndex);
        return next;
      });
    });
  };

  const addSlot = () => {
    enqueueExclusive(async () => {
      const prevIndex = selectedIndex;
      const prevSaved = slots[prevIndex]?.pasteText;
      const currentText = getCurrentExportedPasteText();
      if (!currentText && !prevSaved) return;
      if (currentText && hasCurrentPokemonChanged(prevSaved)) {
        const decision = await ensureSaveCurrentIfDirty();
        if (decision === "edit") {
          return;
        } else if (decision === "discard" && !prevSaved) {
          setSlotAtIndex(prevIndex, undefined);
          return;
        } else if (decision === "discard") {
          setSlotAtIndex(prevIndex, buildSlotFromPasteText(prevSaved));
        }
      }
      setSlots((prev) => {
        if (prev.length >= 6) return prev;
        let next = [...prev];
        const shouldRemovePrev = !next[prevIndex] && !currentText && !prevSaved;

        if (shouldRemovePrev && next.length > 0) {
          next.splice(prevIndex, 1);
        }

        next = [...next, undefined];
        const targetIndex = Math.max(0, next.length - 1);
        setSelectedIndex(targetIndex);
        return next;
      });
    });
  };

  const moveSlot = (fromIndex: number, insertIndex: number) => {
    enqueueExclusive(() => {
      setSlots((prev) => {
        if (
          fromIndex < 0 ||
          insertIndex < 0 ||
          fromIndex >= prev.length ||
          insertIndex > prev.length
        ) {
          return prev;
        }
        const normalizedIndex =
          fromIndex < insertIndex ? insertIndex - 1 : insertIndex;
        if (normalizedIndex === fromIndex) {
          return prev;
        }

        const nextWithSourceIndex = prev.map((slot, index) => ({
          slot,
          sourceIndex: index,
        }));
        const [movedSlot] = nextWithSourceIndex.splice(fromIndex, 1);
        nextWithSourceIndex.splice(normalizedIndex, 0, movedSlot);

        setSelectedIndex((currentSelectedIndex) =>
          nextWithSourceIndex.findIndex(
            ({ sourceIndex }) => sourceIndex === currentSelectedIndex
          )
        );
        return nextWithSourceIndex.map(({ slot }) => slot);
      });
    });
  };

  const removeSlot = (index: number) => {
    enqueueExclusive(async () => {
      setSlots((prev) => {
        let next: (TeamSlot | undefined)[];
        if (prev.length <= 1) {
          next = [...prev];
          next[0] = undefined;
          if (index === selectedIndexRef.current) {
            lastImportedPasteTextRef.current = undefined;
            setPokemonName(undefined);
            clearPokemonState();
            setCurrentSavedTeam(undefined);
          }
        } else {
          next = [...prev];
          next.splice(index, 1);
        }
        const targetIndex = Math.max(
          0,
          Math.min(index, Math.max(0, next.length - 1))
        );
        setSelectedIndex(targetIndex);
        return next;
      });
    });
  };

  const getCurrentTeamSnapshot = (): (TeamSlot | undefined)[] => {
    const snapshot = [...slots];
    const currentText = displayPokemon?.exportToPasteText({
      useChampionsEVs: isChampionsGame,
    });
    if (currentText?.trim()) {
      snapshot[selectedIndex] = buildSlotFromCurrentState(
        currentText,
        snapshot[selectedIndex]?.id,
      );
    }
    return snapshot;
  };

  const saveTeamToStorage = async (name: string): Promise<boolean> => {
    const normalizedName = name.trim().slice(0, MAX_SAVED_TEAM_NAME_LENGTH);
    if (!normalizedName) {
      return false;
    }

    return await runExclusive(async () => {
      const snapshot = getCurrentTeamSnapshot();
      const filledSlots = snapshot.filter(
        (slot): slot is TeamSlot => !!slot?.pasteText?.trim(),
      );
      if (filledSlots.length === 0) {
        return false;
      }

      const now = Date.now();
      const existingTeams = readSavedTeamsFromStorage();
      const existingTeamByName = existingTeams.find(
        (team) => team.name === normalizedName,
      );
      const nextTeamId = existingTeamByName?.id ?? `${side}-saved-team-${now}`;
      const nextTeam: SavedTeam = {
        id: nextTeamId,
        name: normalizedName,
        pasteTexts: filledSlots.map((slot) => slot.pasteText!),
        pokemons: filledSlots.map((slot, index) => ({
          id: `${nextTeamId}-pokemon-${index}`,
          imgURL: slot.imgURL,
          itemImgURL: slot.itemImgURL,
          teraTypeImgURL: slot.teraTypeImgURL,
        })),
        createdAt: existingTeamByName?.createdAt ?? now,
      };

      const nextTeams = [
        nextTeam,
        ...existingTeams.filter((team) => team.name !== normalizedName),
      ].slice(0, MAX_SAVED_TEAMS);
      const ok = writeSavedTeamsToStorage(nextTeams);
      if (ok) {
        setCurrentSavedTeam({ id: nextTeam.id, name: nextTeam.name });
      }
      return ok;
    });
  };

  const loadSavedTeam = async (teamId: string): Promise<boolean> => {
    const team = readSavedTeamsFromStorage().find((item) => item.id === teamId);
    if (!team || team.pasteTexts.length === 0) {
      return false;
    }

    return await runExclusive(async () => {
      const nextSlots = team.pasteTexts
        .slice(0, 6)
        .map((pasteText) => buildSlotFromPasteText(pasteText));
      setSelectedIndex(0);
      setSlots(nextSlots.length > 0 ? nextSlots : [undefined]);
      setCurrentSavedTeam({ id: team.id, name: team.name });
      return true;
    });
  };

  const deleteSavedTeam = async (teamId: string): Promise<boolean> => {
    const existingTeams = readSavedTeamsFromStorage();
    const nextTeams = existingTeams.filter((team) => team.id !== teamId);
    if (nextTeams.length === existingTeams.length) {
      return false;
    }
    const ok = writeSavedTeamsToStorage(nextTeams);
    if (ok && currentSavedTeam?.id === teamId) {
      setCurrentSavedTeam(undefined);
    }
    return ok;
  };

  const clearTeam = async (): Promise<boolean> => {
    return await runExclusive(async () => {
      lastImportedPasteTextRef.current = undefined;
      setSelectedIndex(0);
      setSlots([undefined]);
      setPokemonName(undefined);
      clearPokemonState();
      setCurrentSavedTeam(undefined);
      return true;
    });
  };

  const importTeamFromText = async (text: string): Promise<boolean> => {
    if (!text.trim()) {
      return false;
    }
    return await runExclusive(async () => {
      try {
        const pokemons = Pokemon.importFromPasteText(currentGen, text, {
          useChampionsEVs: isChampionsGame,
        });
        if (!pokemons || pokemons.length === 0) return false;
        const nextSlots: (TeamSlot | undefined)[] = pokemons
          .slice(0, 6)
          .map((pokemon) =>
            buildSlotFromPasteText(
              pokemon.exportToPasteText({
                useChampionsEVs: isChampionsGame,
              }),
            ),
          );
        const firstPasteText = nextSlots[0]?.pasteText;
        setSelectedIndex(0);
        setSlots(nextSlots.length > 0 ? nextSlots : [undefined]);
        setCurrentSavedTeam(undefined);
        if (firstPasteText) {
          selectedSlotPasteTextRef.current = firstPasteText;
          lastImportedPasteTextRef.current = firstPasteText;
          setDisableAutoSelect(true);
          await importPokemonFromPasteText(firstPasteText);
        }
        return true;
      } catch {
        return false;
      }
    });
  };

  const exportTeamToClipboard = async (): Promise<boolean> => {
    const prevIndex = selectedIndex;
    const prevSaved = slots[prevIndex]?.pasteText;
    const currentText = getCurrentExportedPasteText();
    let decision: SaveEditResponse | "none" = "none";
    if (currentText && hasCurrentPokemonChanged(prevSaved)) {
      decision = await ensureSaveCurrentIfDirty();
      if (decision === "edit") {
        return false;
      }
      if (decision === "discard") {
        await runExclusive(async () => {
          const t = slots[prevIndex]?.pasteText;
          if (t && t.length > 0) {
            setDisableAutoSelect(true);
            importPokemonFromPasteText(t);
          } else {
            setPokemonName(undefined);
          }
        });
      }
    }
    const snapshot = (() => {
      if (decision === "save" && currentText) {
        const next = [...slots];
        next[prevIndex] = buildSlotFromCurrentState(currentText);
        return next;
      }
      return slots;
    })();

    return await runExclusive(async () => {
      try {
        const texts: string[] = [];
        for (let i = 0; i < snapshot.length; i++) {
          const t = snapshot[i]?.pasteText?.trim();
          if (t && t.length > 0) {
            texts.push(t);
          }
        }
        const finalText = texts.join("\n\n");
        if (!finalText) return false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(finalText);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    });
  };

  const importTeamFromClipboard = async (): Promise<boolean> => {
    const prevIndex = selectedIndex;
    const text =
      navigator.clipboard && navigator.clipboard.readText
        ? await navigator.clipboard.readText()
        : "";
    if (!text) return false;
    return await runExclusive(async () => {
      try {
        const pokemons = Pokemon.importFromPasteText(currentGen, text, {
          useChampionsEVs: isChampionsGame,
        });
        if (!pokemons || pokemons.length === 0) return false;
        const nextSlots: (TeamSlot | undefined)[] = pokemons
          .slice(0, 6)
          .map((pokemon) =>
            buildSlotFromPasteText(
              pokemon.exportToPasteText({
              useChampionsEVs: isChampionsGame,
              }),
            ),
          );
        setSelectedIndex(Math.max(0, Math.min(prevIndex, nextSlots.length - 1)));
        setSlots(nextSlots);

        return true;
      } catch {
        return false;
      }
    });
  };

  return {
    slots,
    selectedIndex,
    savedTeams,
    currentSavedTeamName: currentSavedTeam?.name,
    selectSlot,
    moveSlot,
    addSlot,
    removeSlot,
    saveTeamToStorage,
    loadSavedTeam,
    deleteSavedTeam,
    clearTeam,
    importTeamFromText,
    exportTeamToClipboard,
    importTeamFromClipboard,
    hasUnsavedCurrentPokemonChanges,
  };
};

export const AttackerTeamProvider: React.FC<
  React.PropsWithChildren<unknown>
> = ({ children }) => {
  const value = useTeamLogic("attacker");
  return (
    <AttackerTeamContext.Provider value={value}>
      {children}
    </AttackerTeamContext.Provider>
  );
};

export const DefenderTeamProvider: React.FC<
  React.PropsWithChildren<unknown>
> = ({ children }) => {
  const value = useTeamLogic("defender");
  return (
    <DefenderTeamContext.Provider value={value}>
      {children}
    </DefenderTeamContext.Provider>
  );
};

export const useTeamState = (isAttacker?: boolean): TeamState => {
  const attacker = useContext(AttackerTeamContext);
  const defender = useContext(DefenderTeamContext);
  if (isAttacker === true) {
    if (!attacker)
      throw new Error(
        "useTeamState(attacker) must be used within AttackerTeamProvider"
      );
    return attacker;
  }
  if (isAttacker === false) {
    if (!defender)
      throw new Error(
        "useTeamState(defender) must be used within DefenderTeamProvider"
      );
    return defender;
  }
  if (attacker) return attacker;
  if (defender) return defender;
  throw new Error(
    "useTeamState must be used within AttackerTeamProvider or DefenderTeamProvider"
  );
};

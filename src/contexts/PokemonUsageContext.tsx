import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { ShowdownStatsService } from "../services/showdown.stats.service";
import { PokemonUsage } from "../models/showndown.model";
import { useFormats } from "./FormatsContext";

interface PokemonUsageContextType {
  pokemonUsageList: PokemonUsage[];
  pokemonUsageParamsKey: string;
  pokemonUsageListUpdatedAttacker: boolean;
  pokemonUsageListUpdatedDefender: boolean;
  setPokemonUsageListUpdatedAttacker: (updated: boolean) => void;
  setPokemonUsageListUpdatedDefender: (updated: boolean) => void;
  loading: boolean;
  error: string | null;
}

const PokemonUsageContext = createContext<PokemonUsageContextType | undefined>(
  undefined
);

export const PokemonUsageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [pokemonUsageList, setPokemonUsageList] = useState<PokemonUsage[]>([]);
  const [pokemonUsageParamsKey, setPokemonUsageParamsKey] = useState("");
  const [pokemonUsageListUpdated, setPokemonUsageListUpdatedState] = useState<
    boolean[]
  >([false, false]);
  const setPokemonUsageListUpdatedAttacker = useCallback((updated: boolean) => {
    setPokemonUsageListUpdatedState((prev) => [updated, prev[1]]);
  }, []);
  const setPokemonUsageListUpdatedDefender = useCallback((updated: boolean) => {
    setPokemonUsageListUpdatedState((prev) => [prev[0], updated]);
  }, []);
  const pokemonUsageListUpdatedAttacker = useMemo(
    () => pokemonUsageListUpdated[0],
    [pokemonUsageListUpdated]
  );
  const pokemonUsageListUpdatedDefender = useMemo(
    () => pokemonUsageListUpdated[1],
    [pokemonUsageListUpdated]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastParamsRef = useRef<string>("");
  const { currentReg, currentRule, currentMonthTag, currentCutline } =
    useFormats();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentReg || !currentRule || !currentMonthTag || !currentCutline) {
        setLoading(true);
        return;
      }
      const paramsKey = JSON.stringify([
        currentReg || "",
        currentRule || "",
        currentMonthTag || "",
        currentCutline || "",
      ]);
      if (lastParamsRef.current === paramsKey) {
        return;
      }
      lastParamsRef.current = paramsKey;
      setLoading(true);
      setError(null);
      try {
        const statsService = new ShowdownStatsService();
        const usageData = await statsService.getShowdownUsage(
          currentReg || "",
          currentRule || "",
          currentMonthTag || "",
          currentCutline || ""
        );
        if (!cancelled) {
          setPokemonUsageList(usageData);
          setPokemonUsageParamsKey(paramsKey);
          setPokemonUsageListUpdatedState([true, true]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "errors.pokemonUsageFetchFailed"
          );
          setPokemonUsageList([]);
          setPokemonUsageParamsKey(paramsKey);
          setPokemonUsageListUpdatedState([true, true]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentReg, currentRule, currentMonthTag, currentCutline]);

  const value: PokemonUsageContextType = {
    pokemonUsageList,
    pokemonUsageParamsKey,
    pokemonUsageListUpdatedAttacker,
    pokemonUsageListUpdatedDefender,
    setPokemonUsageListUpdatedAttacker,
    setPokemonUsageListUpdatedDefender,
    loading,
    error,
  };

  return (
    <PokemonUsageContext.Provider value={value}>
      {children}
    </PokemonUsageContext.Provider>
  );
};

export const usePokemonUsage = (): PokemonUsageContextType => {
  const context = useContext(PokemonUsageContext);
  if (context === undefined) {
    throw new Error(
      "usePokemonUsage must be used within a PokemonUsageProvider"
    );
  }
  return context;
};

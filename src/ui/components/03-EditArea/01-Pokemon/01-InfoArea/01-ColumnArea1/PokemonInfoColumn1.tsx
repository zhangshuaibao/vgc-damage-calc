import React, { useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
// @ts-ignore
import "./PokemonInfoColumn1.css";
import EditAreaProps from "../../../Props/EditAreaProps";
import { usePokemonTranslation } from "../../../../../../contexts/usePokemonTranslation";
import SearchableDropdown, {
  DropdownItem,
} from "../../../../../widgets/SearchableDropdown/SearchableDropdown";
import SmartImage from "../../../../../widgets/SmartImage/SmartImage";
import { ShowdownDataService } from "../../../../../../services/showdown.utils/showdown.data.service";
import { AutoSelectDisableOptions } from "../../../../../../contexts/PokemonMovesetsContext";
import { usePokemonState } from "../../../../../../contexts/PokemonStateContext";
import { AppPinyin } from "../../../../../../utils/app.pinyin";
import { useLanguage } from "../../../../../../contexts/LanguageContext";
import { getTypeColor } from "../../../../../../utils/type.colors";
import { SpeciesData } from "../../../../../../vendors/smogon/pokemon-showdown/sim/dex-species";
import { MoveData } from "../../../../../../vendors/smogon/pokemon-showdown/sim/dex-moves";
import { usePokemonUsage } from "../../../../../../contexts/PokemonUsageContext";
import { useFormats } from "../../../../../../contexts/FormatsContext";

const PokemonInfoColumn1: React.FC<EditAreaProps> = ({ isAttacker }) => {
  const tabBase = isAttacker ? 320000 : 330000;
  const { t } = useTranslation();
  const {
    translatePokemon,
    translateType,
    translateTypeShort,
    translateAbility,
    translateMove,
  } = usePokemonTranslation();
  const {
    pokemonUsageList,
    pokemonUsageListUpdatedAttacker,
    pokemonUsageListUpdatedDefender,
    setPokemonUsageListUpdatedAttacker,
    setPokemonUsageListUpdatedDefender,
  } = usePokemonUsage();
  const { language } = useLanguage();
  const { currentGame, currentGen, currentReg } = useFormats();

  // 使用新的Pokemon状态管理
  const {
    rootFormeSpecies,
    pokemonSpecies,
    setPokemonName,
    setPokemonForme,
    setDisableAutoSelect,
  } = usePokemonState(isAttacker);

  const isMegaForme = useCallback((species?: SpeciesData): boolean => {
    return /-Mega(?:-[XYZ])?$/i.test(species?.name || "");
  }, []);

  const getAutoSelectDisableOptionsOnFormeSwitch = useCallback(
    (nextForme?: SpeciesData): AutoSelectDisableOptions | undefined => {
      const currentForme = pokemonSpecies?.value;
      if (!currentForme || !nextForme || currentForme.name === nextForme.name) {
        return undefined;
      }

      const currentIsMega = isMegaForme(currentForme);
      const nextIsMega = isMegaForme(nextForme);

      if (currentIsMega && !nextIsMega) {
        return {
          items: true,
          moves: true,
          teratypes: true,
          metaBuilds: true,
        };
      }

      if (currentIsMega && nextIsMega) {
        return {
          moves: true,
          teratypes: true,
          metaBuilds: true,
        };
      }

      return undefined;
    },
    [isMegaForme, pokemonSpecies],
  );

  const getTranslatedSearchKey = useCallback(
    (names: string[], translate: (name: string) => string): string =>
      names
        .map((name) => {
          const translatedName = translate(name) || "";
          return `${name}|${translatedName}${
            language === "zh"
              ? `|${AppPinyin.getSearchKeywords(translatedName)}`
              : ""
          }`;
        })
        .join("|"),
    [language],
  );

  const getPokemonMoveSearchKey = useCallback(
    (species?: SpeciesData): string => {
      const moves = ShowdownDataService.Moves as Record<
        string,
        MoveData | undefined
      >;
      const learnsets = ShowdownDataService.getPokemonLearnsets(species);
      const moveNames = Array.from(
        new Set(
          (learnsets || []).map((moveId) => moves[moveId]?.name || moveId),
        ),
      );
      return getTranslatedSearchKey(moveNames, translateMove);
    },
    [getTranslatedSearchKey, translateMove],
  );

  const getPokemonAbilitySearchKey = useCallback(
    (species?: SpeciesData): string => {
      const abilityNames = Array.from(
        new Set(
          Object.values(species?.abilities || {}).filter(
            (ability): ability is string =>
              typeof ability === "string" && ability.length > 0,
          ),
        ),
      );
      return getTranslatedSearchKey(abilityNames, translateAbility);
    },
    [getTranslatedSearchKey, translateAbility],
  );

  const getPokemonTypeSearchKey = useCallback(
    (species?: SpeciesData): string => {
      const pokemonTypes = species?.types || [];
      const pokemonTypeString = `${pokemonTypes.join(" ")}|${[...pokemonTypes]
        .reverse()
        .join(" ")}`;
      const translatedPokemonTypes = pokemonTypes.map((type: string) =>
        translateType(type),
      );
      const translatedPokemonTypesShort = pokemonTypes.map((type: string) =>
        translateTypeShort(type),
      );
      const translatedPokemonTypesString = `${translatedPokemonTypes.join(
        "",
      )}|${[...translatedPokemonTypes]
        .reverse()
        .join("")}|${translatedPokemonTypesShort.join(
        "",
      )}|${[...translatedPokemonTypesShort].reverse().join("")}`;
      return `${pokemonTypeString}|${translatedPokemonTypesString}|${
        language === "zh"
          ? `${AppPinyin.getSearchKeywords(translatedPokemonTypesString)}`
          : ""
      }`;
    },
    [language, translateType, translateTypeShort],
  );

  const extraSearchKeyCacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    extraSearchKeyCacheRef.current.clear();
  }, [
    language,
    translateAbility,
    translateMove,
    translateType,
    translateTypeShort,
    currentGame,
    currentGen,
    currentReg,
  ]);

  const getPokemonExtraSearchKey = useCallback(
    (species?: SpeciesData, fallbackName = ""): string => {
      const pokemonName = species?.name || fallbackName;
      const cacheKey = `${currentGame ?? ""}:${currentGen}:${
        currentReg ?? ""
      }:${language}:${pokemonName}`;
      const cachedSearchKey = extraSearchKeyCacheRef.current.get(cacheKey);
      if (cachedSearchKey !== undefined) {
        return cachedSearchKey;
      }
      const typeSearchKey = getPokemonTypeSearchKey(species);
      const abilitySearchKey = getPokemonAbilitySearchKey(species);
      const moveSearchKey = getPokemonMoveSearchKey(species);
      const extraSearchKey = `${typeSearchKey}|${abilitySearchKey}|${moveSearchKey}`;
      extraSearchKeyCacheRef.current.set(cacheKey, extraSearchKey);
      return extraSearchKey;
    },
    [
      getPokemonAbilitySearchKey,
      getPokemonMoveSearchKey,
      getPokemonTypeSearchKey,
      currentGame,
      currentGen,
      currentReg,
      language,
    ],
  );

  const getPokemonBaseSearchKey = useCallback(
    (species?: SpeciesData, fallbackName = ""): string => {
      const pokemonName = species?.name || fallbackName;
      const translatedName = translatePokemon(pokemonName) || "";
      return `${pokemonName}|${translatedName}${
        language === "zh"
          ? `|${AppPinyin.getSearchKeywords(translatedName)}`
          : ""
      }`;
    },
    [language, translatePokemon],
  );

  const isPokemonAvailableInFormat = useCallback((species?: SpeciesData) => {
    const key = (species?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key) {
      return true;
    }
    const formatsData = ShowdownDataService.FormatsData;
    const formatData = formatsData[key as keyof typeof formatsData];
    return (
      !!formatData &&
      (formatData.isNonstandard == null)
    );
  }, []);

  // 自定义宝可梦下拉项组件
  const PokemonDropdownItem: React.FC<{ item: DropdownItem }> = useMemo(
    () =>
      ({ item }) => {
        const pokemonName = item.value
          ? (item.value as SpeciesData).name
          : item.key;
        const isAvailable =
          (item as unknown as { isAvailable?: boolean }).isAvailable !== false;
        const translatedName = translatePokemon(pokemonName) || "";

        const usageData = pokemonUsageList.find(
          (usage) => usage.pokemon === pokemonName,
        );
        const usagePercentage = usageData?.usage || 0;

        const pokemonTypes = item.value
          ? (item.value as SpeciesData).types
          : [];

        return (
          <div className="pi_col1-pokemon-dropdown-item">
            <SmartImage
              className="pi_col1-pokemon-dropdown-avatar"
              src={ShowdownDataService.getPokemonImgUrl(pokemonName, true)}
              alt={translatedName}
              loading="lazy"
            />
            <div className="pi_col1-pokemon-dropdown-content">
              <span
                className={`pi_col1-pokemon-dropdown-name ${
                  !isAvailable ? "pi_col1-pokemon-unavailable" : ""
                }`}
              >
                {translatedName}
              </span>
              {pokemonTypes.length > 0 && (
                <div className="pi_col1-pokemon-dropdown-types">
                  {pokemonTypes.map((type: string, index: number) => (
                    <div
                      key={index}
                      className="pi_col1-pokemon-dropdown-type"
                      style={{
                        backgroundColor: getTypeColor(type),
                        opacity: !isAvailable ? 0.5 : 1,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <span
              className={`pi_col1-pokemon-dropdown-usage ${
                !isAvailable ? "pi_col1-pokemon-unavailable" : ""
              }`}
            >
              {usagePercentage > 0 && `${usagePercentage.toFixed(3)}%`}
            </span>
          </div>
        );
      },
    [translatePokemon, pokemonUsageList],
  );

  // 获取宝可梦列表并根据使用率排序
  const pokemonDropdownItems: DropdownItem[] = useMemo(() => {
    const speciesData = ShowdownDataService.DisplaySpeciesList;

    // 创建使用率映射
    const usageMap = new Map<string, number>();
    pokemonUsageList.forEach((usage) => {
      usageMap.set(usage.pokemon, usage.rank);
    });

    // 根据使用率排序宝可梦列表
    const sortedPokemonList = [...Object.keys(speciesData)].sort((a, b) => {
      const speciesA = speciesData[a as keyof typeof speciesData] as
        | SpeciesData
        | undefined;
      const speciesB = speciesData[b as keyof typeof speciesData] as
        | SpeciesData
        | undefined;
      const isAvailableA = isPokemonAvailableInFormat(speciesA);
      const isAvailableB = isPokemonAvailableInFormat(speciesB);
      if (isAvailableA !== isAvailableB) {
        return isAvailableA ? -1 : 1;
      }

      const pokemonA = speciesA?.name || a;
      const pokemonB = speciesB?.name || b;
      const rankA = usageMap.get(pokemonA) || 9999; // 没有使用率数据的排在后面
      const rankB = usageMap.get(pokemonB) || 9999;
      return rankA - rankB; // 按排名升序排列（排名越小越靠前）
    });

    return sortedPokemonList.map((pokemonKey) => {
      const pokemonData = speciesData[
        pokemonKey as keyof typeof speciesData
      ] as SpeciesData;
      const pokemonName = pokemonData.name || pokemonKey;
      const isAvailable = isPokemonAvailableInFormat(pokemonData);
      const translatedName = translatePokemon(pokemonName) || "";
      const searchKey = getPokemonBaseSearchKey(
        pokemonData as SpeciesData,
        pokemonName,
      );
      const lazySearchKey = () =>
        getPokemonExtraSearchKey(pokemonData as SpeciesData, pokemonName);
      return {
        key: pokemonName,
        value: pokemonData,
        searchKey: searchKey,
        lazySearchKey: lazySearchKey,
        displayContentFC: translatedName,
        dropdownItemFC: PokemonDropdownItem,
        isAvailable: isAvailable,
      };
    });
  }, [
    PokemonDropdownItem,
    getPokemonBaseSearchKey,
    getPokemonExtraSearchKey,
    isPokemonAvailableInFormat,
    pokemonUsageList,
    translatePokemon,
  ]);

  useEffect(() => {
    if (isAttacker && !pokemonUsageListUpdatedAttacker) {
      return;
    }
    if (!isAttacker && !pokemonUsageListUpdatedDefender) {
      return;
    }
    if (isAttacker && pokemonDropdownItems.length > 0) {
      const value = pokemonDropdownItems[0].value;
      setPokemonName(value);
      setPokemonUsageListUpdatedAttacker(false);
    } else if (!isAttacker && pokemonDropdownItems.length > 1) {
      setPokemonName(pokemonDropdownItems[1].value);
      setPokemonUsageListUpdatedDefender(false);
    } else {
      setPokemonName(undefined);
      if (isAttacker) {
        setPokemonUsageListUpdatedAttacker(false);
      } else {
        setPokemonUsageListUpdatedDefender(false);
      }
    }
  }, [
    isAttacker,
    pokemonDropdownItems,
    pokemonUsageListUpdatedAttacker,
    pokemonUsageListUpdatedDefender,
    setPokemonName,
    setPokemonUsageListUpdatedAttacker,
    setPokemonUsageListUpdatedDefender,
  ]);

  const pokemonFormeDropdownItems: DropdownItem[] = useMemo(() => {
    if (!rootFormeSpecies) {
      return [];
    }

    const speciesData = ShowdownDataService.getSubSpeciesDataTable(
      rootFormeSpecies.value,
    );
    if (!speciesData) {
      return [];
    }

    const sortedPokemonList = [...Object.keys(speciesData)].sort((a, b) => {
      const indexA = (rootFormeSpecies.value.formeOrder || []).indexOf(a);
      const indexB = (rootFormeSpecies.value.formeOrder || []).indexOf(b);
      return indexA - indexB; // 按索引升序排列（索引越小越靠前）
    });

    return sortedPokemonList.map((pokemonKey) => {
      const pokemonData = speciesData[
        pokemonKey as keyof typeof speciesData
      ] as SpeciesData;
      const pokemonName = pokemonData.name || pokemonKey;
      const isAvailable = isPokemonAvailableInFormat(pokemonData);
      const translatedName = translatePokemon(pokemonName) || "";
      const searchKey = getPokemonBaseSearchKey(
        pokemonData as SpeciesData,
        pokemonName,
      );
      const lazySearchKey = () =>
        getPokemonExtraSearchKey(pokemonData as SpeciesData, pokemonName);
      return {
        key: pokemonName,
        value: pokemonData,
        searchKey: searchKey,
        lazySearchKey: lazySearchKey,
        displayContentFC: translatedName,
        dropdownItemFC: PokemonDropdownItem,
        isAvailable: isAvailable,
      };
    });
  }, [
    rootFormeSpecies,
    PokemonDropdownItem,
    getPokemonBaseSearchKey,
    getPokemonExtraSearchKey,
    isPokemonAvailableInFormat,
    translatePokemon,
  ]);

  return (
    <div className="pi_col1-column">
      <div className="pi_col1-avatar-area">
        <SmartImage
          className="pi_col1-avatar"
          alt={translatePokemon(pokemonSpecies?.value.name || "")}
          src={ShowdownDataService.getPokemonImgUrl(
            pokemonSpecies?.value.name,
            false,
          )}
        />
      </div>
      <div className="pi_col1-pokemon-name-area">
        <div className="pi_col1-pokemon-name-label">{t("pokemon.name")}</div>
        <SearchableDropdown
          items={pokemonDropdownItems}
          value={ShowdownDataService.getRootSpecies(pokemonSpecies?.value)}
          onChange={(value) => {
            setPokemonName(value);
          }}
          placeholder={t("pokemon.selectPokemon")}
          className="pi_col1-pokemon-name"
          dropdownClassName="pi_col1-pokemon-dropdown"
          isTextEditable={true}
          showDropdownButton={false}
          tabIndex={tabBase + 1}
          maxLength={100}
        />
        {(!pokemonFormeDropdownItems ||
          pokemonFormeDropdownItems.length === 0) && (
          <div className="pi_col1-space-pokemon-forme-area" />
        )}
        {pokemonFormeDropdownItems && pokemonFormeDropdownItems.length > 0 && (
          <SearchableDropdown
            items={pokemonFormeDropdownItems}
            value={pokemonSpecies?.value}
            onChange={(value) => {
              const nextForme = value as SpeciesData | undefined;
              const disableOptions =
                getAutoSelectDisableOptionsOnFormeSwitch(nextForme);
              if (disableOptions) {
                setDisableAutoSelect(disableOptions);
              }
              setPokemonForme(value);
            }}
            placeholder={t("pokemon.selectPokemonForme")}
            className="pi_col1-pokemon-forme"
            dropdownClassName="pi_col1-pokemon-dropdown"
            isTextEditable={true}
            showDropdownButton={true}
            tabIndex={tabBase + 2}
          />
        )}
      </div>
    </div>
  );
};

export default PokemonInfoColumn1;

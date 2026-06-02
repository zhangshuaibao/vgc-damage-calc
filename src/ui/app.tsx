import React, { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "../contexts/ThemeContext";
import "./theme.css";
import "./app.css";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { ContextAwareConfirmation } from "react-confirm";
import { FormatsProvider } from "../contexts/FormatsContext";
import HeaderArea from "./components/00-HeaderArea/HeaderArea";
import FormatsWidget, {
  MANUAL_FORMATS_CHANGE_EVENT,
} from "./components/01-FormatsArea/FormatsWidget";
import { GlobalEffectsProvider } from "../contexts/GlobalEffectsContext";
import { PokemonUsageProvider } from "../contexts/PokemonUsageContext";
import {
  readExternalPackedTeamHash,
  unpackPackedTeamToPasteText,
} from "../utils/showdown-packed-team";
const FieldArea = React.lazy(
  () => import("./components/04-FieldArea/FieldArea")
);
const EditArea = React.lazy(() => import("./components/03-EditArea/EditArea"));
const ComputeArea = React.lazy(() =>
  import("./components/02-ComputeArea/ComputeArea").then((m) => ({
    default: m.ComputeArea,
  }))
);
export const AppPage: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ContextAwareConfirmation.ConfirmationRoot />
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
};

const AppContent: React.FC = () => {
  const { ready, isLoading, language } = useLanguage();
  const { t } = useTranslation("app");
  const [hasInitialized, setHasInitialized] = useState(ready);

  useEffect(() => {
    if (ready) {
      setHasInitialized(true);
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    document.title = t("appTitle");
    document.documentElement.lang = language;
  }, [language, ready, t]);

  // 只在首次启动且语言资源尚未就绪时阻塞渲染，避免切换语言时卸载整棵状态树
  if (!hasInitialized && (isLoading || !ready)) {
    return (
      <div className="App">
        <div
          className="loading-container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontSize: "18px",
          }}
        >
          {t("loading")}...
        </div>
      </div>
    );
  }

  return (
      <FormatsProvider>
        <PokemonUsageProvider>
            <div className="App">
              <HeaderArea />
              <main className="App-main">
                <div className="app-content">
                  <div className="formats-section">
                    <FormatsWidget />
                  </div>
                  <div className="main-content">
                    <Suspense
                      fallback={
                        <div className="app-main-lazy-fallback">
                          {t("loading")}...
                        </div>
                      }
                    >
                      <MainProviders>
                        <Suspense
                          fallback={
                            <div className="app-main-lazy-fallback">
                              {t("loading")}...
                            </div>
                          }
                        >
                          <ComputeArea />
                        </Suspense>
                        <Suspense
                          fallback={
                            <div className="app-main-lazy-fallback">
                              {t("loading")}...
                            </div>
                          }
                        >
                          <EditArea />
                        </Suspense>
                        <Suspense
                          fallback={
                            <div className="app-main-lazy-fallback">
                              {t("loading")}...
                            </div>
                          }
                        >
                          <FieldArea />
                        </Suspense>
                      </MainProviders>
                    </Suspense>
                  </div>
                </div>
              </main>
              <footer className="App-footer">
                <span>{t("footer.editHint")}</span>
              </footer>
            </div>
        </PokemonUsageProvider>
      </FormatsProvider>
  );
};

export default AppPage;

const EXTERNAL_IMPORT_WINDOW_NAME = "vgc-damage-calculator";

const cleanExternalImportUrl = (): void => {
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", url.toString());
};

const MainProviders = React.lazy(async () => {
  const Movesets = await import("../contexts/PokemonMovesetsContext");
  const State = await import("../contexts/PokemonStateContext");
  const FieldCtx = await import("../contexts/FieldContext");
  const TeamCtx = await import("../contexts/TeamContext");
  const FormatsCtx = await import("../contexts/FormatsContext");
  const UsageCtx = await import("../contexts/PokemonUsageContext");
  const ExternalTeamImportBridge: React.FC = () => {
    const attackerTeam = TeamCtx.useTeamState(true);
    const defenderTeam = TeamCtx.useTeamState(false);
    const field = FieldCtx.useField();
    const attackerSide = FieldCtx.useFieldSide(true);
    const defenderSide = FieldCtx.useFieldSide(false);
    const formats = FormatsCtx.useFormats();
    const pokemonUsage = UsageCtx.usePokemonUsage();
    const attackerMovesets = Movesets.usePokemonMovesets(true);
    const defenderMovesets = Movesets.usePokemonMovesets(false);
    const {
      loading: pokemonUsageLoading,
      setPokemonUsageListUpdatedAttacker,
      setPokemonUsageListUpdatedDefender,
    } = pokemonUsage;
    const {
      setItemsUsageListUpdated: setAttackerItemsUsageListUpdated,
      setMovesUsageListUpdated: setAttackerMovesUsageListUpdated,
      setTeratypesUsageListUpdated: setAttackerTeratypesUsageListUpdated,
      setAbilitiesUsageListUpdated: setAttackerAbilitiesUsageListUpdated,
      setMetaBuildsUsageListUpdated: setAttackerMetaBuildsUsageListUpdated,
    } = attackerMovesets;
    const {
      setItemsUsageListUpdated: setDefenderItemsUsageListUpdated,
      setMovesUsageListUpdated: setDefenderMovesUsageListUpdated,
      setTeratypesUsageListUpdated: setDefenderTeratypesUsageListUpdated,
      setAbilitiesUsageListUpdated: setDefenderAbilitiesUsageListUpdated,
      setMetaBuildsUsageListUpdated: setDefenderMetaBuildsUsageListUpdated,
    } = defenderMovesets;
    const lastImportedHashRef = React.useRef<string | undefined>(undefined);

    React.useEffect(() => {
      window.name = EXTERNAL_IMPORT_WINDOW_NAME;
    }, []);

    React.useEffect(() => {
      const clearTeamsOnManualFormatsChange = () => {
        void Promise.all([
          attackerTeam.clearTeam(),
          defenderTeam.clearTeam(),
        ]);
      };
      window.addEventListener(
        MANUAL_FORMATS_CHANGE_EVENT,
        clearTeamsOnManualFormatsChange,
      );
      return () => {
        window.removeEventListener(
          MANUAL_FORMATS_CHANGE_EVENT,
          clearTeamsOnManualFormatsChange,
        );
      };
    }, [attackerTeam, defenderTeam]);

    React.useEffect(() => {
      const applyExternalImport = () => {
        const currentHash = window.location.hash;
        if (!currentHash || currentHash === lastImportedHashRef.current) {
          return;
        }
        const importParams = readExternalPackedTeamHash();
        if (!importParams.hasImportParams) {
          return;
        }
        const formatsReady =
          !formats.loading &&
          !!formats.currentGame &&
          !!formats.currentReg &&
          !!formats.currentRule &&
          !!formats.currentMonthTag &&
          !!formats.currentCutline;
        const usageReady = !pokemonUsageLoading;
        if (!formatsReady || !usageReady) {
          return;
        }
        const attackerPackedTeam = importParams.attackerPackedTeam?.trim();
        const defenderPackedTeam = importParams.defenderPackedTeam?.trim();
        if (!attackerPackedTeam && !defenderPackedTeam) {
          return;
        }
        lastImportedHashRef.current = currentHash;

        if (attackerPackedTeam) {
          setPokemonUsageListUpdatedAttacker(false);
          setAttackerItemsUsageListUpdated(false);
          setAttackerMovesUsageListUpdated(false);
          setAttackerTeratypesUsageListUpdated(false);
          setAttackerAbilitiesUsageListUpdated(false);
          setAttackerMetaBuildsUsageListUpdated(false);
        }
        if (defenderPackedTeam) {
          setPokemonUsageListUpdatedDefender(false);
          setDefenderItemsUsageListUpdated(false);
          setDefenderMovesUsageListUpdated(false);
          setDefenderTeratypesUsageListUpdated(false);
          setDefenderAbilitiesUsageListUpdated(false);
          setDefenderMetaBuildsUsageListUpdated(false);
        }

        // 等默认选择 effect 消费完本轮 render 中的旧 flag 后再导入，避免同一轮抢写。
        window.setTimeout(() => {
          void (async () => {
            let importedAny = false;

            if (attackerPackedTeam) {
              const attackerPasteText =
                unpackPackedTeamToPasteText(attackerPackedTeam);
              importedAny =
                (await attackerTeam.importTeamFromText(attackerPasteText)) ||
                importedAny;
            }
            if (defenderPackedTeam) {
              const defenderPasteText =
                unpackPackedTeamToPasteText(defenderPackedTeam);
              importedAny =
                (await defenderTeam.importTeamFromText(defenderPasteText)) ||
                importedAny;
            }

            if (importedAny) {
              window.setTimeout(() => {
                field.resetField();
                attackerSide.resetSide();
                defenderSide.resetSide();
              }, 0);
              cleanExternalImportUrl();
            }
          })();
        }, 0);
      };

      void applyExternalImport();
      window.addEventListener("hashchange", applyExternalImport);
      return () => {
        window.removeEventListener("hashchange", applyExternalImport);
      };
    }, [
      attackerTeam,
      defenderTeam,
      field,
      attackerSide,
      defenderSide,
      formats.currentCutline,
      formats.currentGame,
      formats.currentMonthTag,
      formats.currentReg,
      formats.currentRule,
      formats.loading,
      pokemonUsageLoading,
      setPokemonUsageListUpdatedAttacker,
      setPokemonUsageListUpdatedDefender,
      setAttackerItemsUsageListUpdated,
      setAttackerMovesUsageListUpdated,
      setAttackerTeratypesUsageListUpdated,
      setAttackerAbilitiesUsageListUpdated,
      setAttackerMetaBuildsUsageListUpdated,
      setDefenderItemsUsageListUpdated,
      setDefenderMovesUsageListUpdated,
      setDefenderTeratypesUsageListUpdated,
      setDefenderAbilitiesUsageListUpdated,
      setDefenderMetaBuildsUsageListUpdated,
    ]);

    return null;
  };
  const Comp: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <Movesets.AttackerMovesetsProvider>
      <State.AttackerStateProvider>
        <TeamCtx.AttackerTeamProvider>
          <Movesets.DefenderMovesetsProvider>
            <State.DefenderStateProvider>
              <TeamCtx.DefenderTeamProvider>
                <FieldCtx.FieldProvider>
                  <FieldCtx.FieldSideAttackerProvider>
                    <FieldCtx.FieldSideDefenderProvider>
                      <GlobalEffectsProvider>
                        <ExternalTeamImportBridge />
                        {children}
                      </GlobalEffectsProvider>
                    </FieldCtx.FieldSideDefenderProvider>
                  </FieldCtx.FieldSideAttackerProvider>
                </FieldCtx.FieldProvider>
              </TeamCtx.DefenderTeamProvider>
            </State.DefenderStateProvider>
          </Movesets.DefenderMovesetsProvider>
        </TeamCtx.AttackerTeamProvider>
      </State.AttackerStateProvider>
    </Movesets.AttackerMovesetsProvider>
  );
  return { default: Comp };
});

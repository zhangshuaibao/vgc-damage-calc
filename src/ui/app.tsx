import React, { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "../contexts/ThemeContext";
import "./theme.css";
import "./app.css";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { ContextAwareConfirmation } from "react-confirm";
import { FormatsProvider } from "../contexts/FormatsContext";
import HeaderArea from "./components/00-HeaderArea/HeaderArea";
import FormatsWidget from "./components/01-FormatsArea/FormatsWidget";
import { GlobalEffectsProvider } from "../contexts/GlobalEffectsContext";
import { PokemonUsageProvider } from "../contexts/PokemonUsageContext";
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
  const { ready, isLoading } = useLanguage();
  const { t } = useTranslation("app");
  const [hasInitialized, setHasInitialized] = useState(ready);

  useEffect(() => {
    if (ready) {
      setHasInitialized(true);
    }
  }, [ready]);

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
const MainProviders = React.lazy(async () => {
  const Movesets = await import("../contexts/PokemonMovesetsContext");
  const State = await import("../contexts/PokemonStateContext");
  const FieldCtx = await import("../contexts/FieldContext");
  const TeamCtx = await import("../contexts/TeamContext");
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
                      <GlobalEffectsProvider>{children}</GlobalEffectsProvider>
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

import React from "react";
import { useTranslation } from "react-i18next";
import { FaAndroid, FaApple, FaGooglePlay } from "react-icons/fa";
import Settings from "../Settings";
import "./HeaderArea.css";

const HeaderArea: React.FC = () => {
  const { t } = useTranslation("app");

  return (
    <header className="hda-header">
      <div className="hda-content">
        <h1 className="hda-title">{t("appTitle")}</h1>
        <div className="hda-actions">
          <div className="hda-download-group">
            <div className="hda-download-label">
              <img
                src="./images/icon-vgc-stats.png"
                alt={t("header.appIconAlt")}
                className="hda-download-icon"
              />
              <span>{t("header.appName")}</span>
            </div>
            <div className="hda-download-links">
              <a
                href="https://pokestats.top/apk/vgc-stats.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="hda-download-link"
                aria-label={t("header.downloadApk")}
              >
                <FaAndroid aria-hidden="true" />
                <span className="hda-download-tooltip" role="tooltip">
                  {t("header.downloadApk")}
                </span>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.feng.pokemonVgStats"
                target="_blank"
                rel="noopener noreferrer"
                className="hda-download-link"
                aria-label={t("header.googlePlay")}
              >
                <FaGooglePlay aria-hidden="true" />
                <span className="hda-download-tooltip" role="tooltip">
                  {t("header.googlePlay")}
                </span>
              </a>
              <a
                href="https://apps.apple.com/app/id6686406395"
                target="_blank"
                rel="noopener noreferrer"
                className="hda-download-link"
                aria-label={t("header.appStore")}
              >
                <FaApple aria-hidden="true" />
                <span className="hda-download-tooltip" role="tooltip">
                  {t("header.appStore")}
                </span>
              </a>
            </div>
          </div>
          <Settings />
        </div>
      </div>
    </header>
  );
};

export default HeaderArea;

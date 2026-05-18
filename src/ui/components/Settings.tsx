import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import "./Settings.css";
import {
  FiSettings,
  FiGlobe,
  FiChevronLeft,
  FiCheck,
  FiSun,
  FiMoon,
  FiType,
  FiFlag,
  FiDisc,
  FiGithub,
  FiAlertCircle,
  FiCoffee,
} from "react-icons/fi";
import { FaAlipay, FaPaypal, FaWeixin } from "react-icons/fa";

type CoffeeMethod = "alipay" | "wechat" | null;

const Settings: React.FC = () => {
  const { i18n, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCoffeeMethod, setActiveCoffeeMethod] =
    useState<CoffeeMethod>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabBase = 0;

  const languages = [
    { code: "en", name: t("languageEnglishName"), icon: <FiType /> },
    { code: "zh", name: t("languageChineseName"), icon: <FiFlag /> },
    { code: "ja", name: t("languageJapaneseName"), icon: <FiDisc /> },
  ];

  const themes = [
    { code: "light", name: t("lightMode"), icon: <FiSun /> },
    { code: "dark", name: t("darkMode"), icon: <FiMoon /> },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    setIsOpen(false);
    setActiveCoffeeMethod(null);
    setActiveSubmenu(null);
  };

  const changeTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    setIsOpen(false);
    setActiveCoffeeMethod(null);
    setActiveSubmenu(null);
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveCoffeeMethod(null);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="st-settings" ref={dropdownRef}>
      {/* <div className="st-header-link-old-version-container">
        <a
          href="https://pokestats.top/calc/oldVersion/"
          target="_blank"
          rel="noopener noreferrer"
          className="st-external-links"
          aria-label={t("pokemon.olderVersionEntry")}
          tabIndex={tabBase + 2}
        >
          <span className="st-calculator-icon"><FiLink /></span>
          <span className="st-external-link-text">{t("pokemon.olderVersionEntry")}</span>
        </a>
      </div> */}
      <div
        className="st-coffee"
        onMouseEnter={() => {
          setIsOpen(false);
          setActiveSubmenu(null);
        }}
        onMouseLeave={() => setActiveCoffeeMethod(null)}
      >
        <button
          className="st-coffee-button"
          aria-label={t("buyMeCoffee")}
          tabIndex={tabBase + 1}
        >
          <FiCoffee className="st-coffee-icon" />
        </button>

        <div className="st-coffee-panel">
          <div className="st-coffee-panel-header">
            <h3 className="st-coffee-title">{t("coffeeSupportTitle")}</h3>
            <p className="st-coffee-hint">{t("coffeeSupportHint")}</p>
          </div>

          <div className="st-coffee-actions">
            <button
              type="button"
              className={`st-coffee-method-button ${
                activeCoffeeMethod === "alipay"
                  ? "st-coffee-method-button-active"
                  : ""
              }`}
              onMouseEnter={() => setActiveCoffeeMethod("alipay")}
              onFocus={() => setActiveCoffeeMethod("alipay")}
              onMouseLeave={() => setActiveCoffeeMethod(null)}
              aria-label={t("alipay")}
            >
              <FaAlipay aria-hidden="true" />
            </button>

            <button
              type="button"
              className={`st-coffee-method-button ${
                activeCoffeeMethod === "wechat"
                  ? "st-coffee-method-button-active"
                  : ""
              }`}
              onMouseEnter={() => setActiveCoffeeMethod("wechat")}
              onFocus={() => setActiveCoffeeMethod("wechat")}
              onMouseLeave={() => setActiveCoffeeMethod(null)}
              aria-label={t("wechatPay")}
            >
              <FaWeixin aria-hidden="true" />
            </button>

            <a
              href="https://www.paypal.com/ncp/payment/K7KNW24Y566DL"
              target="_blank"
              rel="noopener noreferrer"
              className="st-coffee-method-button st-coffee-method-button-paypal"
              aria-label={t("paypal")}
            >
              <FaPaypal aria-hidden="true" />
              <span className="st-tooltip" role="tooltip">
                {t("coffeePayPalHint")}
              </span>
            </a>
          </div>

          {activeCoffeeMethod && (
            <div className="st-coffee-preview">
              <img
                src={
                  activeCoffeeMethod === "alipay"
                    ? "./images/coffee/alipay.jpg"
                    : "./images/coffee/wechat.jpg"
                }
                alt={
                  activeCoffeeMethod === "alipay"
                    ? t("alipay")
                    : t("wechatPay")
                }
                className="st-coffee-qr"
              />
            </div>
          )}
        </div>
      </div>

      <a
        href="https://github.com/radiantwf/vgc-damage-calc/issues"
        target="_blank"
        rel="noopener noreferrer"
        className="st-icon-link"
        aria-label={t("reportBug")}
      >
        <FiAlertCircle className="st-gear-icon" />
        <span className="st-tooltip" role="tooltip">
          {t("reportBug")}
        </span>
      </a>
      <a
        href="https://github.com/radiantwf/vgc-damage-calc.git"
        target="_blank"
        rel="noopener noreferrer"
        className="st-icon-link"
        aria-label={t("githubRepo")}
      >
        <FiGithub className="st-gear-icon" />
        <span className="st-tooltip" role="tooltip">
          {t("githubRepo")}
        </span>
      </a>
      <button
        className="st-gear-button"
        onClick={() => {
          setIsOpen(!isOpen);
          setActiveCoffeeMethod(null);
        }}
        aria-label={t("settings")}
        tabIndex={tabBase + 2}
      >
        <FiSettings className="st-gear-icon" />
        <span className="st-tooltip" role="tooltip">
          {t("settings")}
        </span>
      </button>

      {isOpen && (
        <div
          className="st-settings-dropdown"
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <div className="st-settings-header">
            <h3 className="st-settings-title">{t("settings")}</h3>
          </div>

          <div
            className={`st-settings-item ${
              activeSubmenu === "language" ? "st-item-active" : ""
            }`}
            onMouseEnter={() => setActiveSubmenu("language")}
          >
            <div className="st-item-icon">
              <FiGlobe />
            </div>
            <span className="st-item-text">{t("switchLanguage")}</span>
            <FiChevronLeft className="st-arrow-icon" />

            {activeSubmenu === "language" && (
              <div className="st-submenu">
                {languages.map((lang, idx) => (
                  <div
                    key={lang.code}
                    className={`st-submenu-item ${
                      i18n.language === lang.code
                        ? "st-submenu-item-active"
                        : ""
                    }`}
                    onClick={() => changeLanguage(lang.code)}
                    tabIndex={tabBase + 20 + idx}
                  >
                    <div className="st-submenu-left">
                      <span className="st-submenu-leading-icon">
                        {lang.icon}
                      </span>
                      <span className="st-submenu-text">{lang.name}</span>
                    </div>
                    <div className="st-submenu-right">
                      {i18n.language === lang.code ? (
                        <FiCheck className="st-check-icon" />
                      ) : (
                        <span
                          className="st-check-icon-placeholder"
                          aria-hidden="true"
                        ></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className={`st-settings-item ${
              activeSubmenu === "theme" ? "st-item-active" : ""
            }`}
            onMouseEnter={() => setActiveSubmenu("theme")}
          >
            <div className="st-item-icon">
              {theme === "dark" ? <FiMoon /> : <FiSun />}
            </div>
            <span className="st-item-text">{t("theme")}</span>
            <FiChevronLeft className="st-arrow-icon" />

            {activeSubmenu === "theme" && (
              <div className="st-submenu">
                {themes.map((themeOption, idx) => (
                  <div
                    key={themeOption.code}
                    className={`st-submenu-item ${
                      theme === themeOption.code ? "st-submenu-item-active" : ""
                    }`}
                    onClick={() =>
                      changeTheme(themeOption.code as "light" | "dark")
                    }
                    tabIndex={tabBase + 40 + idx}
                  >
                    <div className="st-submenu-left">
                      <span className="st-submenu-leading-icon">
                        {themeOption.icon}
                      </span>
                      <span className="st-submenu-text">
                        {themeOption.name}
                      </span>
                    </div>
                    <div className="st-submenu-right">
                      {theme === themeOption.code ? (
                        <FiCheck className="st-check-icon" />
                      ) : (
                        <span
                          className="st-check-icon-placeholder"
                          aria-hidden="true"
                        ></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

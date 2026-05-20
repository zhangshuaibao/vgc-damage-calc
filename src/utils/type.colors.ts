// 宝可梦属性颜色映射
export const TYPE_COLORS: Record<string, string> = {
  // 基础属性
  normal: "#A0A19F",
  fire: "#BC4D34",
  water: "#627FE6",
  electric: "#E4C447",
  grass: "#6C9C41",
  ice: "#95D2FA",
  fighting: "#DA8E35",
  poison: "#824EC3",
  ground: "#7D572C",
  flying: "#9DB7EA",
  psychic: "#C75E79",
  bug: "#949F3C",
  rock: "#ACA986",
  ghost: "#64466D",
  dragon: "#6262D8",
  dark: "#4B4240",
  steel: "#7F9EB5",
  fairy: "#D081E7",
};
/**
 * 获取属性对应的颜色
 * @param type 属性名称
 * @returns 颜色值
 */
export const getTypeColor = (type: string): string => {
  const normalizedType = type.toLowerCase().trim();
  return TYPE_COLORS[normalizedType] || "#A0A19F"; // 默认颜色
};

/**
 * 获取Stellar太晶属性的彩虹色（所有属性颜色混合）
 * @returns 彩虹色渐变字符串
 */
export const getStellarRainbowColor = (): string => {
  const colors = Object.values(TYPE_COLORS);
  return `linear-gradient(90deg, ${colors.join(", ")})`;
};

/**
 * 获取属性对应的文本颜色（用于确保对比度）
 * @param type 属性名称
 * @returns 文本颜色
 */
export const getTypeTextColor = (type: string): string => {
  const normalizedType = type.toLowerCase().trim();
  // 深色背景使用白色文字，浅色背景使用黑色文字
  const darkTypes = ["fighting", "poison", "ghost", "dragon", "dark", "steel"];
  return darkTypes.includes(normalizedType) ? "#CECECE" : "#222222";
};

const clampColorChannel = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (hexColor: string): [number, number, number] => {
  const sanitized = hexColor.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
};

const formatHexColor = (red: number, green: number, blue: number): string =>
  `#${[red, green, blue]
    .map((channel) => clampColorChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;

const mixHexColor = (
  sourceHexColor: string,
  targetHexColor: string,
  ratio: number,
): string => {
  const [sourceRed, sourceGreen, sourceBlue] = parseHexColor(sourceHexColor);
  const [targetRed, targetGreen, targetBlue] = parseHexColor(targetHexColor);
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return formatHexColor(
    sourceRed + (targetRed - sourceRed) * clampedRatio,
    sourceGreen + (targetGreen - sourceGreen) * clampedRatio,
    sourceBlue + (targetBlue - sourceBlue) * clampedRatio,
  );
};

export const getTypeDisplayTextColor = (
  type: string,
  theme: "light" | "dark",
): string => {
  const normalizedType = type.toLowerCase().trim();
  if (normalizedType === "normal") {
    return theme === "dark" ? "#d9dee5" : "#3f4852";
  }

  const baseColor = getTypeColor(normalizedType);
  return theme === "dark"
    ? mixHexColor(baseColor, "#ffffff", 0.26)
    : mixHexColor(baseColor, "#111827", 0.18);
};

/**
 * 获取Stellar太晶属性的彩虹色（所有属性颜色混合）
 * @returns 彩虹色渐变字符串
 */
export const getStellarRainbowColor2 = (): string => {
  const colors = Object.values(TYPE_COLORS);
  return `linear-gradient(180deg, ${colors.join(", ")})`;
};

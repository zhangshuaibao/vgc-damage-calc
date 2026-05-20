const parseCssColorToRgb = (
  color: string,
): { r: number; g: number; b: number } | undefined => {
  const normalizedColor = color.trim();
  if (!normalizedColor) {
    return undefined;
  }

  if (normalizedColor.startsWith("#")) {
    const hex = normalizedColor.slice(1);
    if (hex.length === 3) {
      return {
        r: Number.parseInt(hex[0] + hex[0], 16),
        g: Number.parseInt(hex[1] + hex[1], 16),
        b: Number.parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
      };
    }
    return undefined;
  }

  const rgbMatch = normalizedColor.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i,
  );
  if (!rgbMatch) {
    return undefined;
  }

  return {
    r: Number.parseInt(rgbMatch[1], 10),
    g: Number.parseInt(rgbMatch[2], 10),
    b: Number.parseInt(rgbMatch[3], 10),
  };
};

const mixRgb = (
  start: { r: number; g: number; b: number },
  end: { r: number; g: number; b: number },
  ratio: number,
): string => {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const red = Math.round(start.r * (1 - clampedRatio) + end.r * clampedRatio);
  const green = Math.round(
    start.g * (1 - clampedRatio) + end.g * clampedRatio,
  );
  const blue = Math.round(
    start.b * (1 - clampedRatio) + end.b * clampedRatio,
  );
  return `rgb(${red}, ${green}, ${blue})`;
};

export const getDamageColorFromChance = (chance: number): string | undefined => {
  if (!Number.isFinite(chance) || chance <= 0) {
    return undefined;
  }

  const baseline = 0.3;
  const clampedChance = Math.max(0, Math.min(1, chance));
  const rootStyle = getComputedStyle(document.documentElement);
  const beginColor = parseCssColorToRgb(
    rootStyle.getPropertyValue("--damage-ko-color-begin"),
  );
  const endColor = parseCssColorToRgb(
    rootStyle.getPropertyValue("--damage-ko-color"),
  );

  if (beginColor && endColor) {
    const startColor = parseCssColorToRgb(
      mixRgb(beginColor, endColor, baseline),
    );
    if (startColor) {
      return mixRgb(startColor, endColor, clampedChance);
    }
  }

  const fallbackRatio = baseline + (1 - baseline) * clampedChance;
  const channel = Math.round(255 * (1 - fallbackRatio));
  return `rgb(255, ${channel}, ${channel})`;
};


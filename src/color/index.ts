export class RGBColor {
    red: number;

    green: number;

    blue: number;

    alpha: number;

    constructor(red: number, green: number, blue: number, alpha = 1.0) {
      this.red = red;
      this.green = green;
      this.blue = blue;

      let clampedAlpha = alpha > 1 ? 1 : alpha;
      clampedAlpha = clampedAlpha < 0 ? 0 : clampedAlpha;

      this.alpha = clampedAlpha;
    }

    static fromHex(hex: string): RGBColor {
      const stripped = hex.split('#')[1];

      const rs = stripped.substr(0, 2);
      const gs = stripped.substr(2, 2);
      const bs = stripped.substr(4, 2);

      return new RGBColor(parseInt(rs, 16), parseInt(gs, 16), parseInt(bs, 16));
    }

    static paddedHex(value: number): string {
      const hex = value.toString(16);

      return hex.length > 1 ? hex : `0${hex}`;
    }

    toHex(): string {
      return `#${RGBColor.paddedHex(this.red)}${RGBColor.paddedHex(this.green)}${RGBColor.paddedHex(this.blue)}${RGBColor.paddedHex(Math.round(this.alpha * 255))}`;
    }
}

export const getComponentByPercentage: (
  component1: number,
  component2: number,
  percentage: number,
  integerOnly?: boolean
) => number = (c1, c2, p, io = true) => {
  const diff = c2 - c1;

  let rawValue = 0;

  if (diff < 0) {
    rawValue = c1 - Math.abs(diff * p);
  } else {
    rawValue = c1 + Math.abs(diff * p);
  }

  return io ? Math.round(rawValue) : rawValue;
};

export const getColorInGradient: (
  gradient: RGBColor[],
  gradientPosition: number
) => RGBColor = (gradient, gradPosition) => {
  const gradSectionWidth = 100.0 / (gradient.length - 1);

  const positionFloor = Math.floor(gradPosition / gradSectionWidth);
  const positionCeiling = Math.ceil(gradPosition / gradSectionWidth);

  const floorColor = gradient[positionFloor];
  const ceilingColor = gradient[positionCeiling];

  const pctWithinSection = (gradPosition - (positionFloor * gradSectionWidth)) / gradSectionWidth;

  const color = new RGBColor(
    getComponentByPercentage(floorColor.red, ceilingColor.red, pctWithinSection),
    getComponentByPercentage(floorColor.green, ceilingColor.green, pctWithinSection),
    getComponentByPercentage(floorColor.blue, ceilingColor.blue, pctWithinSection),
  );

  return color;
};

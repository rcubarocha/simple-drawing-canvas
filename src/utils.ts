import { ICoords, StrokeFillStyle, CanvasConfig } from './canvas';

export const drawLine = function drawLine(
  ctx: CanvasRenderingContext2D,
  from: ICoords,
  to: ICoords,
  width: number,
  style: StrokeFillStyle,
): void {
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = style;
  ctx.stroke();
  ctx.closePath();
};

export const getCanvasCoordsFromEvent = function getCanvasCoordsFromEvent(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  canvasConfig: CanvasConfig,
): ICoords {
  const { x, y } = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - x) * canvasConfig.scale,
    y: (event.clientY - y) * canvasConfig.scale,
  };
};

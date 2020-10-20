import { ICoords, StrokeFillStyle, CanvasConfig } from '../canvas';

export const drawLine = function drawLine(
  ctx: CanvasRenderingContext2D,
  from: ICoords,
  to: ICoords,
  width: number,
  style: StrokeFillStyle,
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
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
    x: (event.clientX - x) * canvasConfig.scale.x,
    y: (event.clientY - y) * canvasConfig.scale.y,
  };
};

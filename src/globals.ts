// eslint-disable-next-line no-unused-vars
import { ICoords, StrokeFillStyle } from './canvas';

const drawLine = function drawLine(
  ctx: CanvasRenderingContext2D,
  from: ICoords,
  to: ICoords,
  width: number,
  style: StrokeFillStyle,
) {
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

export default drawLine;

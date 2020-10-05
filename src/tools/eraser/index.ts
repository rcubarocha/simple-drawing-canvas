import type {
  CanvasTool, MouseEventToolCallback, ToolActionItemCallback, ICoords,
} from '../../canvas';
import drawLine from '../../globals';

export interface EraserTool extends CanvasTool<'eraser'> {
  size: number,
}

export const eraserMouseEventCallback: MouseEventToolCallback<EraserTool> = function eraserMouseEventCallback(
  e,
  c,
  cc,
  tc,
  ah,
) {
  const toolConfig = { ...tc };

  if (e.type === 'mousedown') {
    toolConfig.state = 'down';
    const { x, y } = c.getBoundingClientRect();

    const eCoords: ICoords = {
      x: (e.clientX - x) * cc.scale,
      y: (e.clientY - y) * cc.scale,
    };

    return {
      endCurrentAction: false,
      canvasActionItem: {
        toolConfig,
        coords: eCoords,
      },
    };
  }

  if (e.type === 'mousemove') {
    if (ah.length < 1) {
      return null;
    }

    const prevToolState = ah[ah.length - 1].toolConfig.state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent Eraser Tool State');
    }

    toolConfig.state = 'move';
    const { x, y } = c.getBoundingClientRect();

    const eCoords: ICoords = {
      x: (e.clientX - x) * cc.scale,
      y: (e.clientY - y) * cc.scale,
    };

    return {
      endCurrentAction: false,
      canvasActionItem: {
        toolConfig,
        coords: eCoords,
      },
    };
  }

  if (e.type === 'mouseup') {
    if (ah.length < 1) {
      return null;
    }

    const prevToolState = ah[ah.length - 1].toolConfig.state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent Eraser Tool State');
    }

    toolConfig.state = 'up';
    const { x, y } = c.getBoundingClientRect();

    const eCoords: ICoords = {
      x: (e.clientX - x) * cc.scale,
      y: (e.clientY - y) * cc.scale,
    };

    return {
      endCurrentAction: true,
      canvasActionItem: {
        toolConfig,
        coords: eCoords,
      },
    };
  }

  throw Error('Inconsistent Eraser Tool State');
};

export const eraserDrawingCallback: ToolActionItemCallback<EraserTool> = function eraserDrawingCallback(c, a, h) {
  // If the action is from the mousedown event, do nothing.
  if (a.toolConfig.state === 'down') {
    return;
  }

  if (a.toolConfig.state === 'move' || a.toolConfig.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'destination-out';

    drawLine(ctx, h[h.length - 1].coords, a.coords, a.toolConfig.size, '#ffffff');

    return;
  }

  throw Error(`Unrecognized Eraser Tool State: ${a.toolConfig.state}`);
};

import type {
  CanvasTool, MouseEventToolCallback, ToolActionItemCallback, ICoords,
} from '../../canvas';
import drawLine from '../../globals';

interface EraserTool extends CanvasTool {
  size: number,
}

declare module '../../canvas' {
  export interface CanvasTools {
    eraser?: EraserTool,
  }
}

export const eraserMouseEventCallback: MouseEventToolCallback = function eraserMouseEventCallback(e, c, cc, tc, ah) {
  const toolConfig = { ...tc };

  if (e.type === 'mousedown') {
    toolConfig.toolState = 'down';
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

    const prevToolState = ah[ah.length - 1].toolConfig.toolState;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent Eraser Tool State');
    }

    toolConfig.toolState = 'move';
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

    const prevToolState = ah[ah.length - 1].toolConfig.toolState;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent Eraser Tool State');
    }

    toolConfig.toolState = 'up';
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

export const eraserDrawingCallback: ToolActionItemCallback = function eraserDrawingCallback(c, a, h) {
  // If the action is from the mousedown event, do nothing.
  if (a.toolConfig.toolState === 'down') {
    return;
  }

  if (a.toolConfig.toolState === 'move' || a.toolConfig.toolState === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'destination-out';

    drawLine(ctx, h[h.length - 1].coords, a.coords, a.toolConfig.size, '#ffffff');

    return;
  }

  throw Error(`Unrecognized Eraser Tool State: ${a.toolConfig.toolState}`);
};

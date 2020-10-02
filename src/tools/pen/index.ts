import type {
  // eslint-disable-next-line no-unused-vars
  CanvasTool, MouseEventToolCallback, ToolActionItemCallback, StrokeFillStyle, ICoords,
} from '../../canvas';
import drawLine from '../../globals';

interface PenTool extends CanvasTool {
  size: number,
  style: StrokeFillStyle
}

declare module '../../canvas' {
  export interface CanvasTools {
    pen?: PenTool,
  }
}

export const penMouseEventCallback: MouseEventToolCallback = function penMouseEventCallback(e, c, cc, tc, ah) {
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
      throw Error('Inconsistent State');
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
      throw Error('Inconsistent State');
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

  throw Error('Inconsistent Pen Tool State');
};

export const penDrawingCallback: ToolActionItemCallback = function penDrawingCallback(c, a, h) {
  if (a.toolConfig.toolState === 'down') {
    // If the action is from the mousedown event, do nothing.
    return;
  }

  if (a.toolConfig.toolState === 'move' || a.toolConfig.toolState === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    drawLine(ctx, h[h.length - 1].coords, a.coords, a.toolConfig.size, a.toolConfig.style);

    return;
  }

  throw Error(`Unrecognized Pen Tool State: ${a.toolConfig.toolState}`);
};

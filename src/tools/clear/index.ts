import type {
  // eslint-disable-next-line no-unused-vars
  CanvasTool, MouseEventToolCallback, ToolActionItemCallback, StrokeFillStyle, ICoords,
} from '../../canvas';

interface ClearTool extends CanvasTool {
  style: StrokeFillStyle
}

declare module '../../canvas' {
  export interface CanvasTools {
    clear?: ClearTool,
  }
}

export const clearMouseEventCallback: MouseEventToolCallback = function clearMouseEventCallback(e, c, cc, tc, ah) {
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

  if (e.type === 'mouseup') {
    if (ah.length < 1) {
      return null;
    }

    const prevToolState = ah[ah.length - 1].toolConfig.toolState;

    if (prevToolState !== 'down') {
      throw Error('Inconsistent Clear Tool State');
    }

    // If the mouse up event happens outside the canvas, invalidate the whole action
    if (e.target !== c) {
      throw Error('Up Event Outside Canvas');
    } else {
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
  }

  return null;
};

export const clearDrawingCallback: ToolActionItemCallback = function clearDrawingCallback(c, a) {
  if (a.toolConfig.toolState === 'down') {
    // If the action is from the mousedown event, do nothing.
    return;
  }

  if (a.toolConfig.toolState === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, c.width, c.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);

    return;
  }

  throw Error(`Unrecognized Clear Tool State: ${a.toolConfig.toolState}`);
};

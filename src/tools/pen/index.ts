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

    // TODO: Issue when up event outside of canvas
    // if (e.target !== c) {
    //   throw Error('Up Event Outside Canvas');
    // } else {
    //   toolConfig.toolState = 'up';
    //   const { x, y } = c.getBoundingClientRect();

    //   const eCoords: ICoords = {
    //     x: (e.clientX - x) * cc.scale,
    //     y: (e.clientY - y) * cc.scale,
    //   };

    //   return {
    //     endCurrentAction: true,
    //     canvasActionItem: {
    //       toolConfig,
    //       coords: eCoords,
    //     },
    //   };

    //   // const { x, y } = this.canvasElement.getBoundingClientRect();

    //   // const newCoords: ICoords = {
    //   //   x: (e.clientX - x) * this.canvasConfig.scale,
    //   //   y: (e.clientY - y) * this.canvasConfig.scale,
    //   // };

    //   // const action: CanvasAction = {
    //   //   tool: 'pen',
    //   //   start: { ...this.toolConfig.lastCoords },
    //   //   end: { ...newCoords },
    //   //   size: this.toolConfig.size,
    //   //   color: this.toolConfig.style,
    //   // };

    //   // this.history.actionsHistory[this.history.actionsHistory.length - 1].push(action);

    //   // this.performCanvasAction(action);

    //   // this.toolConfig.lastCoords = newCoords;
    // }
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

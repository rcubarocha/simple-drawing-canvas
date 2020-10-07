import type {
  CanvasTool, MouseEventToolCallback, ToolActionStepCallback, StrokeFillStyle,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface PenTool extends CanvasTool<'pen'> {
  size: number,
  style: StrokeFillStyle
}

export const penMouseEventCallback: MouseEventToolCallback<PenTool> = function penMouseEventCallback(
  event, canvas, canvasConfig, toolConfig, actionHistory,
) {
  const tc = toolConfig;

  if (event.type === 'mousedown') {
    tc.state = 'down';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      endCurrentAction: false,
      canvasActionStep: {
        toolConfig: tc,
        coords: eCoords,
      },
    };
  }

  if (event.type === 'mousemove') {
    if (actionHistory.length < 1) {
      return null;
    }

    const prevToolState = actionHistory[actionHistory.length - 1].toolConfig.state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent State');
    }

    tc.state = 'move';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      endCurrentAction: false,
      canvasActionStep: {
        toolConfig: tc,
        coords: eCoords,
      },
    };
  }

  if (event.type === 'mouseup') {
    if (actionHistory.length < 1) {
      return null;
    }

    const prevToolState = actionHistory[actionHistory.length - 1].toolConfig.state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent State');
    }

    tc.state = 'up';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      endCurrentAction: true,
      canvasActionStep: {
        toolConfig: tc,
        coords: eCoords,
      },
    };
  }

  throw Error('Inconsistent Pen Tool State');
};

export const penDrawingCallback: ToolActionStepCallback<PenTool> = function penDrawingCallback(c, a, h) {
  // If the action is from the mousedown event, do nothing.
  if (a.toolConfig.state === 'down') {
    return;
  }

  if (a.toolConfig.state === 'move' || a.toolConfig.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    drawLine(ctx, h[h.length - 1].coords, a.coords, a.toolConfig.size, a.toolConfig.style);

    return;
  }

  throw Error(`Unrecognized Pen Tool State: ${a.toolConfig.state}`);
};

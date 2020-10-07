import type {
  CanvasTool, MouseEventToolCallback, ToolActionStepCallback,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface EraserTool extends CanvasTool<'eraser'> {
  size: number,
}

export const eraserMouseEventCallback: MouseEventToolCallback<EraserTool> = function eraserMouseEventCallback(
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
      throw Error('Inconsistent Eraser Tool State');
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
      throw Error('Inconsistent Eraser Tool State');
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

  throw Error('Inconsistent Eraser Tool State');
};

export const eraserDrawingCallback: ToolActionStepCallback<EraserTool> = function eraserDrawingCallback(c, a, h) {
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

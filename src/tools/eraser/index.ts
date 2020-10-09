import type {
  MouseEventToolCallback, ToolActionStepCallback, ToolConfig,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface EraserTool extends ToolConfig{
  size: number,
}

export const eraserMouseEventCallback: MouseEventToolCallback<EraserTool> = function eraserMouseEventCallback(
  event, canvas, canvasConfig, toolConfig, actionHistory,
) {
  if (event.type === 'mousedown') {
    const state = 'down';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      endCurrentAction: false,
      actionStep: {
        tool: { ...toolConfig },
        coords: eCoords,
        state,
      },
    };
  }

  if (event.type === 'mousemove') {
    if (actionHistory.steps.length < 1) {
      return null;
    }

    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent Eraser Tool State');
    }

    const state = 'move';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      endCurrentAction: false,
      actionStep: {
        tool: { ...toolConfig },
        coords: eCoords,
        state,
      },
    };
  }

  if (event.type === 'mouseup') {
    if (actionHistory.steps.length < 1) {
      return null;
    }

    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent Eraser Tool State');
    }

    const state = 'up';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      endCurrentAction: true,
      actionStep: {
        tool: { ...toolConfig },
        coords: eCoords,
        state,
      },
    };
  }

  throw Error('Inconsistent Eraser Tool State');
};

export const eraserDrawingCallback: ToolActionStepCallback<EraserTool> = function eraserDrawingCallback(c, a, h) {
  // If the action is from the mousedown event, do nothing.
  if (a.state === 'down') {
    return;
  }

  if (a.state === 'move' || a.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'destination-out';

    drawLine(ctx, h.steps[h.steps.length - 1].coords, a.coords, a.tool.size, '#ffffff');

    return;
  }

  throw Error(`Unrecognized Eraser Tool State: ${a.state}`);
};

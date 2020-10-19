import type {
  MouseEventToolCallback, ToolActionStepCallback,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface EraserTool {
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
        tool: toolConfig,
        coords: eCoords,
        state,
      },
      replacePrevStep: false,
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
        tool: toolConfig,
        coords: eCoords,
        state,
      },
      replacePrevStep: false,
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
        tool: toolConfig,
        coords: eCoords,
        state,
      },
      replacePrevStep: false,
    };
  }

  throw Error('Inconsistent Eraser Tool State');
};

export const eraserDrawingCallback: ToolActionStepCallback<EraserTool> = function eraserDrawingCallback(
  actionStep, actionHistory, canvas,
) {
  // If the action is from the mousedown event, do nothing.
  if (actionStep.state === 'down') {
    return;
  }

  if (actionStep.state === 'move' || actionStep.state === 'up') {
    const ctx = canvas.getContext('2d')!;

    ctx.globalCompositeOperation = 'destination-out';

    drawLine(
      ctx,
      actionHistory.steps[actionHistory.steps.length - 1].coords,
      actionStep.coords,
      actionStep.tool.size,
      '#ffffff',
    );

    return;
  }

  throw Error(`Unrecognized Eraser Tool State: ${actionStep.state}`);
};

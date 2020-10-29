import type {
  ToolMouseEventCallback, ToolActionStepCallback,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface EraserTool {
  size: number,
}

export const eraserMouseEventCallback: ToolMouseEventCallback<EraserTool> = function eraserMouseEventCallback(
  event, canvas, canvasConfig, toolConfig, actionHistory,
) {
  if (event.type === 'mousedown') {
    const state = 'down';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      actionStatus: 'continue',
      actionUpdate: {
        actionStep: {
          tool: toolConfig,
          coords: eCoords,
          state,
        },
        replacePrevStep: false,
      },
    };
  }

  if (event.type === 'mousemove') {
    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Eraser: Inconsistent Action State - Move Event without previous Down or Move event');
    }

    const state = 'move';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      actionStatus: 'continue',
      actionUpdate: {
        actionStep: {
          tool: toolConfig,
          coords: eCoords,
          state,
        },
        replacePrevStep: false,
      },
    };
  }

  if (event.type === 'mouseup') {
    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Eraser: Inconsistent Action State - Up Event without previous Down or Move event');
    }

    const state = 'up';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      actionStatus: 'end',
      actionUpdate: {
        actionStep: {
          tool: toolConfig,
          coords: eCoords,
          state,
        },
        replacePrevStep: false,
      },
    };
  }

  throw Error(`Eraser: Unhandled Event Type: ${event.type}`);
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

  throw Error(`Eraser: Unrecognized Action Step State: ${actionStep.state}`);
};

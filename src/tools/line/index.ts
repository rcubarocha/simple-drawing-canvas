import type {
  ToolMouseEventCallback, ToolActionStepCallback, StrokeFillStyle,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface LineTool {
  size: number,
  style: StrokeFillStyle
}

export const lineMouseEventCallback: ToolMouseEventCallback<LineTool> = function lineMouseEventCallback(
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
      throw Error('Line: Inconsistent Action State - Move Event without previous Down or Move event');
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
        replacePrevStep: prevToolState === 'move',
      },
    };
  }

  if (event.type === 'mouseup') {
    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Line: Inconsistent Action State - Up Event without previous Down or Move event');
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
        replacePrevStep: true,
      },
    };
  }

  throw Error(`Line: Unhandled Event Type: ${event.type}`);
};

export const lineDrawingCallback: ToolActionStepCallback<LineTool> = function lineDrawingCallback(
  actionStep, actionHistory, canvas,
) {
  // If the action is from the mousedown event, do nothing.
  if (actionStep.state === 'down') {
    return;
  }

  if (actionStep.state === 'move' || actionStep.state === 'up') {
    const ctx = canvas.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    drawLine(
      ctx,
      actionHistory.steps[actionHistory.steps.length - 1].coords,
      actionStep.coords,
      actionStep.tool.size,
      actionStep.tool.style,
    );

    return;
  }

  throw Error(`Line: Unrecognized Action Step State: ${actionStep.state}`);
};

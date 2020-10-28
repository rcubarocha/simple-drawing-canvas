import type {
  ToolMouseEventCallback, ToolActionStepCallback, StrokeFillStyle,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface PenTool {
  size: number,
  style: StrokeFillStyle
}

export const penMouseEventCallback: ToolMouseEventCallback<PenTool> = function penMouseEventCallback(
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
      throw Error('Pen: Inconsistent Action State - Move Event without previous Down or Move event');
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
      throw Error('Pen: Inconsistent Action State - Up Event without previous Down or Move event');
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

  throw Error(`Pen: Unhandled Event Type: ${event.type}`);
};

export const penDrawingCallback: ToolActionStepCallback<PenTool> = function penDrawingCallback(
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

  throw Error(`Pen: Unrecognized Action Step State: ${actionStep.state}`);
};

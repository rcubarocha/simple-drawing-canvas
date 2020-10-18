import type {
  MouseEventToolCallback, ToolActionStepCallback, StrokeFillStyle,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface LineTool {
  size: number,
  style: StrokeFillStyle
}

export const lineMouseEventCallback: MouseEventToolCallback<LineTool> = function lineMouseEventCallback(
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
      throw Error('Inconsistent State');
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
      replacePrevStep: prevToolState === 'move',
    };
  }

  if (event.type === 'mouseup') {
    if (actionHistory.steps.length < 1) {
      return null;
    }

    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent State');
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
      replacePrevStep: true,
    };
  }

  throw Error('Inconsistent Line Tool State');
};

export const lineDrawingCallback: ToolActionStepCallback<LineTool> = function lineDrawingCallback(c, a, h) {
  // If the action is from the mousedown event, do nothing.
  if (a.state === 'down') {
    return;
  }

  if (a.state === 'move' || a.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    drawLine(ctx, h.steps[h.steps.length - 1].coords, a.coords, a.tool.size, a.tool.style);

    return;
  }

  throw Error(`Unrecognized Line Tool State: ${a.state}`);
};

import type {
  MouseEventToolCallback, ToolActionStepCallback, StrokeFillStyle,
} from '../../canvas';
import { getCanvasCoordsFromEvent } from '../../utils';

export interface ClearTool {
  fill?: StrokeFillStyle
}

export const clearMouseEventCallback: MouseEventToolCallback<ClearTool> = function clearMouseEventCallback(
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

  if (event.type === 'mouseup') {
    if (actionHistory.steps.length < 1) {
      return null;
    }

    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down') {
      throw Error('Inconsistent Clear Tool State');
    }

    // If the mouse up event happens outside the canvas, invalidate the whole action
    if (event.target !== canvas) {
      throw Error('Up Event Outside Canvas');
    } else {
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
  }

  return null;
};

export const clearDrawingCallback: ToolActionStepCallback<ClearTool> = function clearDrawingCallback(c, a) {
  if (a.state === 'down') {
    // If the action is from the mousedown event, do nothing.
    return;
  }

  if (a.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, c.width, c.height);

    if (a.tool.fill) {
      ctx.fillStyle = a.tool.fill;
      ctx.fillRect(0, 0, c.width, c.height);
    }

    return;
  }

  throw Error(`Unrecognized Clear Tool State: ${a.state}`);
};

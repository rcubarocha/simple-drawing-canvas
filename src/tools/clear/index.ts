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

export const clearDrawingCallback: ToolActionStepCallback<ClearTool> = function clearDrawingCallback(
  actionStep, _, canvas, canvasConfig,
) {
  if (actionStep.state === 'down') {
    // If the action is from the mousedown event, do nothing.
    return;
  }

  if (actionStep.state === 'up') {
    const ctx = canvas.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (actionStep.tool.fill) {
      ctx.fillStyle = actionStep.tool.fill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (canvasConfig.background) {
      if (canvasConfig.background instanceof Image) {
        ctx.drawImage(canvasConfig.background, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = canvasConfig.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    return;
  }

  throw Error(`Unrecognized Clear Tool State: ${actionStep.state}`);
};

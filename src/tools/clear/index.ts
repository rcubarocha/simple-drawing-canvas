import type {
  MouseEventToolCallback, ToolActionStepCallback, ToolConfig, ToolWithState,
} from '../../canvas';
import { getCanvasCoordsFromEvent } from '../../utils';

export type ClearTool = ToolConfig

export const clearMouseEventCallback: MouseEventToolCallback<ClearTool> = function clearMouseEventCallback(
  event, canvas, canvasConfig, toolConfig, actionHistory,
) {
  const tc: ToolWithState<ClearTool> = {
    ...toolConfig,
    state: '',
  };

  if (event.type === 'mousedown') {
    tc.state = 'down';

    const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

    return {
      endCurrentAction: false,
      actionStep: {
        toolConfig: tc,
        coords: eCoords,
      },
    };
  }

  if (event.type === 'mouseup') {
    if (actionHistory.steps.length < 1) {
      return null;
    }

    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].toolConfig.state;

    if (prevToolState !== 'down') {
      throw Error('Inconsistent Clear Tool State');
    }

    // If the mouse up event happens outside the canvas, invalidate the whole action
    if (event.target !== canvas) {
      throw Error('Up Event Outside Canvas');
    } else {
      tc.state = 'up';

      const eCoords = getCanvasCoordsFromEvent(event, canvas, canvasConfig);

      return {
        endCurrentAction: true,
        actionStep: {
          toolConfig: tc,
          coords: eCoords,
        },
      };
    }
  }

  return null;
};

export const clearDrawingCallback: ToolActionStepCallback<ClearTool> = function clearDrawingCallback(c, a) {
  if (a.toolConfig.state === 'down') {
    // If the action is from the mousedown event, do nothing.
    return;
  }

  if (a.toolConfig.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, c.width, c.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);

    return;
  }

  throw Error(`Unrecognized Clear Tool State: ${a.toolConfig.state}`);
};

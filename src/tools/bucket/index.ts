import type {
  MouseEventToolCallback, ToolActionStepCallback, StrokeFillStyle, ToolWithState, ToolConfig,
} from '../../canvas';
import { getCanvasCoordsFromEvent } from '../../utils';

export interface BucketTool extends ToolConfig {
  style: StrokeFillStyle
}

export const bucketMouseEventCallback: MouseEventToolCallback<BucketTool> = function bucketMouseEventCallback(
  event, canvas, canvasConfig, toolConfig, actionHistory,
) {
  const tc: ToolWithState<BucketTool> = {
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
      throw Error('Inconsistent State');
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

export const bucketDrawingCallback: ToolActionStepCallback<BucketTool> = function bucketDrawingCallback(c, a) {
  if (a.toolConfig.state === 'down') {
    // If the action is from the mousedown event, do nothing.
    return;
  }

  if (a.toolConfig.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = a.toolConfig.style;
    ctx.fillRect(0, 0, c.width, c.height);

    return;
  }

  throw Error(`Unrecognized Bucket Tool State: ${a.toolConfig.state}`);
};

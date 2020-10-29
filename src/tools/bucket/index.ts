import type {
  ToolMouseEventCallback, ToolActionStepCallback, StrokeFillStyle,
} from '../../canvas';
import { getCanvasCoordsFromEvent } from '../../utils';

export interface BucketTool {
  style: StrokeFillStyle
}

export const bucketMouseEventCallback: ToolMouseEventCallback<BucketTool> = function bucketMouseEventCallback(
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

  // Ignore Move events
  if (event.type === 'mousemove') {
    return {
      actionStatus: 'continue',
    };
  }

  if (event.type === 'mouseup') {
    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].state;

    if (prevToolState !== 'down') {
      throw Error('Bucket: Inconsistent Action State - Up Event without previous Down event');
    }

    // If the mouse up event happens outside the canvas, invalidate the whole action
    if (event.target !== canvas) {
      return {
        actionStatus: 'cancel',
      };
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

  throw Error(`Bucket: Unhandled Event Type: ${event.type}`);
};

export const bucketDrawingCallback: ToolActionStepCallback<BucketTool> = function bucketDrawingCallback(
  actionStep, _, canvas,
) {
  if (actionStep.state === 'down') {
    // If the action is from the mousedown event, do nothing.
    return;
  }

  if (actionStep.state === 'up') {
    const ctx = canvas.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = actionStep.tool.style;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return;
  }

  throw Error(`Bucket: Unrecognized Action Step State: ${actionStep.state}`);
};

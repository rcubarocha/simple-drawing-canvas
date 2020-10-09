import type {
  MouseEventToolCallback, ToolActionStepCallback, StrokeFillStyle, ToolWithState, ToolConfig,
} from '../../canvas';
import { drawLine, getCanvasCoordsFromEvent } from '../../utils';

export interface PenTool extends ToolConfig {
  size: number,
  style: StrokeFillStyle
}

export const penMouseEventCallback: MouseEventToolCallback<PenTool> = function penMouseEventCallback(
  event, canvas, canvasConfig, toolConfig, actionHistory,
) {
  const tc: ToolWithState<PenTool> = {
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

  if (event.type === 'mousemove') {
    if (actionHistory.steps.length < 1) {
      return null;
    }

    const prevToolState = actionHistory.steps[actionHistory.steps.length - 1].toolConfig.state;

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent State');
    }

    tc.state = 'move';

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

    if (prevToolState !== 'down' && prevToolState !== 'move') {
      throw Error('Inconsistent State');
    }

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

  throw Error('Inconsistent Pen Tool State');
};

export const penDrawingCallback: ToolActionStepCallback<PenTool> = function penDrawingCallback(c, a, h) {
  // If the action is from the mousedown event, do nothing.
  if (a.toolConfig.state === 'down') {
    return;
  }

  if (a.toolConfig.state === 'move' || a.toolConfig.state === 'up') {
    const ctx = c.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    drawLine(ctx, h.steps[h.steps.length - 1].coords, a.coords, a.toolConfig.size, a.toolConfig.style);

    return;
  }

  throw Error(`Unrecognized Pen Tool State: ${a.toolConfig.state}`);
};

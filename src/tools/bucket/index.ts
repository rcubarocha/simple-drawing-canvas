import type {
  CanvasTool, MouseEventToolCallback, ToolActionItemCallback, StrokeFillStyle, ICoords,
} from '../../canvas';

export interface BucketTool extends CanvasTool<'bucket'> {
  style: StrokeFillStyle
}

export const bucketMouseEventCallback: MouseEventToolCallback<BucketTool> = function bucketMouseEventCallback(
  e,
  c,
  cc,
  tc,
  ah,
) {
  const toolConfig = { ...tc };

  if (e.type === 'mousedown') {
    toolConfig.state = 'down';
    const { x, y } = c.getBoundingClientRect();

    const eCoords: ICoords = {
      x: (e.clientX - x) * cc.scale,
      y: (e.clientY - y) * cc.scale,
    };

    return {
      endCurrentAction: false,
      canvasActionItem: {
        toolConfig,
        coords: eCoords,
      },
    };
  }

  if (e.type === 'mouseup') {
    if (ah.length < 1) {
      return null;
    }

    const prevToolState = ah[ah.length - 1].toolConfig.state;

    if (prevToolState !== 'down') {
      throw Error('Inconsistent State');
    }

    // If the mouse up event happens outside the canvas, invalidate the whole action
    if (e.target !== c) {
      throw Error('Up Event Outside Canvas');
    } else {
      toolConfig.state = 'up';
      const { x, y } = c.getBoundingClientRect();

      const eCoords: ICoords = {
        x: (e.clientX - x) * cc.scale,
        y: (e.clientY - y) * cc.scale,
      };

      return {
        endCurrentAction: true,
        canvasActionItem: {
          toolConfig,
          coords: eCoords,
        },
      };
    }
  }

  return null;
};

export const bucketDrawingCallback: ToolActionItemCallback<BucketTool> = function bucketDrawingCallback(c, a) {
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

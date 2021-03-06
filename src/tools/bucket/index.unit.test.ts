import { bucketMouseEventCallback, bucketDrawingCallback, BucketTool } from '.';
import { CanvasConfig, BaseCanvasController, CanvasAction } from '../../canvas';

describe('bucket mouse event callback', () => {
  let canvas: HTMLCanvasElement;
  let canvasConfig: CanvasConfig;
  let toolConfig: BucketTool;
  let mockController: BaseCanvasController;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    
    canvas.getBoundingClientRect = jest.fn(() => ({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      top: 50,
      right: 150,
      bottom: 150,
      left: 50,
    } as DOMRect));

    canvasConfig = {
      scale: { x: 3, y: 3 },
      width: 300,
      height: 300,
      background: null
    };

    toolConfig = {
      style: "#333333"
    };

    mockController = {
      getCanvas: () => canvas,
      undo: (_) => {},
      redo: (_) => {},
      playDrawing: () => {},
      getDataURL: (t, q) => '',
      setBackground: (s) => {},
      teardown: () => {},
    }

  });

  // Mouse Down

  test('mouse down event should return correct result with Action Step', () => {
  
    const me = new window.MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
    });
    
    const res = bucketMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'bucket', steps: [] });

    const expected = {
      actionStatus: 'continue',
      actionUpdate: {
        actionStep: {
          tool: toolConfig,
          coords: {
            x: 150,
            y: 150,
          },
          state: 'down',
        },
        replacePrevStep: false,
      },
    };

    expect(res).toEqual(expected);
  });

  // Mouse Move

  test('mouse move event should always return result to ignore the event', () => {
  
    const me = new window.MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
    });

    const expected = {
      actionStatus: 'continue',
    };
    
    expect (bucketMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'bucket', steps: [] })).toEqual(expected);

    const downPrevStep = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'up',
    };
    
    expect (bucketMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'bucket', steps: [ downPrevStep ] })).toEqual(expected);
  });

  // Mouse Up

  test('mouse up event should throw if action history is in inconsistent state', () => {
  
    const me = new window.MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
    });

    // Make sure the target of the event is the canvas
    canvas.dispatchEvent(me);

    const badPreviousStep = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'up',
    };
    
    expect(() => {
      bucketMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'bucket', steps: [ badPreviousStep ] })
    }).toThrow();
  });

  test('mouse up event should return result to cancel whole action if not targeting canvas', () => {
  
    const me = new window.MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
    });

    const prevDown = {
      tool: toolConfig,
      coords: {
        x: 250,
        y: 250,
      },
      state: 'down',
    };

    const expected = {
      actionStatus: 'cancel',
    };
    
    expect(bucketMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'bucket', steps: [ prevDown ] })).toEqual(expected);
  });

  test('mouse up event should return correct result with Action Step', () => {
  
    const me = new window.MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
    });

    // Make sure the target of the event is the canvas
    canvas.dispatchEvent(me);

    const prevDown = {
      tool: toolConfig,
      coords: {
        x: 250,
        y: 250,
      },
      state: 'down',
    };
    
    const resPrevDown = bucketMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'bucket', steps: [ prevDown ] });

    const expected = {
      actionStatus: 'end',
      actionUpdate: {
        actionStep: {
          tool: toolConfig,
          coords: {
            x: 300,
            y: 300,
          },
          state: 'up',
        },
        replacePrevStep: false,
      },
    };

    expect(resPrevDown).toEqual(expected);
  });

  // Other

  test('any other event should throw', () => {
  
    const me = new window.MouseEvent('mousewheel', {
      clientX: 150,
      clientY: 150,
    });
    
    expect(() => {
      bucketMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'bucket', steps: [ ] });
    }).toThrow();
  });

});

// Drawing

describe('bucket mouse action step callback', () => {
  let canvas: HTMLCanvasElement;
  let canvasConfig: CanvasConfig;
  let ctx: CanvasRenderingContext2D;
  let toolConfig: BucketTool;
  let actionHistory: CanvasAction<'bucket', BucketTool>

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    
    canvas.getBoundingClientRect = jest.fn(() => ({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      top: 50,
      right: 150,
      bottom: 150,
      left: 50,
    } as DOMRect));

    ctx = canvas.getContext('2d')!;

    canvasConfig = {
      scale: { x: 3, y: 3 },
      width: 300,
      height: 300,
      background: null
    };

    toolConfig = {
      style: '#333333',
    };

    actionHistory = {
      tool: 'bucket',
      steps: [],
    };
  });

  test('the down step should not alter the canvas', () => {
  
    const downStep = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'down',
    }

    bucketDrawingCallback(downStep, actionHistory, canvas, canvasConfig);

    expect(canvas.toDataURL()).toMatchSnapshot()
  });

  test('the up step should result in canvas with solid fill according to config', () => {

    // Dirty up the canvas a bit
    ctx.fillStyle = "#666666";
    ctx.fillRect(50, 100, 200, 100);
  
    const downStep = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'down',
    };

    const upStep = {
      tool: toolConfig,
      coords: {
        x: 50,
        y: 250,
      },
      state: 'up'
    };

    actionHistory.steps.push(downStep);

    bucketDrawingCallback(upStep, actionHistory, canvas, canvasConfig);

    expect(canvas.toDataURL()).toMatchSnapshot()
  });
});
import { lineMouseEventCallback, lineDrawingCallback, LineTool } from '.';
import { CanvasConfig, BaseCanvasController, CanvasAction } from '../../canvas';

describe('line mouse event callback', () => {
  let canvas: HTMLCanvasElement;
  let canvasConfig: CanvasConfig;
  let toolConfig: LineTool;
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
      scale: 3,
      width: 300,
      height: 300,
      background: null
    };

    toolConfig = {
      size: 10,
      style: '#333333',
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
    
    const res = lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [] });

    const expected = {
      endCurrentAction: false,
      actionStep: {
        tool: toolConfig,
        coords: {
          x: 150,
          y: 150,
        },
        state: 'down',
      },
      replacePrevStep: false,
    };

    expect(res).toEqual(expected);
  });

  // Mouse Move

  test('mouse move event should return null if no action history exists', () => {
  
    const me = new window.MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
    });
    
    expect (lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [] })).toBeNull();
  });

  test('mouse move event should throw if action history is in inconsistent state', () => {
  
    const me = new window.MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
    });

    const badPreviousStep = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'up',
    };
    
    expect(() => {
      lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [ badPreviousStep ] })
    }).toThrow();
  });

  test('mouse move event should return correct result with Action Step', () => {
  
    const me = new window.MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
    });

    const prevDown = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'down',
    };

    const prevMove = {
      tool: toolConfig,
      coords: {
        x: 200,
        y: 200,
      },
      state: 'move',
    };
    
    const resPrevDown = lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [ prevDown ] });
    
    const resPrevMove = lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [ prevDown, prevMove ] });

    const prevDownExpected = {
      endCurrentAction: false,
      actionStep: {
        tool: toolConfig,
        coords: {
          x: 300,
          y: 300,
        },
        state: 'move',
      },
      replacePrevStep: false,
    };

    const prevMoveExected = {
      endCurrentAction: false,
      actionStep: {
        tool: toolConfig,
        coords: {
          x: 300,
          y: 300,
        },
        state: 'move',
      },
      replacePrevStep: true,
    };

    expect(resPrevDown).toEqual(prevDownExpected);
    expect(resPrevMove).toEqual(prevMoveExected);
  });

  // Mouse Up

  test('mouse up event should return null if no action history exists', () => {
  
    const me = new window.MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
    });
    
    expect (lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [] })).toBeNull();
  });

  test('mouse up event should throw if action history is in inconsistent state', () => {
  
    const me = new window.MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
    });

    const badPreviousStep = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'up',
    };
    
    expect(() => {
      lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [ badPreviousStep ] })
    }).toThrow();
  });

  test('mouse up event should return correct result with Action Step', () => {
  
    const me = new window.MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
    });

    const prevDown = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'down',
    };

    const prevMove = {
      tool: toolConfig,
      coords: {
        x: 200,
        y: 200,
      },
      state: 'move',
    };
    
    const resPrevDown = lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [ prevDown ] });
    
    const resPrevMove = lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [ prevDown, prevMove ] });

    const expected = {
      endCurrentAction: true,
      actionStep: {
        tool: toolConfig,
        coords: {
          x: 300,
          y: 300,
        },
        state: 'up',
      },
      replacePrevStep: true,
    };

    expect(resPrevDown).toEqual(expected);
    expect(resPrevMove).toEqual(expected);
  });

  // Other

  test('any other event should throw', () => {
  
    const me = new window.MouseEvent('mousewheel', {
      clientX: 150,
      clientY: 150,
    });
    
    expect(() => {
      lineMouseEventCallback.call(mockController, me, canvas, canvasConfig, toolConfig, { tool: 'line', steps: [ ] })
    }).toThrow();
  });

});

// Drawing

describe('line mouse action step callback', () => {
  let canvas: HTMLCanvasElement;
  let canvasConfig: CanvasConfig;
  let toolConfig: LineTool;
  let actionHistory: CanvasAction<'line', LineTool>

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
      scale: 3,
      width: 300,
      height: 300,
      background: null
    };

    toolConfig = {
      size: 10,
      style: '#333333',
    };

    actionHistory = {
      tool: 'line',
      steps: [],
    }
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

    lineDrawingCallback(downStep, actionHistory, canvas, canvasConfig);

    expect(canvas.toDataURL()).toMatchSnapshot()
  });

  test('the move step should alter the canvas accordingly', () => {
  
    const downStep = {
      tool: toolConfig,
      coords: {
        x: 150,
        y: 150,
      },
      state: 'down',
    };

    const moveStep = {
      tool: toolConfig,
      coords: {
        x: 250,
        y: 50,
      },
      state: 'move'
    };

    actionHistory.steps.push(downStep);

    lineDrawingCallback(moveStep, actionHistory, canvas, canvasConfig);

    expect(canvas.toDataURL()).toMatchSnapshot()
  });

  test('the up step should alter the canvas accordingly', () => {
  
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

    lineDrawingCallback(upStep, actionHistory, canvas, canvasConfig);

    expect(canvas.toDataURL()).toMatchSnapshot()
  });
});
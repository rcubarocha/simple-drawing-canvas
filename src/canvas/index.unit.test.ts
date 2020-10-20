import { DrawingCanvasController, MouseEventToolCallback, MouseEventToolCallbackResult, ToolActionStepCallback, CanvasAction, CurrentToolNotAssignedError, UnknownToolError } from '.';
import { noConflict } from 'lodash';

interface MockTool {
  mockOpt: number;
}

type MockToolName = 'mock';

const mockMouseCB = jest.fn<MouseEventToolCallbackResult<MockTool>, Parameters<MouseEventToolCallback<MockTool>>>()
const mockDrawCB = jest.fn<void, Parameters<ToolActionStepCallback<MockTool>>>()

describe('canvas controller', () => {
  let canvas: HTMLCanvasElement;
  let mockToolConfig: MockTool;
  let controller: DrawingCanvasController<MockToolName, { mock: MockTool }>;

  beforeEach(() => {
    canvas = document.createElement('canvas');

    // jsdom does not implement layout-related properties
    jest.spyOn(canvas, 'offsetWidth', 'get').mockReturnValue(100);
    jest.spyOn(canvas, 'offsetHeight', 'get').mockReturnValue(100);
    
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

    mockToolConfig = {
      mockOpt: 0,
    }
  });

  describe('constructor', () => {
    test('should configure a square the canvas properly', () => {
      const controller = new DrawingCanvasController(canvas, 350, 350, '#ffffff');
  
      expect(canvas.width).toBe(350);
      expect(canvas.height).toBe(350);
      expect(controller['canvasConfig']).toEqual({
        width: 350,
        height: 350,
        scale: { x: 3.5, y: 3.5 },
        background: '#ffffff',
      });
      expect(canvas.toDataURL()).toMatchSnapshot()
    });
  
    test('should configure a non-square the canvas properly', () => {
      const controller = new DrawingCanvasController(canvas, 550, 300, '#ffffff');
  
      expect(canvas.width).toBe(550);
      expect(canvas.height).toBe(300);
      expect(controller['canvasConfig']).toEqual({
        width: 550,
        height: 300,
        scale: { x: 5.5, y: 3 },
        background: '#ffffff',
      });
      expect(canvas.toDataURL()).toMatchSnapshot()
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      controller = new DrawingCanvasController(canvas, 300, 300, '#ffffff');
    });

    test('should accept a properly configured tool', () => {
      expect(controller['toolConfig'].mock).not.toBeDefined();
  
      controller.addTool('mock', mockMouseCB, mockDrawCB, mockToolConfig);
  
      expect(controller['toolConfig'].mock).toBeDefined();
    });
    
    describe('updating the selected tool', () => {
      test('getting the current tool when it has not been set should throw', () => {
        expect(() => {
          controller.getCurrentTool();
        }).toThrowError(CurrentToolNotAssignedError);
      });
  
      test('selecting a tool that has not been configured should throw', () => {
        expect(() => {
          controller.setCurrentTool('wrong' as any);
        }).toThrowError(UnknownToolError);
      });
  
      test('selecting a tool that has been previously configured should be accepted', () => {
        controller.addTool('mock', mockMouseCB, mockDrawCB, mockToolConfig);
  
        controller.setCurrentTool('mock');
  
        expect(controller['currentTool']).toEqual('mock');
      });
  
      test('getting the current tool when properly set should return it', () => {
        controller.addTool('mock', mockMouseCB, mockDrawCB, mockToolConfig);
  
        controller['currentTool'] = 'mock';
  
        expect(controller.getCurrentTool()).toEqual('mock');
      });
    });
  
    describe('obtaining data url for canvas', () => {
      let ctx: CanvasRenderingContext2D;
  
      beforeEach(() => {
        ctx = canvas.getContext('2d')!;
  
        // Make the canvas not empty
        ctx.fillStyle = "#999999";
        ctx.fillRect(50, 50, 200, 200);
      });
  
      test('should return correct data url with default settings', () => {
        expect(controller.getDataURL()).toEqual(canvas.toDataURL());
      });
  
      test('should return correct data url with custom settings', () => {
        expect(controller.getDataURL('image/jpeg', 0.5)).toEqual(canvas.toDataURL('image/jpeg', 0.5));
      });
    });
  
    describe('manipulating background', () => {
      test('setting a color should fill the canvas with that color and redraw existing content on top', () => {
  
        let mockPerformAllCanvasActions = jest.fn<void, Parameters<typeof controller['performAllCanvasActions']>>();
  
        controller['performAllCanvasActions'] = mockPerformAllCanvasActions;
  
        controller.setBackground('#336699');
  
        expect(controller['canvasConfig'].background).toEqual('#336699');
        expect(mockPerformAllCanvasActions).toHaveBeenCalledTimes(1);
        expect(canvas.toDataURL()).toMatchSnapshot();
      });
    });
  
    describe('manipulate action history', () => {
      let history: CanvasAction<MockToolName, MockTool>[];
      let redrawMock: jest.SpyInstance<any, unknown[]> // typeof controller['performAllCanvasActions'] 
  
      beforeEach(() => {
        history = [
          {
            tool: 'mock',
            steps: [
            ],
          },
          {
            tool: 'mock',
            steps: [],
          },
          {
            tool: 'mock',
            steps: [],
          },
          {
            tool: 'mock',
            steps: [],
          },
        ];
  
        // any assertion used to access a private method for spying
        redrawMock = jest.spyOn(controller as any, 'performAllCanvasActions').mockImplementation(() => {});
      });
  
      test('undo should move latest history item to the front of undo list and redraw if required', () => {
        controller['history'] = {
          actionsHistory: [
            history[0],
            history[1],
            history[2],
          ],
          undoHistory: [
            history[3],
          ],
        }
  
        controller.undo(false);
  
        expect(controller['history'].actionsHistory.length).toEqual(2);
        expect(controller['history'].undoHistory.length).toEqual(2);
        expect(controller['history'].undoHistory[1]).toBe(history[2]);
        expect(redrawMock).not.toHaveBeenCalled()
  
        controller.undo(true);
  
        expect(controller['history'].actionsHistory.length).toEqual(1);
        expect(controller['history'].undoHistory.length).toEqual(3);
        expect(controller['history'].undoHistory[2]).toBe(history[1]);
        expect(redrawMock).toHaveBeenCalledTimes(1);
  
      });
  
      test('undo should not alter an empty history and redraw if required', () => {
        controller['history'] = {
          actionsHistory: [],
          undoHistory: [],
        }
  
        controller.undo(false);
  
        expect(controller['history'].actionsHistory.length).toEqual(0);
        expect(controller['history'].undoHistory.length).toEqual(0);
        expect(redrawMock).not.toHaveBeenCalled();
  
        controller.undo(true);
  
        expect(controller['history'].actionsHistory.length).toEqual(0);
        expect(controller['history'].undoHistory.length).toEqual(0);
        expect(redrawMock).toHaveBeenCalledTimes(1);
      });
  
      test('redo should move latest undo item to the front of the history and redraw if required', () => {
        controller['history'] = {
          actionsHistory: [
            history[0],
          ],
          undoHistory: [
            history[3],
            history[2],
            history[1],
          ],
        }
  
        controller.redo(false);
  
        expect(controller['history'].actionsHistory.length).toEqual(2);
        expect(controller['history'].undoHistory.length).toEqual(2);
        expect(controller['history'].actionsHistory[1]).toBe(history[1]);
        expect(redrawMock).not.toHaveBeenCalled()
  
        controller.redo(true);
  
        expect(controller['history'].actionsHistory.length).toEqual(3);
        expect(controller['history'].undoHistory.length).toEqual(1);
        expect(controller['history'].actionsHistory[2]).toBe(history[2]);
        expect(redrawMock).toHaveBeenCalledTimes(1);
  
      });
  
      test('redo should not alter an empty history and redraw if required', () => {
        controller['history'] = {
          actionsHistory: [],
          undoHistory: [],
        }
  
        controller.redo(false);
  
        expect(controller['history'].actionsHistory.length).toEqual(0);
        expect(controller['history'].undoHistory.length).toEqual(0);
        expect(redrawMock).not.toHaveBeenCalled();
  
        controller.redo(true);
  
        expect(controller['history'].actionsHistory.length).toEqual(0);
        expect(controller['history'].undoHistory.length).toEqual(0);
        expect(redrawMock).toHaveBeenCalledTimes(1);
      });
    });
  
    describe('resetting the controller', () => {
      test('should clear history and the canvas', () => {
        let ctx = canvas.getContext('2d')!;
  
        // Make the canvas not empty
        ctx.fillStyle = "#999999";
        ctx.fillRect(50, 50, 200, 200);
  
        controller['history'] = {
          actionsHistory: [
            {
              tool: 'mock',
              steps: [],
            },
            {
              tool: 'mock',
              steps: [],
            },
          ],
          undoHistory: [
            {
              tool: 'mock',
              steps: [],
            },
          ],
        };
  
        controller.reset();
  
        expect(controller['history'].actionsHistory.length).toBe(0);
        expect(controller['history'].undoHistory.length).toBe(0);
  
        expect(canvas.toDataURL()).toMatchSnapshot();
      });
    });
  });
});
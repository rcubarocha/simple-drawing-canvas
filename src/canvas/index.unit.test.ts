import { DrawingCanvasController, ToolMouseEventCallback, ToolMouseEventCallbackResult, ToolActionStepCallback, CanvasAction, CurrentToolNotAssignedError, UnknownToolError } from '.';
import { noConflict } from 'lodash';

interface MockTool {
  mockOpt: number;
}

type MockToolName = 'mock';

const mockMouseCB = jest.fn<ReturnType<ToolMouseEventCallback<MockTool>>, Parameters<ToolMouseEventCallback<MockTool>>>()
const mockDrawCB = jest.fn<ReturnType<ToolActionStepCallback<MockTool>>, Parameters<ToolActionStepCallback<MockTool>>>()

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
    
    describe('getting and setting tool configurations', () => {
      beforeEach(() => {
        controller.addTool('mock', mockMouseCB, mockDrawCB, mockToolConfig);
      });

      test('getting all tool configurations should return correctly', () => {
        expect(controller.getToolConfigs()).toEqual({
          mock: mockToolConfig
        });
      });

      test('getting tool configuration for unregistered tool should throw', () => {
        expect(() => {
          controller.getToolConfig('some-unregistered-tool' as any)
        }).toThrowError(UnknownToolError);
      });

      test('getting tool configuration for registered tool should correctly return the configuration', () => {
        expect(controller.getToolConfig('mock')).toEqual(mockToolConfig);
      });

      test('setting all tool configurations should overwrite them correctly', () => {
        const newConfig = {
          mock: {
            mockOpt: 1000,
          }
        };

        controller.setToolConfigs(newConfig);

        expect(controller['toolConfig']).not.toEqual({ mock: mockToolConfig });
        expect(controller['toolConfig']).toEqual(newConfig);
      });

      test('setting a configuration for an unregistered tool should throw', () => {
        const newConfig = {
          mock: {
            mockOpt: 1000,
          }
        };

        expect(() => {
          controller.setToolConfig('some-unregistered-tool' as any, newConfig);
        }).toThrow(UnknownToolError);
      });

      test('setting a configuration for a registered tool should overwrite it correctly', () => {
        const newConfig = {
          mockOpt: 1000,
        };

        controller.setToolConfig('mock', newConfig);

        expect(controller['toolConfig'].mock).not.toEqual(mockToolConfig);
        expect(controller['toolConfig'].mock).toEqual(newConfig);
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
      let redrawMock = jest.fn<void, Parameters<typeof controller['performAllCanvasActions']>>();
  
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
  
        controller['performAllCanvasActions'] = redrawMock;
        
        redrawMock.mockReset();
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

      test('playing the history should perform as many actions as there are in history', (done) => {
        controller['history'].actionsHistory = history;
        
        const spyPerformCanvasAction = jest.spyOn(controller as any, 'performCanvasAction');

        controller.playDrawing(() => {
          expect(spyPerformCanvasAction).toHaveBeenCalledTimes(history.length);
          done();
        });
      });

      test('playing the history when should not perform any actions', () => {
        const spyPerformCanvasAction = jest.spyOn(controller as any, 'performCanvasAction');

        controller.playDrawing();
        
        expect(spyPerformCanvasAction).toHaveBeenCalledTimes(0);
      });
    });

    describe('mouse event handler', () => {
      beforeEach(() => {
        controller.addTool('mock', mockMouseCB, mockDrawCB, mockToolConfig);
        mockMouseCB.mockReset();
      });

      test('should throw when no Current Tool has been set', () => {
        const mouseEvent = new MouseEvent('mousedown', {
          buttons: 1,
          clientX: 70,
          clientY: 130,
        });
        expect(() => { controller['onCanvasEvent'](mouseEvent) }).toThrowError(CurrentToolNotAssignedError);
      });

      test('should return without calling the tool callback when event is down/move without primary button down', () => {
        controller.setCurrentTool('mock');

        const downEvent = new MouseEvent('mousedown', {
          buttons: 2,
          clientX: 70,
          clientY: 130,
        });

        controller['onCanvasEvent'](downEvent);

        expect(mockMouseCB).toHaveBeenCalledTimes(0);

        const moveEvent = new MouseEvent('mousemove', {
          buttons: 2,
          clientX: 70,
          clientY: 130,
        });
  
        controller['onCanvasEvent'](moveEvent);

        expect(mockMouseCB).toHaveBeenCalledTimes(0);
      });

      describe('when event is forwarded to tool callback', () => {
        beforeEach(() => {
          controller.setCurrentTool('mock');
          mockDrawCB.mockReset();
        });

        test('if tool callback ignores event, no action should be performed', () => {

          // Response with 'continue' status but no Action Step update ignores the event
          mockMouseCB.mockImplementation(() => ({ actionStatus: 'continue' }));
  
          const downEvent = new MouseEvent('mousedown', {
            buttons: 1,
            clientX: 70,
            clientY: 130,
          });
  
          controller['onCanvasEvent'](downEvent);
  
          expect(mockMouseCB).toHaveBeenCalledTimes(1);
          expect(mockDrawCB).toHaveBeenCalledTimes(0);
  
          const moveEvent = new MouseEvent('mousemove', {
            buttons: 1,
            clientX: 70,
            clientY: 130,
          });
  
          controller['onCanvasEvent'](moveEvent);
  
          expect(mockMouseCB).toHaveBeenCalledTimes(2);
          expect(mockDrawCB).toHaveBeenCalledTimes(0);
  
          const upEvent = new MouseEvent('mouseup', {
            buttons: 0,
            clientX: 70,
            clientY: 130,
          });
  
          controller['onCanvasEvent'](upEvent);
  
          expect(mockMouseCB).toHaveBeenCalledTimes(3);
          expect(mockDrawCB).toHaveBeenCalledTimes(0);
        });

        test('if tool callback returns a response it should perform the action accordingly', () => {

          mockMouseCB.mockImplementationOnce(() => ({
            actionStatus: 'continue',
            actionUpdate: {
              replacePrevStep: false,
              actionStep: {
                tool: mockToolConfig,
                coords: {
                  x: 60,
                  y: 240,
                },
                state: 'down',
              },
            },
          })).mockImplementationOnce(() => ({
            actionStatus: 'continue',
            actionUpdate: {
              replacePrevStep: false,
              actionStep: {
                tool: mockToolConfig,
                coords: {
                  x: 60,
                  y: 240,
                },
                state: 'move',
              },
            },
          })).mockImplementationOnce(() => ({
            actionStatus: 'end',
            actionUpdate: {
              replacePrevStep: true,
              actionStep: {
                tool: mockToolConfig,
                coords: {
                  x: 60,
                  y: 240,
                },
                state: 'up',
              },
            },
          }));
  
          const downEvent = new MouseEvent('mousedown', {
            buttons: 1,
            clientX: 70,
            clientY: 130,
          });
  
          controller['onCanvasEvent'](downEvent);
  
          expect(mockMouseCB).toHaveBeenCalledTimes(1);
          expect(mockDrawCB).toHaveBeenCalledTimes(1);
  
          const moveEvent = new MouseEvent('mousemove', {
            buttons: 1,
            clientX: 70,
            clientY: 130,
          });
  
          controller['onCanvasEvent'](moveEvent);
  
          expect(mockMouseCB).toHaveBeenCalledTimes(2);
          expect(mockDrawCB).toHaveBeenCalledTimes(2);
  
          const upEvent = new MouseEvent('mouseup', {
            buttons: 0,
            clientX: 70,
            clientY: 130,
          });
  
          controller['onCanvasEvent'](upEvent);
  
          expect(mockMouseCB).toHaveBeenCalledTimes(3);
          // Per the Mouse Callback return value, the mouse up event will replace the mouse move event
          // This results in an extra call to the Mock Tool Draw Callback when redrawing everything
          // up to (but not including) this step will replace
          expect(mockDrawCB).toHaveBeenCalledTimes(4);
        });
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
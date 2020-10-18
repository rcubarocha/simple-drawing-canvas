import { PenTool, penMouseEventCallback, penDrawingCallback } from "./tools/pen";
import { DrawingCanvasController } from "./canvas";

describe('tool & controller integration', () => {
  let canvas: HTMLCanvasElement;
  let penConfig: PenTool;
  let controller: DrawingCanvasController<'pen', { pen: PenTool }>;

  beforeEach(() => {
    canvas = document.createElement('canvas');

    penConfig = {
      size: 15,
      style: '#2495A4',
    }

    // jsdom does not implement layout-related properties
    jest.spyOn(canvas, 'offsetWidth', 'get').mockReturnValue(100);
    
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

    controller = new DrawingCanvasController(canvas, 300, 300, 'pen');

    controller.addTool('pen', penMouseEventCallback, penDrawingCallback, penConfig);
  });

  test('draw on canvas through mouse events', () => {
    const mouseEvents: MouseEvent[] = [
      new MouseEvent('mousedown', {
        clientX: 70,
        clientY: 130,
      }),
      new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 70,
      }),
      new MouseEvent('mousemove', {
        clientX: 130,
        clientY: 130,
      }),
      new MouseEvent('mousemove', {
        clientX: 70,
        clientY: 130,
      }),
      new MouseEvent('mouseup', {
        clientX: 70,
        clientY: 130,
      }),
    ];

    mouseEvents.forEach((ev) => {
      canvas.dispatchEvent(ev);
    });

    expect(canvas.toDataURL()).toMatchSnapshot();
  });

  test('draw on canvas through touch events', () => {
    // jsdom does not implement document.elementFromPoint
    // Provide our own mock implementation
    document['elementFromPoint'] = (x, y) => { return canvas }

    // jsdom does not define Touch constructor so we assert objects with necessary info
    const touchEvents: TouchEvent[] = [
      new TouchEvent('touchstart', {
        changedTouches: [
          {
            clientX: 70,
            clientY: 130,
          } as Touch
        ]
      }),
      new TouchEvent('touchmove', {
        changedTouches: [
          {
            clientX: 100,
            clientY: 70,
          } as Touch
        ]
      }),
      new TouchEvent('touchmove', {
        changedTouches: [
          {
            clientX: 130,
            clientY: 130,
          } as Touch
        ]
      }),
      new TouchEvent('touchmove', {
        changedTouches: [
          {
            clientX: 70,
            clientY: 130,
          } as Touch
        ]
      }),
      new TouchEvent('touchend', {
        changedTouches: [
          {
            clientX: 70,
            clientY: 130,
          } as Touch
        ]
      }),
    ];

    touchEvents.forEach((ev) => {
      canvas.dispatchEvent(ev);
    });

    expect(canvas.toDataURL()).toMatchSnapshot();
  });
});
import { getCanvasCoordsFromEvent, drawLine } from '.';

describe('get canvas-space coords from mouse event and controller config', () => {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 300;

  c.getBoundingClientRect = jest.fn(() => ({
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    top: 50,
    right: 150,
    bottom: 150,
    left: 50,
  } as DOMRect));

  test('in-bounds events should be converted correctly', () => {
  
    let me = new window.MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
    });
  
    const center = getCanvasCoordsFromEvent(me, c, {
      scale: 3, width: 300, height: 300, background: null,
    });
  
    expect(center).toEqual({ x: 150, y: 150 });
  
    me = new window.MouseEvent('mousedown', {
      clientX: 50,
      clientY: 50,
    });
  
    const topLeft = getCanvasCoordsFromEvent(me, c, {
      scale: 3, width: 300, height: 300, background: null,
    });
  
    expect(topLeft).toEqual({ x: 0, y: 0 });
  
    me = new window.MouseEvent('mousedown', {
      clientX: 150,
      clientY: 50,
    });
  
    const topRight = getCanvasCoordsFromEvent(me, c, {
      scale: 3, width: 300, height: 300, background: null,
    });
  
    expect(topRight).toEqual({ x: 300, y: 0 });
  
    me = new window.MouseEvent('mousedown', {
      clientX: 50,
      clientY: 150,
    });
  
    const bottomLeft = getCanvasCoordsFromEvent(me, c, {
      scale: 3, width: 300, height: 300, background: null,
    });
  
    expect(bottomLeft).toEqual({ x: 0, y: 300 });
  
    me = new window.MouseEvent('mousedown', {
      clientX: 150,
      clientY: 150,
    });
  
    const bottomRight = getCanvasCoordsFromEvent(me, c, {
      scale: 3, width: 300, height: 300, background: null,
    });
  
    expect(bottomRight).toEqual({ x: 300, y: 300 });
  });

  test('out-of-bounds events should be converted correctly', () => {
  
    const me = new window.MouseEvent('mousedown', {
      clientX: 20,
      clientY: 245,
    });
  
    const outOfBounds = getCanvasCoordsFromEvent(me, c, {
      scale: 3, width: 300, height: 300, background: null,
    });
  
    expect(outOfBounds).toEqual({ x: -90, y: 585 });
  });

});

describe('drawLine should accurately draw on canvas', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;

    ctx = canvas.getContext('2d')!;
  });

  test('should match the same triangle snapshot', () => {
    drawLine(ctx, { x: 50, y: 250 }, { x: 150, y: 50 }, 10, '#000000');
    drawLine(ctx, { x: 150, y: 50 }, { x: 250, y: 250 }, 10, '#000000');
    drawLine(ctx, { x: 250, y: 250 }, { x: 50, y: 250 }, 10, '#000000');

    expect(canvas.toDataURL()).toMatchSnapshot()
  });
});
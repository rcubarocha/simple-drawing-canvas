import { RGBColor } from '../color';

interface ICoords {
    x: number,
    y: number,
}

type TouchEventsMap = Pick<HTMLElementEventMap, 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel'>;

export type CanvasToolType = 'pen' | 'bucket' | 'eraser' | 'clear';

type CanvasAction = {
    tool: CanvasToolType,
    start?: ICoords,
    end?: ICoords,
    size?: number,
    color?: string,
}

interface IDrawingCanvas {
    canvasElement: HTMLCanvasElement,
    width: number,
    height: number,
    scale: number,
    toolType: CanvasToolType
    brushSize: number,
    brushColor: RGBColor,
    lastCoords: ICoords,
    toolDown: boolean,
    actionsHistory: CanvasAction[],
    historyIndex: number,
    initCanvas(): void,
}

type MouseEventCallback = (e: MouseEvent) => void;

export class DrawingCanvasController implements IDrawingCanvas {
    canvasElement: HTMLCanvasElement;

    width: number;

    height: number;

    scale: number = 1;

    toolType: CanvasToolType = 'pen';

    brushSize: number = 5;

    brushColor: RGBColor = new RGBColor(0, 0, 0);

    lastCoords: ICoords = {
      x: 0,
      y: 0,
    };

    toolDown: boolean = false;

    actionsHistory: CanvasAction[] = [];

    historyIndex: number = 0;

    // boundMouseCallback = this.onCanvasEvent.bind(this);
    // boundTouchCallback = this.onTouchEvent.bind(this);

    canvasFocusCallback = (e: TouchEvent) => {
      if (e.target === this.canvasElement) {
        e.preventDefault();
      }
    }

    static eventMap = new Map<keyof TouchEventsMap, keyof HTMLElementEventMap>([
      ['touchstart', 'mousedown'],
      ['touchmove', 'mousemove'],
      ['touchend', 'mouseup'],
      ['touchcancel', 'mouseup'],
    ]);

    toolFuncs = new Map<CanvasToolType, MouseEventCallback>([
      ['pen', this.penTool.bind(this)],
      ['clear', this.clearTool.bind(this)],
      ['bucket', this.bucketTool.bind(this)],
      ['eraser', this.eraserTool.bind(this)],
    ]);

    constructor(canvasElement: HTMLCanvasElement, width: number, height: number) {
      this.canvasElement = canvasElement;
      this.width = width;
      this.height = height;

      this.initCanvas();
    }

    // eslint-disable-next-line class-methods-use-this
    drawLine(ctx: CanvasRenderingContext2D, from: ICoords, to: ICoords, width: number, color: string) {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = width;
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.closePath();
    }

    performCanvasAction(action: CanvasAction) {
      const ctx = this.canvasElement.getContext('2d')!;

      switch (action.tool) {
        case 'pen':
          ctx.globalCompositeOperation = 'source-over';

          this.drawLine(ctx, action.start!, action.end!, action.size!, action.color!);
          break;
        case 'clear':

          ctx.globalCompositeOperation = 'source-over';

          ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
          break;
        case 'bucket':
          ctx.globalCompositeOperation = 'source-over';

          ctx.fillStyle = action.color!;
          ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
          break;
        case 'eraser':
          ctx.globalCompositeOperation = 'destination-out';

          this.drawLine(ctx, action.start!, action.end!, action.size!, '#ffffff');
          break;
        default:
          break;
      }
    }

    penTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolDown = true;
        const { x, y } = this.canvasElement.getBoundingClientRect();
        this.lastCoords.x = (e.clientX - x) * this.scale;
        this.lastCoords.y = (e.clientY - y) * this.scale;
      } else if (e.type === 'mousemove') {
        if (!this.toolDown) return;

        const { x, y } = this.canvasElement.getBoundingClientRect();

        const newCoords: ICoords = {
          x: (e.clientX - x) * this.scale,
          y: (e.clientY - y) * this.scale,
        };

        const action: CanvasAction = {
          tool: 'pen',
          start: { ...this.lastCoords },
          end: { ...newCoords },
          size: this.brushSize,
          color: this.brushColor.toHex(),
        };

        this.actionsHistory.push(action);

        this.performCanvasAction(action);

        this.lastCoords = newCoords;
      } else if (e.type === 'mouseup') {
        if (!this.toolDown) return;

        if (e.target === this.canvasElement) {
          const { x, y } = this.canvasElement.getBoundingClientRect();

          const newCoords: ICoords = {
            x: (e.clientX - x) * this.scale,
            y: (e.clientY - y) * this.scale,
          };

          const action: CanvasAction = {
            tool: 'pen',
            start: { ...this.lastCoords },
            end: { ...newCoords },
            size: this.brushSize,
            color: this.brushColor.toHex(),
          };

          this.actionsHistory.push(action);

          this.performCanvasAction(action);

          this.lastCoords = newCoords;
        }

        this.toolDown = false;
      }
    }

    clearTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolDown = true;
      } else if (e.type === 'mouseup') {
        if (!this.toolDown) return;

        // Only clear the canvas if the click release happens inside the canvas
        if (e.target === this.canvasElement) {
          const action: CanvasAction = { tool: 'clear' };

          this.actionsHistory.push(action);

          this.performCanvasAction(action);
        }

        this.toolDown = false;
      }
    }

    bucketTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolDown = true;
      } else if (e.type === 'mouseup') {
        if (!this.toolDown) return;

        // Only clear the canvas if the click release happens inside the canvas
        if (e.target === this.canvasElement) {
          // const action: CanvasAction = { tool: 'bucket', color: this.brushColor.toHex() };

          // this.actionsHistory.push(action);

          // this.performCanvasAction(action);

          // this.playDrawing();
          this.performAllCanvasActions();
        }

        this.toolDown = false;
      }
    }

    eraserTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolDown = true;
        const { x, y } = this.canvasElement.getBoundingClientRect();
        this.lastCoords.x = (e.clientX - x) * this.scale;
        this.lastCoords.y = (e.clientY - y) * this.scale;
      } else if (e.type === 'mousemove') {
        if (!this.toolDown) return;

        const { x, y } = this.canvasElement.getBoundingClientRect();

        const newCoords = {
          x: (e.clientX - x) * this.scale,
          y: (e.clientY - y) * this.scale,
        };

        const action: CanvasAction = {
          tool: 'eraser', start: { ...this.lastCoords }, end: { ...newCoords }, size: this.brushSize,
        };

        this.actionsHistory.push(action);

        this.performCanvasAction(action);

        this.lastCoords = newCoords;
      } else if (e.type === 'mouseup') {
        if (!this.toolDown) return;

        if (e.target === this.canvasElement) {
          const { x, y } = this.canvasElement.getBoundingClientRect();

          const newCoords = {
            x: (e.clientX - x) * this.scale,
            y: (e.clientY - y) * this.scale,
          };

          const action: CanvasAction = {
            tool: 'eraser', start: { ...this.lastCoords }, end: { ...newCoords }, size: this.brushSize,
          };

          this.actionsHistory.push(action);

          this.performCanvasAction(action);

          this.lastCoords = newCoords;
        }

        this.toolDown = false;
      }
    }

    performAllCanvasActions() {
      const action: CanvasAction = { tool: 'clear' };

      this.performCanvasAction(action);

      this.actionsHistory.pop();

      this.actionsHistory.forEach((ca) => {
        this.performCanvasAction(ca);
      });
    }

    playDrawing() {
      const action: CanvasAction = { tool: 'clear' };

      this.performCanvasAction(action);

      this.historyIndex = 0;

      const interval = setInterval(() => {
        if (this.actionsHistory.length > 0) this.performCanvasAction(this.actionsHistory[this.historyIndex]!);

        if (this.historyIndex < this.actionsHistory.length - 1) {
          this.historyIndex += 1;
        } else {
          clearInterval(interval);
        }
      }, 5);
    }

    onCanvasEvent = (e: MouseEvent) => {
        // console.log('-- On Canvas Event --');
        // console.log({ type: e.type, target: e.target, current: e.currentTarget });
        this.toolFuncs.get(this.toolType)!(e);
    }

    onTouchEvent = (e: TouchEvent) => {
      // console.log('-- On Touch Event --');
      // console.log({ type: e.type, target: e.target, current: e.currentTarget });

      const me = new MouseEvent(DrawingCanvasController.eventMap.get(e.type as keyof TouchEventsMap)!, {
        clientX: e.changedTouches[0].clientX,
        clientY: e.changedTouches[0].clientY,
        bubbles: true,
      });

      /**
       * TouchEnd always targets the target of the preceding TouchStart event
       * even if the pointer has moved away from that element
       * We get the element over which the TouchEnd happened using elementFromPoint()
       * so we can accurately trigger the synthetic mouse event
       */
      const doc = this.canvasElement.ownerDocument!;
      const touchEndElement = doc.elementFromPoint(me.clientX, me.clientY)!;

      if (doc && touchEndElement) {
        touchEndElement.dispatchEvent(me);
      }

      // if (e.type === 'touchend' || e.type === 'touchcancel') {
      //     this.canvasElement.ownerDocument!.dispatchEvent(me);
      //     console.log('Dispathcing MouseUP from TouchEnd/Cancel')
      //     // this.canvasElement.dispatchEvent(me);
      // }
      // else {
      //     this.canvasElement.dispatchEvent(me);
      // }
    }

    onWindowResize = () => {
      this.scale = this.width / this.canvasElement.offsetWidth;

      this.canvasElement.style.height = `${this.height / this.scale}px`;
    }

    reset() {
      this.actionsHistory = [];
      this.historyIndex = 0;
      this.lastCoords = {
        x: 0,
        y: 0,
      };
      this.toolDown = false;
    }

    teardown() {
      DrawingCanvasController.eventMap.forEach((_, k) => {
        if (k === 'touchend' || k === 'touchcancel') {
                this.canvasElement.ownerDocument!.removeEventListener(k, this.onTouchEvent);
        } else {
          this.canvasElement.removeEventListener(k, this.onTouchEvent);
        }

            // Prevent scrolling on touch interfaces when event occurs on canvas
            this.canvasElement.ownerDocument!.body.removeEventListener(k, this.canvasFocusCallback, { capture: false });
      });

      const w = this.canvasElement.ownerDocument!.defaultView;

      if (w) {
        w.removeEventListener('resize', this.onWindowResize);
      }

      this.canvasElement.removeEventListener('mousedown', this.onCanvasEvent);
      this.canvasElement.removeEventListener('mousemove', this.onCanvasEvent);
      this.canvasElement.ownerDocument!.removeEventListener('mouseup', this.onCanvasEvent);
    }

    initCanvas() {
      this.canvasElement.width = this.width;
      this.canvasElement.height = this.height;

      const w = this.canvasElement.ownerDocument!.defaultView;

      // w && (w.onresize = this.onWindowResize);
      if (w) {
        w.addEventListener('resize', this.onWindowResize);
      }

      this.onWindowResize();

      DrawingCanvasController.eventMap.forEach((_, k) => {
        if (k === 'touchend' || k === 'touchcancel') {
                this.canvasElement.ownerDocument!.addEventListener(k, this.onTouchEvent);
        } else {
          this.canvasElement.addEventListener(k, this.onTouchEvent);
        }

        // Prevent scrolling on touch interfaces when event occurs on canvas
        const { body } = this.canvasElement.ownerDocument!;

        body.addEventListener(k, this.canvasFocusCallback, { capture: false, passive: false });
      });

      this.canvasElement.addEventListener('mousedown', this.onCanvasEvent);
      this.canvasElement.addEventListener('mousemove', this.onCanvasEvent);
      // Setting listener to the document so lifting the mouse button anywhere will register as the tool being lifted
      this.canvasElement.ownerDocument!.addEventListener('mouseup', this.onCanvasEvent);
    }
}

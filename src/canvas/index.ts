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
    actionsHistory: CanvasAction[][],
    undoHistory: CanvasAction[][],
    historyIndex: number,
    actionIndex: number,
    initCanvas(): void,
    teardown(): void,
    undo(redraw?: boolean): void,
    redo(redraw?: boolean): void,
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

    actionsHistory: CanvasAction[][] = [];

    undoHistory: CanvasAction[][] = [];

    historyIndex: number = 0;

    actionIndex: number = 0;

    // boundMouseCallback = this.onCanvasEvent.bind(this);
    // boundTouchCallback = this.onTouchEvent.bind(this);

    canvasFocusCallback(e: TouchEvent) {
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

      this.canvasFocusCallback = this.canvasFocusCallback.bind(this);
      this.onCanvasEvent = this.onCanvasEvent.bind(this);
      this.onTouchEvent = this.onTouchEvent.bind(this);
      this.onWindowResize = this.onWindowResize.bind(this);

      this.initCanvas();
    }

    drawLine(from: ICoords, to: ICoords, width: number, color: string) {
      const ctx = this.canvasElement.getContext('2d')!;

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

          this.drawLine(action.start!, action.end!, action.size!, action.color!);
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

          this.drawLine(action.start!, action.end!, action.size!, '#ffffff');
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

        this.startNewAction();
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

        this.actionsHistory[this.actionsHistory.length - 1].push(action);

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

          this.actionsHistory[this.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);

          this.lastCoords = newCoords;
        }

        this.toolDown = false;
      }
    }

    clearTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolDown = true;

        this.startNewAction();
      } else if (e.type === 'mouseup') {
        if (!this.toolDown) return;

        // Only clear the canvas if the click release happens inside the canvas
        if (e.target === this.canvasElement) {
          const action: CanvasAction = { tool: 'clear' };

          this.actionsHistory[this.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);
        }

        this.toolDown = false;
      }
    }

    bucketTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolDown = true;

        this.startNewAction();
      } else if (e.type === 'mouseup') {
        if (!this.toolDown) return;

        // Only clear the canvas if the click release happens inside the canvas
        if (e.target === this.canvasElement) {
          const action: CanvasAction = { tool: 'bucket', color: this.brushColor.toHex() };

          this.actionsHistory[this.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);
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

        this.startNewAction();
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

        this.actionsHistory[this.actionsHistory.length - 1].push(action);

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

          this.actionsHistory[this.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);

          this.lastCoords = newCoords;
        }

        this.toolDown = false;
      }
    }

    startNewAction() {
      this.actionsHistory.push([]);

      // Clear Undo history when a new action is started
      this.undoHistory = [];
    }

    undo(redraw: boolean = true) {
      const lastAction = this.actionsHistory.pop();

      if (lastAction) {
        this.undoHistory.push(lastAction);
      }

      if (redraw) {
        this.performAllCanvasActions();
      }
    }

    redo(redraw: boolean = true) {
      const lastUndo = this.undoHistory.pop();

      if (lastUndo) {
        this.actionsHistory.push(lastUndo);
      }

      if (redraw) {
        this.performAllCanvasActions();
      }
    }

    performAllCanvasActions() {
      const action: CanvasAction = { tool: 'clear' };

      this.performCanvasAction(action);

      this.actionsHistory.forEach((ca) => {
        ca.forEach((cai) => {
          this.performCanvasAction(cai);
        });
      });
    }

    playDrawing() {
      if (this.actionsHistory.length < 1) {
        return;
      }

      const action: CanvasAction = { tool: 'clear' };

      this.performCanvasAction(action);

      this.historyIndex = 0;
      this.actionIndex = 0;

      const interval = setInterval(() => {
        this.performCanvasAction(this.actionsHistory[this.historyIndex][this.actionIndex]!);

        this.actionIndex += 1;

        if (this.actionIndex >= this.actionsHistory[this.historyIndex].length) {
          this.historyIndex += 1;
          this.actionIndex = 0;
        }

        if (this.historyIndex >= this.actionsHistory.length) {
          clearInterval(interval);
        }
      }, 5);
    }

    onCanvasEvent(e: MouseEvent) {
        // console.log('-- On Canvas Event --');
        // console.log({ type: e.type, target: e.target, current: e.currentTarget });
        this.toolFuncs.get(this.toolType)!(e);
    }

    onTouchEvent(e: TouchEvent) {
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
    }

    onWindowResize() {
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

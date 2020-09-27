interface ICoords {
    x: number,
    y: number,
}

type TouchEventsMap = Pick<HTMLElementEventMap, 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel'>;

export type CanvasToolType = 'pen' | 'bucket' | 'eraser' | 'clear';

type StrokeStyle = CanvasRenderingContext2D['strokeStyle']

type FillStyle = CanvasRenderingContext2D['fillStyle']

export type StrokeFillStyle = StrokeStyle | FillStyle

type CanvasAction = {
    tool: CanvasToolType,
    start?: ICoords,
    end?: ICoords,
    size?: number,
    color?: StrokeFillStyle
}

interface CanvasConfig {
  width: number,
  height: number,
  scale: number,
  background: HTMLImageElement | null,
}

interface ToolConfig {
  toolType: CanvasToolType
  brushSize: number,
  brushColor: StrokeFillStyle,
  lastCoords: ICoords,
  toolDown: boolean,
}

interface CanvasHistory {
  actionsHistory: CanvasAction[][],
  undoHistory: CanvasAction[][],
  historyIndex: number,
  actionIndex: number,
}

interface ICanvasController {
  canvasConfig: CanvasConfig,
  toolConfig: ToolConfig,
  history: CanvasHistory,
  initCanvas(): void,
  teardown(): void,
  undo(redraw?: boolean): void,
  redo(redraw?: boolean): void,
  getDataURL: HTMLCanvasElement['toDataURL']
  setBackground(url: string): void,
}

type MouseEventCallback = (e: MouseEvent) => void;

export class DrawingCanvasController implements ICanvasController {
    private canvasElement: HTMLCanvasElement;

    get canvas(): HTMLCanvasElement {
      return this.canvasElement;
    }

    canvasConfig: CanvasConfig = {
      width: 0,
      height: 0,
      scale: 1,
      background: null,
    }

    toolConfig: ToolConfig = {
      toolType: 'pen',
      brushSize: 5,
      brushColor: '#000000',
      lastCoords: {
        x: 0,
        y: 0,
      },
      toolDown: false,
    }

    history: CanvasHistory = {
      actionsHistory: [],
      undoHistory: [],
      historyIndex: 0,
      actionIndex: 0,
    }

    canvasFocusCallback(e: TouchEvent) {
      if (e.target === this.canvasElement) {
        e.preventDefault();
      }
    }

    static eventMap: { [K in keyof TouchEventsMap]: keyof HTMLElementEventMap } = {
      touchstart: 'mousedown',
      touchmove: 'mousemove',
      touchend: 'mouseup',
      touchcancel: 'mouseup',
    }

    toolFuncs: { [K in CanvasToolType]: MouseEventCallback } = {
      pen: this.penTool.bind(this),
      clear: this.clearTool.bind(this),
      bucket: this.bucketTool.bind(this),
      eraser: this.eraserTool.bind(this),
    }

    constructor(canvasElement: HTMLCanvasElement, width: number, height: number) {
      this.canvasElement = canvasElement;
      this.canvasConfig.width = width;
      this.canvasConfig.height = height;

      this.canvasFocusCallback = this.canvasFocusCallback.bind(this);
      this.onCanvasEvent = this.onCanvasEvent.bind(this);
      this.onTouchEvent = this.onTouchEvent.bind(this);
      this.onWindowResize = this.onWindowResize.bind(this);

      this.initCanvas();
    }

    private drawLine(from: ICoords, to: ICoords, width: number, color: StrokeFillStyle) {
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

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
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
        this.toolConfig.toolDown = true;
        const { x, y } = this.canvasElement.getBoundingClientRect();
        this.toolConfig.lastCoords.x = (e.clientX - x) * this.canvasConfig.scale;
        this.toolConfig.lastCoords.y = (e.clientY - y) * this.canvasConfig.scale;

        this.startNewAction();
      } else if (e.type === 'mousemove') {
        if (!this.toolConfig.toolDown) return;

        const { x, y } = this.canvasElement.getBoundingClientRect();

        const newCoords: ICoords = {
          x: (e.clientX - x) * this.canvasConfig.scale,
          y: (e.clientY - y) * this.canvasConfig.scale,
        };

        const action: CanvasAction = {
          tool: 'pen',
          start: { ...this.toolConfig.lastCoords },
          end: { ...newCoords },
          size: this.toolConfig.brushSize,
          color: this.toolConfig.brushColor,
        };

        this.history.actionsHistory[this.history.actionsHistory.length - 1].push(action);

        this.performCanvasAction(action);

        this.toolConfig.lastCoords = newCoords;
      } else if (e.type === 'mouseup') {
        if (!this.toolConfig.toolDown) return;

        if (e.target === this.canvasElement) {
          const { x, y } = this.canvasElement.getBoundingClientRect();

          const newCoords: ICoords = {
            x: (e.clientX - x) * this.canvasConfig.scale,
            y: (e.clientY - y) * this.canvasConfig.scale,
          };

          const action: CanvasAction = {
            tool: 'pen',
            start: { ...this.toolConfig.lastCoords },
            end: { ...newCoords },
            size: this.toolConfig.brushSize,
            color: this.toolConfig.brushColor,
          };

          this.history.actionsHistory[this.history.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);

          this.toolConfig.lastCoords = newCoords;
        }

        this.toolConfig.toolDown = false;
      }
    }

    clearTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolConfig.toolDown = true;

        this.startNewAction();
      } else if (e.type === 'mouseup') {
        if (!this.toolConfig.toolDown) return;

        // Only clear the canvas if the click release happens inside the canvas
        if (e.target === this.canvasElement) {
          const action: CanvasAction = { tool: 'clear' };

          this.history.actionsHistory[this.history.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);
        }

        this.toolConfig.toolDown = false;
      }
    }

    bucketTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolConfig.toolDown = true;

        this.startNewAction();
      } else if (e.type === 'mouseup') {
        if (!this.toolConfig.toolDown) return;

        // Only clear the canvas if the click release happens inside the canvas
        if (e.target === this.canvasElement) {
          const action: CanvasAction = { tool: 'bucket', color: this.toolConfig.brushColor };

          this.history.actionsHistory[this.history.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);
        }

        this.toolConfig.toolDown = false;
      }
    }

    eraserTool(e: MouseEvent) {
      if (e.type === 'mousedown') {
        this.toolConfig.toolDown = true;
        const { x, y } = this.canvasElement.getBoundingClientRect();
        this.toolConfig.lastCoords.x = (e.clientX - x) * this.canvasConfig.scale;
        this.toolConfig.lastCoords.y = (e.clientY - y) * this.canvasConfig.scale;

        this.startNewAction();
      } else if (e.type === 'mousemove') {
        if (!this.toolConfig.toolDown) return;

        const { x, y } = this.canvasElement.getBoundingClientRect();

        const newCoords = {
          x: (e.clientX - x) * this.canvasConfig.scale,
          y: (e.clientY - y) * this.canvasConfig.scale,
        };

        const action: CanvasAction = {
          tool: 'eraser', start: { ...this.toolConfig.lastCoords }, end: { ...newCoords }, size: this.toolConfig.brushSize,
        };

        this.history.actionsHistory[this.history.actionsHistory.length - 1].push(action);

        this.performCanvasAction(action);

        this.toolConfig.lastCoords = newCoords;
      } else if (e.type === 'mouseup') {
        if (!this.toolConfig.toolDown) return;

        if (e.target === this.canvasElement) {
          const { x, y } = this.canvasElement.getBoundingClientRect();

          const newCoords = {
            x: (e.clientX - x) * this.canvasConfig.scale,
            y: (e.clientY - y) * this.canvasConfig.scale,
          };

          const action: CanvasAction = {
            tool: 'eraser', start: { ...this.toolConfig.lastCoords }, end: { ...newCoords }, size: this.toolConfig.brushSize,
          };

          this.history.actionsHistory[this.history.actionsHistory.length - 1].push(action);

          this.performCanvasAction(action);

          this.toolConfig.lastCoords = newCoords;
        }

        this.toolConfig.toolDown = false;
      }
    }

    startNewAction() {
      this.history.actionsHistory.push([]);

      // Clear Undo history when a new action is started
      this.history.undoHistory = [];
    }

    undo(redraw: boolean = true) {
      const lastAction = this.history.actionsHistory.pop();

      if (lastAction) {
        this.history.undoHistory.push(lastAction);
      }

      if (redraw) {
        this.performAllCanvasActions();
      }
    }

    redo(redraw: boolean = true) {
      const lastUndo = this.history.undoHistory.pop();

      if (lastUndo) {
        this.history.actionsHistory.push(lastUndo);
      }

      if (redraw) {
        this.performAllCanvasActions();
      }
    }

    performAllCanvasActions() {
      const action: CanvasAction = { tool: 'clear' };

      this.performCanvasAction(action);

      if (this.canvasConfig.background) {
        this.setBackgroundFromElement(this.canvasConfig.background);
      }

      this.history.actionsHistory.forEach((ca) => {
        ca.forEach((cai) => {
          this.performCanvasAction(cai);
        });
      });
    }

    playDrawing() {
      if (this.history.actionsHistory.length < 1) {
        return;
      }

      const action: CanvasAction = { tool: 'clear' };

      this.performCanvasAction(action);

      this.history.historyIndex = 0;
      this.history.actionIndex = 0;

      const interval = setInterval(() => {
        this.performCanvasAction(this.history.actionsHistory[this.history.historyIndex][this.history.actionIndex]!);

        this.history.actionIndex += 1;

        if (this.history.actionIndex >= this.history.actionsHistory[this.history.historyIndex].length) {
          this.history.historyIndex += 1;
          this.history.actionIndex = 0;
        }

        if (this.history.historyIndex >= this.history.actionsHistory.length) {
          clearInterval(interval);
        }
      }, 5);
    }

    onCanvasEvent(e: MouseEvent) {
      // console.log('-- On Canvas Event --');
      // console.log({ type: e.type, target: e.target, current: e.currentTarget });
      this.toolFuncs[this.toolConfig.toolType](e);
    }

    onTouchEvent(e: TouchEvent) {
      // console.log('-- On Touch Event --');
      // console.log({ type: e.type, target: e.target, current: e.currentTarget });

      const me = new MouseEvent(DrawingCanvasController.eventMap[e.type as keyof TouchEventsMap]!, {
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
      this.canvasConfig.scale = this.canvasConfig.width / this.canvasElement.offsetWidth;

      this.canvasElement.style.height = `${this.canvasConfig.height / this.canvasConfig.scale}px`;
    }

    getDataURL(type?: string | undefined, quality?: any) {
      return this.canvasElement.toDataURL(type, quality);
    }

    setBackground(url: string) {
      const temp = new Image();
      temp.crossOrigin = 'Anonymous';
      temp.onload = () => {
        this.setBackgroundFromElement(temp);
      };

      temp.src = url;

      this.canvasConfig.background = temp;
    }

    setBackgroundFromElement(img: HTMLImageElement) {
      const ctx = this.canvasElement.getContext('2d')!;

      ctx.drawImage(img, 0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    setBackgroundColor(color: string) {
      const ctx = this.canvasElement.getContext('2d')!;

      ctx.globalCompositeOperation = 'source-over';

      ctx.fillStyle = color;
      ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    reset() {
      this.history.actionsHistory = [];
      this.history.historyIndex = 0;
      this.toolConfig.lastCoords = {
        x: 0,
        y: 0,
      };
      this.toolConfig.toolDown = false;

      this.setBackgroundColor('#ffffff');
    }

    teardown() {
      Object.keys(DrawingCanvasController.eventMap).forEach((key) => {
        const k = key as keyof TouchEventsMap;

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
      this.canvasElement.width = this.canvasConfig.width;
      this.canvasElement.height = this.canvasConfig.height;

      const w = this.canvasElement.ownerDocument!.defaultView;

      this.setBackgroundColor('#ffffff');

      // w && (w.onresize = this.onWindowResize);
      if (w) {
        w.addEventListener('resize', this.onWindowResize);
      }

      this.onWindowResize();

      Object.keys(DrawingCanvasController.eventMap).forEach((key) => {
        const k = key as keyof TouchEventsMap;

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

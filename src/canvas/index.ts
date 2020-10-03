export interface ICoords {
  x: number,
  y: number,
}

type StrokeStyle = CanvasRenderingContext2D['strokeStyle']

type FillStyle = CanvasRenderingContext2D['fillStyle']

export type StrokeFillStyle = StrokeStyle | FillStyle

type TouchEventsMap = Pick<HTMLElementEventMap, 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel'>;

// type MouseEventKeys = keyof Pick<HTMLElementEventMap, 'mousedown' | 'mousemove' | 'mouseup'>

export interface CanvasTool {
  // name: string,
  state: string
}

// export type NoneTool = CanvasTool

// export interface CanvasTools {
//   none?: NoneTool,
// }

// export type CanvasToolType = keyof CanvasTools // export

interface CanvasConfig {
  width: number,
  height: number,
  scale: number,
  background: HTMLImageElement | null,
}

// interface ToolConfig {
//   type: CanvasToolType
//   size: number,
//   style: StrokeFillStyle,
//   toolState: string, // arbitrary identifier for the state of the tool
// }

type CanvasActionItem<T> = {
  toolConfig: T & CanvasTool,
  coords: ICoords,
}

type CanvasAction<T> = CanvasActionItem<T>[]

interface CanvasHistory<ToolTypes> {
  actionsHistory: CanvasAction<ToolTypes>[],
  undoHistory: CanvasAction<ToolTypes>[],
  historyIndex: number,
  actionIndex: number,
}

interface ICanvasController<ToolsUnion> {
  canvasConfig: CanvasConfig,
  toolConfig: ToolsUnion & CanvasTool,
  history: CanvasHistory<ToolsUnion & CanvasTool>,
  initCanvas(): void,
  teardown(): void,
  undo(redraw?: boolean): void,
  redo(redraw?: boolean): void,
  getDataURL: HTMLCanvasElement['toDataURL']
  setBackground(url: string): void,
}

type MouseEventToolCallbackResult<ToolType> = { endCurrentAction: boolean, canvasActionItem?: CanvasActionItem<ToolType> };

export type MouseEventToolCallback<ToolType> = (
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  canvasConfig: CanvasConfig,
  toolConfig: ToolType,
  actionHistory: CanvasAction<ToolType>,
) => MouseEventToolCallbackResult<ToolType> | null;

export type ToolActionItemCallback<ToolType> = (
  canvas: HTMLCanvasElement,
  action: CanvasActionItem<ToolType>,
  actionHistory: CanvasAction<ToolType>
) => void;

export class DrawingCanvasController<ToolTypes extends Record<string, unknown>> implements ICanvasController<ToolTypes> {
  private canvasElement: HTMLCanvasElement;

  onTouchEventBound: (e: TouchEvent) => void;

  onCanvasFocusBound: (e: TouchEvent) => void;

  onCanvasEventBound: (e: MouseEvent) => void;

  onWindowResizeBound: () => void;

  get canvas(): HTMLCanvasElement {
    return this.canvasElement;
  }

  canvasConfig: CanvasConfig = {
    width: 0,
    height: 0,
    scale: 1,
    background: null,
  }

  private newActionNextEvent = true;

  toolConfig: ToolTypes & CanvasTool
  // toolConfigs: CanvasTools = { }

  history: CanvasHistory<ToolTypes > = {
    actionsHistory: [],
    undoHistory: [],
    historyIndex: 0,
    actionIndex: 0,
  }

  static eventMap: { [K in keyof TouchEventsMap]: keyof HTMLElementEventMap } = {
    touchstart: 'mousedown',
    touchmove: 'mousemove',
    touchend: 'mouseup',
    touchcancel: 'mouseup',
  }

  toolMouseEventCallbacks: { [K in keyof ToolTypes]?: MouseEventToolCallback<ToolTypes[K]> } = { }

  toolActionItemCallbacks: { [K in keyof ToolTypes]?: ToolActionItemCallback<ToolTypes[K]> } = { }

  onCanvasFocus(e: TouchEvent): void {
    if (e.target === this.canvasElement) {
      e.preventDefault();
    }
  }

  constructor(canvasElement: HTMLCanvasElement, width: number, height: number) {
    this.canvasElement = canvasElement;
    this.canvasConfig.width = width;
    this.canvasConfig.height = height;

    this.onCanvasFocusBound = this.onCanvasFocus.bind(this);
    this.onCanvasEventBound = this.onCanvasEvent.bind(this);
    this.onTouchEventBound = this.onTouchEvent.bind(this);
    this.onWindowResizeBound = this.onWindowResize.bind(this);

    this.initCanvas();
  }

  addTool(toolType: CanvasToolType, eventCB: MouseEventToolCallback, actionCB: ToolActionItemCallback): void {
    this.toolMouseEventCallbacks[toolType] = eventCB;
    this.toolActionItemCallbacks[toolType] = actionCB;
  }

  private clearCanvas() {
    const ctx = this.canvasElement.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  performCanvasAction(actionItem: CanvasActionItem, actionHistory: CanvasAction): void {
    this.toolActionItemCallbacks[actionItem.toolConfig.type]?.(
      this.canvasElement,
      actionItem,
      actionHistory,
    );
  }

  undo(redraw = true): void {
    const lastAction = this.history.actionsHistory.pop();

    if (lastAction) {
      this.history.undoHistory.push(lastAction);
    }

    if (redraw) {
      this.performAllCanvasActions();
    }
  }

  redo(redraw = true): void {
    const lastUndo = this.history.undoHistory.pop();

    if (lastUndo) {
      this.history.actionsHistory.push(lastUndo);
    }

    if (redraw) {
      this.performAllCanvasActions();
    }
  }

  performAllCanvasActions(): void {
    // const action: CanvasAction = { tool: 'clear' };

    // this.performCanvasAction(action);

    this.clearCanvas();

    if (this.canvasConfig.background) {
      this.setBackgroundFromElement(this.canvasConfig.background);
    }

    this.history.actionsHistory.forEach((ca) => {
      ca.forEach((cai, j) => {
        // Slicing here may be inefficient
        this.performCanvasAction(cai, ca.slice(0, j));
      });
    });
  }

  playDrawing(): void {
    if (this.history.actionsHistory.length < 1) {
      return;
    }

    this.clearCanvas();

    this.history.historyIndex = 0;
    this.history.actionIndex = 0;

    const interval = setInterval(() => {
      this.performCanvasAction(
        this.history.actionsHistory[this.history.historyIndex][this.history.actionIndex],
        this.history.actionsHistory[this.history.historyIndex].slice(0, this.history.actionIndex),
      );

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

  startNewAction(): void {
    this.history.actionsHistory.push([]);

    // Clear Undo history when a new action is started
    this.history.undoHistory = [];
  }

  addNewActionItem(newAction: boolean, actionItem: CanvasActionItem): void {
    if (newAction) {
      this.startNewAction();
    }

    this.history.actionsHistory[this.history.actionsHistory.length - 1].push(actionItem);
  }

  onCanvasEvent(e: MouseEvent): void {
    const callback = this.toolMouseEventCallbacks[this.toolConfig.type];

    if (callback) {
      try {
        const currentActionHistory: CanvasAction = this.newActionNextEvent
          ? []
          : this.history.actionsHistory[this.history.actionsHistory.length - 1];

        const res = callback(
          e,
          this.canvasElement,
          this.canvasConfig,
          this.toolConfig,
          currentActionHistory,
        );

        if (res) {
          if (res.canvasActionItem) {
            this.performCanvasAction(res.canvasActionItem, currentActionHistory);

            // If the action was performed without throwing an error, commit the action to the history
            this.addNewActionItem(this.newActionNextEvent, res.canvasActionItem);
          }

          this.newActionNextEvent = res.endCurrentAction;
        }
      } catch (err) {
        // On error, delete the latest Action as it likely has an inconsistent state that will continue producing errors
        this.history.actionsHistory.pop();
      }
    }
  }

  onTouchEvent(e: TouchEvent): void {
    const me = new MouseEvent(DrawingCanvasController.eventMap[e.type as keyof TouchEventsMap], {
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
    const doc = this.canvasElement.ownerDocument;
    const touchEndElement = doc.elementFromPoint(me.clientX, me.clientY);

    if (doc && touchEndElement) {
      touchEndElement.dispatchEvent(me);
    }
  }

  onWindowResize(): void {
    this.canvasConfig.scale = this.canvasConfig.width / this.canvasElement.offsetWidth;

    this.canvasElement.style.height = `${this.canvasConfig.height / this.canvasConfig.scale}px`;
  }

  getDataURL(type?: string | undefined, quality?: any): string {
    return this.canvasElement.toDataURL(type, quality);
  }

  setBackground(url: string): void {
    const temp = new Image();
    temp.crossOrigin = 'Anonymous';
    temp.onload = () => {
      this.setBackgroundFromElement(temp);
    };

    temp.src = url;

    this.canvasConfig.background = temp;
  }

  setBackgroundFromElement(img: HTMLImageElement): void {
    const ctx = this.canvasElement.getContext('2d')!;

    ctx.drawImage(img, 0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  setBackgroundColor(color: string): void {
    const ctx = this.canvasElement.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  reset(): void {
    this.history.actionsHistory = [];
    this.history.historyIndex = 0;

    this.setBackgroundColor('#ffffff');
  }

  teardown(): void {
    Object.keys(DrawingCanvasController.eventMap).forEach((key) => {
      const k = key as keyof TouchEventsMap;

      if (k === 'touchend' || k === 'touchcancel') {
        this.canvasElement.ownerDocument.removeEventListener(k, this.onTouchEventBound);
      } else {
        this.canvasElement.removeEventListener(k, this.onTouchEventBound);
      }

      // Prevent scrolling on touch interfaces when event occurs on canvas
      this.canvasElement.ownerDocument.body.removeEventListener(k, this.onCanvasFocusBound, { capture: false });
    });

    const w = this.canvasElement.ownerDocument.defaultView;

    if (w) {
      w.removeEventListener('resize', this.onWindowResizeBound);
    }

    this.canvasElement.removeEventListener('mousedown', this.onCanvasEventBound);
    this.canvasElement.removeEventListener('mousemove', this.onCanvasEventBound);
    this.canvasElement.ownerDocument.removeEventListener('mouseup', this.onCanvasEventBound);
  }

  initCanvas(): void {
    this.canvasElement.width = this.canvasConfig.width;
    this.canvasElement.height = this.canvasConfig.height;

    const w = this.canvasElement.ownerDocument.defaultView;

    this.setBackgroundColor('#ffffff');

    // w && (w.onresize = this.onWindowResize);
    if (w) {
      w.addEventListener('resize', this.onWindowResizeBound);
    }

    this.onWindowResize();

    Object.keys(DrawingCanvasController.eventMap).forEach((key) => {
      const k = key as keyof TouchEventsMap;

      if (k === 'touchend' || k === 'touchcancel') {
        this.canvasElement.ownerDocument.addEventListener(k, this.onTouchEventBound);
      } else {
        this.canvasElement.addEventListener(k, this.onTouchEventBound);
      }

      // Prevent scrolling on touch interfaces when event occurs on canvas
      const { body } = this.canvasElement.ownerDocument;

      body.addEventListener(k, this.onCanvasFocusBound, { capture: false, passive: false });
    });

    this.canvasElement.addEventListener('mousedown', this.onCanvasEventBound);
    this.canvasElement.addEventListener('mousemove', this.onCanvasEventBound);
    // Setting listener to the document so lifting the mouse button anywhere will register as the tool being lifted
    this.canvasElement.ownerDocument.addEventListener('mouseup', this.onCanvasEventBound);
  }
}

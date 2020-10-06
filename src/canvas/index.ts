export interface ICoords {
  x: number,
  y: number,
}

type StrokeStyle = CanvasRenderingContext2D['strokeStyle']

type FillStyle = CanvasRenderingContext2D['fillStyle']

export type StrokeFillStyle = StrokeStyle | FillStyle

type TouchEventsMap = Pick<HTMLElementEventMap, 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel'>

type MouseEventsMap = Pick<HTMLElementEventMap, 'mousedown' | 'mousemove' | 'mouseup'>

interface CanvasConfig {
  width: number,
  height: number,
  scale: number,
  background: HTMLImageElement | null,
}

export interface CanvasTool<N extends string> {
  name: N,
  state: string
}

type CanvasActionItem<T extends CanvasTool<string>> = {
  toolConfig: T,
  coords: ICoords,
}

type CanvasAction<T extends CanvasTool<string>> = CanvasActionItem<T>[]

interface CanvasHistory<T extends CanvasTool<string>> {
  actionsHistory: CanvasAction<T>[],
  undoHistory: CanvasAction<T>[],
}

export interface BaseCanvasController {
  getCanvas(): HTMLCanvasElement;
  undo(redraw?: boolean): void;
  redo(redraw?: boolean): void;
  playDrawing(): void;
  getDataURL: HTMLCanvasElement['toDataURL']
  setBackground(url: string): void;
  setBackgroundFromElement(img: HTMLImageElement): void;
  setBackgroundColor(color: string): void;
  teardown(): void;
}

export type ToolActionItemCallback<T extends CanvasTool<string>> = (
  canvas: HTMLCanvasElement,
  action: CanvasActionItem<T>,
  actionHistory: CanvasAction<T>
) => void;

type MouseEventToolCallbackResult<T extends CanvasTool<string>> = {
  endCurrentAction: boolean, canvasActionItem?: CanvasActionItem<T>
};

export type MouseEventToolCallback<T extends CanvasTool<string>> = (
  this: BaseCanvasController,
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  canvasConfig: CanvasConfig,
  toolConfig: T,
  actionHistory: CanvasAction<T>,
) => MouseEventToolCallbackResult<T> | null;

interface IDrawingCanvasController<
  N extends string,
  T extends CanvasTool<N>,
  M extends Record<N, T>
> extends BaseCanvasController {
  currentTool: N;

  addTool<K extends N>(
    toolType: K,
    eventCB: MouseEventToolCallback<M[K]>,
    actionCB: ToolActionItemCallback<M[K]>,
    initialConfig: M[K]): void;
}

export class DrawingCanvasController<
  N extends string,
  T extends CanvasTool<N>,
  M extends Record<N, T>
> implements IDrawingCanvasController<N, T, M> {
  private canvasElement: HTMLCanvasElement;

  private onTouchEventBound: (e: TouchEvent) => void;

  private onCanvasFocusBound: (e: TouchEvent) => void;

  private onCanvasEventBound: (e: MouseEvent) => void;

  private onWindowResizeBound: () => void;

  getCanvas(): HTMLCanvasElement {
    return this.canvasElement;
  }

  private canvasConfig: CanvasConfig = {
    width: 0,
    height: 0,
    scale: 1,
    background: null,
  }

  private newActionNextEvent = true;

  currentTool: N

  toolConfig: { [K in N]?: M[K] } = {}

  private history: CanvasHistory<M[N]> = {
    actionsHistory: [],
    undoHistory: [],
  }

  static eventMap: { [K in keyof TouchEventsMap]: keyof MouseEventsMap } = {
    touchstart: 'mousedown',
    touchmove: 'mousemove',
    touchend: 'mouseup',
    touchcancel: 'mouseup',
  }

  toolMouseEventCallbacks: { [K in N]?: MouseEventToolCallback<M[K]> } = { }

  toolActionItemCallbacks: { [K in N]?: ToolActionItemCallback<M[K]> } = { }

  onCanvasFocus(e: TouchEvent): void {
    if (e.target === this.canvasElement) {
      e.preventDefault();
    }
  }

  constructor(
    canvasElement: HTMLCanvasElement,
    width: number,
    height: number,
    startTool: N,
  ) {
    this.canvasElement = canvasElement;
    this.canvasConfig.width = width;
    this.canvasConfig.height = height;
    this.currentTool = startTool;

    this.onCanvasFocusBound = this.onCanvasFocus.bind(this);
    this.onCanvasEventBound = this.onCanvasEvent.bind(this);
    this.onTouchEventBound = this.onTouchEvent.bind(this);
    this.onWindowResizeBound = this.onWindowResize.bind(this);

    this.initCanvas();
  }

  addTool<K extends N>(
    toolType: K,
    eventCB: MouseEventToolCallback<M[K]>,
    actionCB: ToolActionItemCallback<M[K]>,
    initialConfig: M[K],
  ): void {
    this.toolMouseEventCallbacks[toolType] = eventCB;
    this.toolActionItemCallbacks[toolType] = actionCB;
    this.toolConfig[toolType] = initialConfig;
  }

  private clearCanvas() {
    const ctx = this.canvasElement.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  }

  performCanvasAction(actionItem: CanvasActionItem<M[N]>, actionHistory: CanvasAction<M[N]>): void {
    this.toolActionItemCallbacks[actionItem.toolConfig.name]?.(
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

    let actionIndex = 0;
    let actionItemIndex = 0;

    const interval = setInterval(() => {
      this.performCanvasAction(
        this.history.actionsHistory[actionIndex][actionItemIndex],
        this.history.actionsHistory[actionIndex].slice(0, actionItemIndex),
      );

      actionItemIndex += 1;

      if (actionItemIndex >= this.history.actionsHistory[actionIndex].length) {
        actionIndex += 1;
        actionItemIndex = 0;
      }

      if (actionIndex >= this.history.actionsHistory.length) {
        clearInterval(interval);
      }
    }, 5);
  }

  startNewAction(): void {
    this.history.actionsHistory.push([]);

    // Clear Undo history when a new action is started
    this.history.undoHistory = [];
  }

  addNewActionItem(newAction: boolean, actionItem: CanvasActionItem<M[N]>): void {
    if (newAction) {
      this.startNewAction();
    }

    this.history.actionsHistory[this.history.actionsHistory.length - 1].push(actionItem);
  }

  onCanvasEvent(e: MouseEvent): void {
    const callback = this.toolMouseEventCallbacks[this.currentTool];
    const currentToolConfig = this.toolConfig[this.currentTool];

    if (callback && currentToolConfig) {
      try {
        const currentActionHistory = this.newActionNextEvent
          ? []
          : this.history.actionsHistory[this.history.actionsHistory.length - 1];

        const res = callback.call(
          this,
          e,
          this.canvasElement,
          this.canvasConfig,
          // Non-null assertion due to currentToolConfig still having undefined in type union
          // despite non-null if-check above.
          // TODO: Investigate further (TS bug?)
          currentToolConfig!,
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

    this.clearCanvas();
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

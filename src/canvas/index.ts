import cloneDeep from 'lodash/cloneDeep';

export class UnknownToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownToolError';
  }
}

export class CurrentToolNotAssignedError extends Error {
  constructor() {
    super('No tool selected. Please set current tool using setCurrentTool()');
    this.name = 'CurrentToolNotAssignedError';
  }
}

export interface ICoords {
  x: number,
  y: number,
}

type StrokeStyle = CanvasRenderingContext2D['strokeStyle']

type FillStyle = CanvasRenderingContext2D['fillStyle']

export type StrokeFillStyle = StrokeStyle | FillStyle

type TouchEventsMap = Pick<HTMLElementEventMap, 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel'>

type MouseEventsMap = Pick<HTMLElementEventMap, 'mousedown' | 'mousemove' | 'mouseup'>

export interface CanvasConfig {
  width: number,
  height: number,
  scale: number,
  background: HTMLImageElement | StrokeFillStyle | null,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EmptyToolConfig = Record<any, never>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolConfig = Record<string, any>

export type CanvasActionStep<T extends ToolConfig> = {
  tool: T,
  coords: ICoords,
  state: string,
}

export type CanvasAction<N extends string, T extends ToolConfig> = {
  tool: N,
  steps: CanvasActionStep<T>[],
}

interface CanvasHistory<N extends string, T extends ToolConfig> {
  actionsHistory: CanvasAction<N, T>[],
  undoHistory: CanvasAction<N, T>[],
}

export interface BaseCanvasController {
  getCanvas(): HTMLCanvasElement;
  undo(redraw?: boolean): void;
  redo(redraw?: boolean): void;
  playDrawing(): void;
  getDataURL: HTMLCanvasElement['toDataURL']
  setBackground(bckg: CanvasConfig['background']): void;
  teardown(): void;
}

export type ToolActionStepCallback<T extends ToolConfig> = <N extends string>(
  actionStep: CanvasActionStep<T>,
  actionHistory: CanvasAction<N, T>,
  canvas: HTMLCanvasElement,
  canvasConfig: CanvasConfig,
) => void;

export type MouseEventToolCallbackResult<T extends ToolConfig> = {
  endCurrentAction: boolean,
  replacePrevStep: boolean,
  actionStep?: CanvasActionStep<T>,
};

export type MouseEventToolCallback<T extends ToolConfig> = <N extends string>(
  this: BaseCanvasController,
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  canvasConfig: CanvasConfig,
  toolConfig: T,
  actionHistory: CanvasAction<N, T>,
) => MouseEventToolCallbackResult<T> | null;

export class DrawingCanvasController<
  N extends string,
  M extends { [key in N]: ToolConfig }
> {
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

  private currentTool: N | null = null;

  private toolConfig: { [K in N]?: M[K] } = {}

  private history: CanvasHistory<N, M[N]> = {
    actionsHistory: [],
    undoHistory: [],
  }

  static eventMap: { [K in keyof TouchEventsMap]: keyof MouseEventsMap } = {
    touchstart: 'mousedown',
    touchmove: 'mousemove',
    touchend: 'mouseup',
    touchcancel: 'mouseup',
  }

  private toolMouseEventCallbacks: { [K in N]?: MouseEventToolCallback<M[K]> } = { }

  private toolActionStepCallbacks: { [K in N]?: ToolActionStepCallback<M[K]> } = { }

  private onCanvasFocus(e: TouchEvent): void {
    if (e.target === this.canvasElement) {
      e.preventDefault();
    }
  }

  constructor(
    canvasElement: HTMLCanvasElement,
    width: number,
    height: number,
    background: CanvasConfig['background'] = null,
  ) {
    this.canvasElement = canvasElement;
    this.canvasConfig.width = width;
    this.canvasConfig.height = height;
    this.canvasConfig.background = background;

    this.onCanvasFocusBound = this.onCanvasFocus.bind(this);
    this.onCanvasEventBound = this.onCanvasEvent.bind(this);
    this.onTouchEventBound = this.onTouchEvent.bind(this);
    this.onWindowResizeBound = this.onWindowResize.bind(this);

    this.initCanvas();
  }

  getCurrentTool(): N {
    if (this.currentTool == null) {
      throw new CurrentToolNotAssignedError();
    }

    return this.currentTool;
  }

  setCurrentTool<K extends N>(tool: K): void {
    if (!(tool in this.toolConfig)) {
      throw new UnknownToolError(`'${tool}' is not registered as a tool`);
    }

    this.currentTool = tool;
  }

  addTool<K extends N>(
    toolType: K,
    eventCB: MouseEventToolCallback<M[K]>,
    actionCB: ToolActionStepCallback<M[K]>,
    initialConfig: M[K],
  ): void {
    this.toolMouseEventCallbacks[toolType] = eventCB;
    this.toolActionStepCallbacks[toolType] = actionCB;
    this.toolConfig[toolType] = initialConfig;
  }

  setToolConfig<K extends N>(tool: K, config: M[K]): void {
    if (!(tool in this.toolConfig)) {
      throw new UnknownToolError(`'${tool}' is not registered as a tool`);
    }

    this.toolConfig[tool] = config;
  }

  setToolConfigs(config: { [K in N]?: M[K] }): void {
    const paramKeys = Object.keys(config);

    if (!(paramKeys.every((c) => c in this.toolConfig))) {
      throw new UnknownToolError(`At least some of [${paramKeys.join(',')}]' are not registered as tools`);
    }

    this.toolConfig = config;
  }

  private clearCanvas() {
    const ctx = this.canvasElement.getContext('2d')!;

    ctx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    const bckg = this.canvasConfig.background;

    if (bckg) {
      if (bckg instanceof Image) {
        ctx.drawImage(bckg, 0, 0, this.canvasElement.width, this.canvasElement.height);
      } else {
        ctx.fillStyle = bckg;
        ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      }
    }
  }

  private performCanvasAction(
    actionStep: CanvasActionStep<M[N]>,
    actionHistory: CanvasAction<N, M[N]>,
  ): void {
    this.toolActionStepCallbacks[actionHistory.tool]?.(
      actionStep,
      actionHistory,
      this.canvasElement,
      cloneDeep(this.canvasConfig),
    );
  }

  undo(redraw = true): void {
    const lastAction = this.history.actionsHistory.pop();

    if (lastAction) {
      this.history.undoHistory.push(lastAction);
    }

    if (redraw) {
      this.clearCanvas();
      this.performAllCanvasActions(this.history.actionsHistory);
    }
  }

  redo(redraw = true): void {
    const lastUndo = this.history.undoHistory.pop();

    if (lastUndo) {
      this.history.actionsHistory.push(lastUndo);
    }

    if (redraw) {
      this.clearCanvas();
      this.performAllCanvasActions(this.history.actionsHistory);
    }
  }

  private performAllCanvasActions(actions: CanvasAction<N, M[N]>[], skipLastStep = false): void {
    actions.forEach((act, actIndex) => {
      act.steps.forEach((step, stepIndex) => {
        if (!skipLastStep || (actIndex !== actions.length - 1 || stepIndex !== act.steps.length - 1)) {
          // Slicing here may be inefficient
          this.performCanvasAction(step, { tool: act.tool, steps: act.steps.slice(0, stepIndex) });
        }
      });
    });
  }

  playDrawing(): void {
    if (this.history.actionsHistory.length < 1) {
      return;
    }

    this.clearCanvas();

    let actionIndex = 0;
    let actionStepIndex = 0;

    const interval = setInterval(() => {
      this.performCanvasAction(
        this.history.actionsHistory[actionIndex].steps[actionStepIndex],
        {
          tool: this.history.actionsHistory[actionIndex].tool,
          steps: this.history.actionsHistory[actionIndex].steps.slice(0, actionStepIndex),
        },
      );

      actionStepIndex += 1;

      if (actionStepIndex >= this.history.actionsHistory[actionIndex].steps.length) {
        actionIndex += 1;
        actionStepIndex = 0;
      }

      if (actionIndex >= this.history.actionsHistory.length) {
        clearInterval(interval);
      }
    }, 5);
  }

  private startNewAction(tool: N): void {
    this.history.actionsHistory.push({ tool, steps: [] });

    // Clear Undo history when a new action is started
    this.history.undoHistory = [];
  }

  private commitNewActionStep<K extends N>(
    newAction: boolean,
    tool: K,
    actionStep: CanvasActionStep<M[K]>,
    replacePrevStep: boolean,
  ): void {
    if (newAction) {
      this.startNewAction(tool);
    }

    const currentAction = this.history.actionsHistory[this.history.actionsHistory.length - 1];

    if (replacePrevStep) {
      currentAction.steps[currentAction.steps.length - 1] = actionStep;
    } else {
      currentAction.steps.push(actionStep);
    }
  }

  private onCanvasEvent(e: MouseEvent): void {
    if (this.currentTool == null) {
      throw new CurrentToolNotAssignedError();
    }

    const callback = this.toolMouseEventCallbacks[this.currentTool];
    const currentToolConfig = this.toolConfig[this.currentTool];

    if (callback && currentToolConfig) {
      try {
        const currentActionHistory: CanvasAction<N, M[N]> = this.newActionNextEvent
          ? { tool: this.currentTool, steps: [] }
          : this.history.actionsHistory[this.history.actionsHistory.length - 1];

        const res = callback.call(
          this,
          e,
          this.canvasElement,
          cloneDeep(this.canvasConfig),
          // Non-null assertion due to currentToolConfig still having undefined in type union
          // despite non-null if-check above.
          // TODO: Investigate further (TS bug?)
          cloneDeep(currentToolConfig!),
          currentActionHistory,
        );

        if (res) {
          if (res.actionStep) {
            if (res.replacePrevStep) {
              this.clearCanvas();
              this.performAllCanvasActions(this.history.actionsHistory, true);

              const withoutPrevStep: CanvasAction<N, M[N]> = {
                tool: currentActionHistory.tool,
                steps: [...currentActionHistory.steps.slice(0, currentActionHistory.steps.length - 1)],
              };

              this.performCanvasAction(res.actionStep, withoutPrevStep);

              this.commitNewActionStep(this.newActionNextEvent, this.currentTool, res.actionStep, true);
            } else {
              this.performCanvasAction(res.actionStep, currentActionHistory);

              // If the action was performed without throwing an error, commit the action to the history
              this.commitNewActionStep(this.newActionNextEvent, this.currentTool, res.actionStep, false);
            }
          }

          this.newActionNextEvent = res.endCurrentAction;
        }
      } catch (err) {
        // On error, delete the current Action as it likely has an inconsistent state that will continue producing errors
        if (!this.newActionNextEvent) {
          this.history.actionsHistory.pop();
          this.newActionNextEvent = true;
        }
      }
    }
  }

  private onTouchEvent(e: TouchEvent): void {
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

  private onWindowResize(): void {
    this.canvasConfig.scale = this.canvasConfig.width / this.canvasElement.offsetWidth;

    this.canvasElement.style.height = `${this.canvasConfig.height / this.canvasConfig.scale}px`;
  }

  getDataURL(type?: string | undefined, quality?: any): string {
    return this.canvasElement.toDataURL(type, quality);
  }

  setBackground(bckg: CanvasConfig['background']): void {
    this.canvasConfig.background = bckg;

    this.clearCanvas();

    // Clears canvas, sets the background, redraws history
    this.performAllCanvasActions(this.history.actionsHistory);
  }

  setBackgroundFromURL(url: string): void {
    const temp = new Image();
    temp.crossOrigin = 'Anonymous';
    temp.onload = () => {
      this.setBackground(temp);
    };

    temp.src = url;
  }

  reset(): void {
    this.history.actionsHistory = [];
    this.history.undoHistory = [];

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

    if (w) {
      w.addEventListener('resize', this.onWindowResizeBound);
    }

    this.onWindowResize();

    this.setBackground(this.canvasConfig.background);

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

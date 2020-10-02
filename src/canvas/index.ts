export interface ICoords {
  x: number,
  y: number,
}

type StrokeStyle = CanvasRenderingContext2D['strokeStyle']

type FillStyle = CanvasRenderingContext2D['fillStyle']

export type StrokeFillStyle = StrokeStyle | FillStyle

type TouchEventsMap = Pick<HTMLElementEventMap, 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel'>;

type MouseEventKeys = keyof Pick<HTMLElementEventMap, 'mousedown' | 'mousemove' | 'mouseup'>

export interface CanvasTool {
  // name: string,
  state: string
}

export interface NoneTool extends CanvasTool { }

export interface CanvasTools {
  none?: NoneTool,
}

export type CanvasToolType = keyof CanvasTools // export

type CanvasActionItem = {
  toolConfig: ToolConfig,
  coords: ICoords,
}

type CanvasAction = CanvasActionItem[]

interface CanvasConfig {
  width: number,
  height: number,
  scale: number,
  background: HTMLImageElement | null,
}

interface ToolConfig {
  type: CanvasToolType
  size: number,
  style: StrokeFillStyle,
  toolState: string, // arbitrary identifier for the state of the tool
}

interface CanvasHistory {
  actionsHistory: CanvasAction[],
  undoHistory: CanvasAction[],
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

type MouseEventToolCallbackResult = { endCurrentAction: boolean, canvasActionItem?: CanvasActionItem };

export type MouseEventToolCallback = (
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  canvasConfig: CanvasConfig,
  toolConfig: ToolConfig,
  actionHistory: CanvasAction,
) => MouseEventToolCallbackResult | null;

export type ToolActionItemCallback = (
  canvas: HTMLCanvasElement,
  action: CanvasActionItem,
  actionHistory: CanvasAction
) => void;

type MouseEventToolCallbackMap = {
  [K in MouseEventKeys]: MouseEventToolCallback
}

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

  private newActionNextEvent: boolean = true;

  toolConfig: ToolConfig = {
    type: 'pen',
    size: 5,
    style: '#000000',
    toolState: '',
  }
  // toolConfigs: CanvasTools = { }

  history: CanvasHistory = {
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

  toolMouseEventCallbacks: { [K in CanvasToolType]?: MouseEventToolCallback } = { }

  toolActionItemCallbacks: { [K in CanvasToolType]?: ToolActionItemCallback } = { }

  canvasFocusCallback(e: TouchEvent) {
    if (e.target === this.canvasElement) {
      e.preventDefault();
    }
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

  addTool(toolType: CanvasToolType, eventCB: MouseEventToolCallback, actionCB: ToolActionItemCallback) {
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

  performCanvasAction(actionItem: CanvasActionItem, actionHistory: CanvasAction) {
    this.toolActionItemCallbacks[actionItem.toolConfig.type]?.(
      this.canvasElement,
      actionItem,
      actionHistory,
    );
  }

  // performCanvasAction(actionItem: CanvasActionItem) {
  //   this.toolActionItemCallbacks[actionItem.toolConfig.type]?.(
  //     this.canvasElement,
  //     actionItem,
  //     this.history.actionsHistory[this.history.actionsHistory.length - 1],
  //   );
  // }

  // performCanvasAction(actionItem: CanvasActionItem) {
  //   this.toolActionItemCallbacks[actionItem.toolConfig.type]?.(
  //     this.canvasElement, actionItem,
  //     this.history.actionsHistory[this.history.actionsHistory.length - 1]
  //   );

  //   // const ctx = this.canvasElement.getContext('2d')!;

  //   // switch (actionItem.tool) {
  //   //   case 'pen':
  //   //     ctx.globalCompositeOperation = 'source-over';

  //   //     this.drawLine(actionItem.start!, actionItem.end!, actionItem.size!, actionItem.color!);
  //   //     break;
  //   //     // case 'clear':

  //   //     //   ctx.globalCompositeOperation = 'source-over';

  //   //     //   ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

  //   //     //   ctx.fillStyle = '#ffffff';
  //   //     //   ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  //   //     //   break;
  //   //     // case 'bucket':
  //   //     //   ctx.globalCompositeOperation = 'source-over';

  //   //     //   ctx.fillStyle = action.color!;
  //   //     //   ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  //   //     //   break;
  //   //     // case 'eraser':
  //   //     //   ctx.globalCompositeOperation = 'destination-out';

  //   //     //   this.drawLine(action.start!, action.end!, action.size!, '#ffffff');
  //   //     //   break;
  //   //   default:
  //   //     break;
  //   // }
  // }

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

  playDrawing() {
    if (this.history.actionsHistory.length < 1) {
      return;
    }

    this.clearCanvas();

    this.history.historyIndex = 0;
    this.history.actionIndex = 0;

    const interval = setInterval(() => {
      this.performCanvasAction(
        this.history.actionsHistory[this.history.historyIndex][this.history.actionIndex]!,
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

  startNewAction() {
    this.history.actionsHistory.push([]);

    // Clear Undo history when a new action is started
    this.history.undoHistory = [];
  }

  addNewActionItem(newAction: boolean, actionItem: CanvasActionItem) {
    if (newAction) {
      this.startNewAction();
    }

    this.history.actionsHistory[this.history.actionsHistory.length - 1].push(actionItem);
  }

  onCanvasEvent(e: MouseEvent) {
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

  onTouchEvent(e: TouchEvent) {
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

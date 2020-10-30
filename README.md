# Simple Drawing Canvas

![Simple Drawing Canvas](https://pixlworks.io/simple-drawing-canvas-example/example.gif)

Simple Drawing Canvas is a quick way to include a lightweight but flexible HTML5 drawing canvas to any web page. Features include:

* **Base Tool Set:** Pen, Eraser, Fill/Bucket, Line, & Clear tools included.

* **Modular Tools:** Selectively add only the tools you want available for your users.

* **Extensible:** Create your own tools and use them just like the included tool set.

* **Undo/Redo:** Navigate history of actions on the canvas through undo/redo functions.

* **Touch Enabled:** Works with touch interfaces as well as traditional pointer devices.
  
* **UI-Agnostic:** No UI or front-end framework dependencies. Logic-only implementation makes it easy to plug into your preferred framework or just raw HTML/CSS/JS.
  
* **Responsive:** Listens to viewport size changes and adapts if canvas size changes. User input will remain accurate even as the canvas changes sizes.

* **Typescript:** Developed and fully-typed with Typescript.

Simple Drawing Canvas is intended to be a light scaffold that handles the boilerplate of wiring events to the canvas and provides a basic structure for canvas interaction.

It is not meant to be an entire level of abstraction over the Canvas API; as such, some familiarity with the Canvas API is still necessary for some of the included functionality and to implement new tools.

## Basic Usage

Setting up Simple Drawing Canvas on your page is a simple process:

### Javascript

```ts
// Import the Controller and callbacks for any tools you wish to use
import {
  DrawingCanvasController,
  penMouseEventCallback,
  penDrawingCallback,
  bucketMouseEventCallback,
  bucketDrawingCallback,
} from 'simple-drawing-canvas';

// 1. Instantiate the Canvas Controller
// Provide your canvas element node, and the width and height of the canvas
const controller = new DrawingCanvasController(canvasElement, 800, 800);


// 2. Add desired tools to the controller
// Provide a unique name for the tool, the 2 required callbacks, and an initial configuration
controller.addTool('pen', penMouseEventCallback, penDrawingCallback, { size: 10, style: '#000000' } );

controller.addTool('bucket', bucketMouseEventCallback, bucketDrawingCallback, { style: '#336699' } );

// 3. Set the current tool to be used
// Provide the name of one of the tools you've previously added
controller.setCurrentTool('pen')
```

### Typescript

Using Simple Drawing Canvas with Typescript will help you by preventing you from passing around incorrect tool configurations, referencing tools you haven't configured, as well as enhanced Intellisense information in your IDE. All the usual TS goodness.

It will, of course, also help a lot if you want to [create your own tools](#defining-custom-tools) for the canvas.

```ts
// Import the Controller, callbacks and config types for any tools you wish to use
import {
  DrawingCanvasController,
  PenTool, // Type of the configuration object for the Pen Tool
  penMouseEventCallback,
  penDrawingCallback,
  BucketTool, // Type of the configuration object for the Bucket Tool
  bucketMouseEventCallback,
  bucketDrawingCallback,
} from 'simple-drawing-canvas';

// 1. Instantiate the Canvas Controller
// TS: Provide the list of tool names as well as a map of the names to configuration types you intend to use as generic parameters
// Provide your canvas element node, and the width and height of the canvas
const controller = new DrawingCanvasController<'pen' | 'bucket', { pen: PenTool, bucket: BucketTool }>(canvasElement, 800, 800);


// 2. Add desired tools to the controller
// TS: Type-checking will tell you if you try to pass incompatible callbacks or tool configurations for the name of tool in the first parameter
// Provide a unique name for the tool, the 2 required callbacks, and an initial configuration
controller.addTool('pen', penMouseEventCallback, penDrawingCallback, { size: 10, style: '#000000' } );

controller.addTool('bucket', bucketMouseEventCallback, bucketDrawingCallback, { style: '#336699' } );

// 3. Set the current tool to be used
// TS: Type-checking  will tell you if you try pass a tool name you didn't provide in step 1
// Provide the name of one of the tools you've previously added
controller.setCurrentTool('pen')
```

## API

### **`constructor(canvasElement, width, height, background)`**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| canvasElement | HTMLCanvasElement | |
| width | number | Dimension of the canvas' drawing surface, not its size in your page layout |
| height | number | Dimension of the canvas' drawing surface, not its size in your page layout |
| background (optional) | string<br>HTMLImageElement<br>CanvasGradient<br>CanvasPattern<br>null | If using `string`, it must be a hexadecimal color representation or a CSS color keyword<br><br>When using `HTMLImageElement` the source image should already be loaded

Refer to the `setBackground()` documentation below for more information on the canvas background property.

---

### **`addTool(toolName, eventCB, actionCB, initialConfig)`**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| toolName | string | A unique name for this tool.<br><br>Using the name of a tool that has already been added will overwrite the callbacks and configuration for that tool |
| eventCB | [ToolMouseEventCallback](#mouse-events-callback) | A function that processes `MouseEvent`s for this tool and produces `ActionStep` objects if necessary. Refer to definition for details |
| actionCB | [ToolActionStepCallback](#action-step-callback) | A function that performs operations on the canvas based on `ActionStep` objects and the current Action history Refer to definition for details |
| initialConfig | object | An object of arbitrary shape (defined per-tool) that serves as the initial configuration for the tool being added |

Tools are defined by 2 callbacks and a configuration object (of a specific shape for the given tool) that the controller will call/se for a given tool when necessary.

---

### **undo(redraw)**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| redraw (optional) | boolean | Defaults to `true`.

Moves the latest Canvas Action from the active history to the undo list.

A 'Canvas Action' is a single complete use of a Tool, typically starting with mouse/touch down event and ending with a mouse/touch up event.

---

### **redo(redraw)**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| redraw (optional) | boolean | Defaults to `true`.

Moves the most recent Canvas Action in the undo list to the active history.

A 'Canvas Action' is a single complete use of a Tool, typically starting with mouse/touch down event and ending with a mouse/touch up event.

---

### **setBackground(background)**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| background | string<br>HTMLImageElement<br>CanvasGradient<br>CanvasPattern<br>null | If using `string`, it must be a hexadecimal color representation or a CSS color keyword<br><br>When using `HTMLImageElement` the source image should already be loaded

The `background` property of the canvas will be used to fill the canvas when the controller is instantiated (if provided in the controller constructor) and whenever the `clearCanvas()` function is called.

A `null` value results in a transparent canvas (i.e. whatever is behind in the canvas in the page will be visible). Note that if you export the canvas (for example, through `getDataURL()`) transparent pixels are only supported in certain image formats (e.g. PNG). When not supported, transparent pixels will default to black.

---

### **setBackgroundFromURL(url)**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| url | string | |

A convenience method for setting a background from an image URL.

---

### **getDataURL(type, quality)**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| type | string | Defaults to `image/png`.<br><br>Other possible values include `image/jpeg` and `image/webp` (Chrome-only)
| quality | number | Value between `0` and `1`. Quality level for image formats with lossy compression.

This is a proxy for the Canvas API method [toDataURL()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL)

---

## How Tools Work

Tools are composed of 3 properties:

1. A [function that processes mouse events](#mouse-events-callback) and produces tool 'states'
2. A [function that takes individual tool 'states'](#action-step-callback) and modifies the canvas accordingly
3. An [object with a custom shape](#tool-configuration) defining the properties relevant to that tool

### Mouse Events Callback: **`(event, canvas, canvasConfig, toolConfig, actionHistory)`**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| event | MouseEvent | The current `MouseEvent` to be processed |
| canvas | HTMLCanvasElement | |
| canvasConfig | [CanvasConfig](#canvasconfig) | The configuration of the canvas at the moment that the current event was triggered |
| toolConfig | object | An object with the shape required by this tool with the values configured at the moment the current event was triggered |
| actionHistory | [CanvasAction](#canvasaction) | Contains the list of existing `CanvasActionStep`s for the current action if any |

The Mouse Event Callback can return either `null` to ignore the event or a [ToolMouseEventCallbackResult](#toolmouseeventcallbackresult) to process a new [CanvasActionStep](#canvasactionstep) and modify the canvas.

---

### Action Step Callback: **`(actionStep, actionHistory, canvas, canvasConfig)`**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| actionStep | [CanvasActionStep](#canvasactionstep) | The current `CanvasActionStep` to be processed |
| actionHistory | [CanvasAction](#canvasaction) | Contains the list of existing `CanvasActionStep`s for the current action if any |
| canvas  | HTMLCanvasElement | |
| canvasConfig | [CanvasConfig](#canvasconfig) | The configuration of the canvas at the moment that this function is called |

The Action Step Callback takes a `CanvasActionStep` and modifies the canvas as necessary. 

The Action Step Callback does not return any value.

### Tool Configuration

The Tool Configuration object is regular object of arbitrary shape defined by the Tool with the properties it needs.

Some properties may be used to determine how to process events in the Mouse Event Callback and others how to modify the canvas during the Action Step Callback.

For example, the included Pen Tool has a simple Configuration object with the following shape:

```ts
{
  size: 10, // The diameter of the pen
  style: '#000000', // A color (or CanvasGradient/CanvasPattern) to use to paint
}
```

## Defining Custom Tools

As you see above, creating a new Tool is about defining 2 functions and the shape of an object that serves as configuration for your Tool.

There's really no better way to understand how to implement a Tool than to see the source code for the included Tools

* [Pen Tool](src/tools/pen/index.ts)
* [Line Tool](src/tools/line/index.ts)
* [Eraser Tool](src/tools/eraser/index.ts)
* [Bucket Tool](src/tools/bucket/index.ts)
* [Clear Tool](src/tools/clear/index.ts)

Within these tools there are examples for 3 different types of interactions that are common in drawing-related tools. Depending on your custom tool goal, the right tool from the above list can serve as a blueprint.

### **Act on Down & Drag**

These are tools that modify the canvas as the user drags the pointer around after clicking down on it, ending when the user let's go of the button (or stops touching the surface).

![Pen Tool](https://pixlworks.io/simple-drawing-canvas-example/pen-tool.gif)

The [Pen](src/tools/pen/index.ts) and the [Eraser](src/tools/eraser/index.ts) tools are examples of this type of interaction.

### **Act on Down, Drag & Up**

These tools are similar to the above Down & Drag types, but they do not fully modify the canvas until the user ends the Action by letting go of the mouse button (or stop touching the surface).

![Line Tool](https://pixlworks.io/simple-drawing-canvas-example/line-tool.gif)

The [Line](src/tools/line/index.ts) tool is an example of this interaction.

The start of the line is where the user clicks down, then as the user drags the pointer a straight line is temporarily drawn from that initial point to the current position of the pointer and the line is definitely drawn on the canvas when the user finishes the action by letting go.

### **Act on Click**

These tools only care that a full 'click' has occured (usually anywhere on the canvas) and are not interesed in any pointer-moving events in between.

As long as a button/touch down and button/touch up events occur within the canvas, these tools ignore every event inbetween.

![Bucket Tool](https://pixlworks.io/simple-drawing-canvas-example/bucket-tool.gif)

The [Bucket](src/tools/bucket/index.ts) and [Clear](src/tools/clear/index.ts) tools are examples of this.

### Related Objects

#### **CanvasConfig**

```ts
{
    width: number,
    height: number,
    scale: { // The ratio of canvas drawing surface size to the html canvas element size in the page layout
      x: number,
      y: number,
    }
    background: string | HTMLImageElement | CanvasGradien | CanvasPattern | null,
}
```

#### **CanvasActionStep**

A Canvas Action Step represents the 'state' of a Tool at a single point throughout an Canvas Action.

For example, the a Pen Tool Action is a collection of Action Steps starting with the moment the user clicks down, including all the different locations they drag the pointer to, and ending with the moment they let go of the mouse button (or stop touching the touch surface).

```ts
{
    tool: object, // Tool Configuration for this particular Action Step
    coords: { // The canvas coordinates where the event/state took place
      x: number,
      y: number,
    },
    state: string, // An arbitrary string to identify the type of state
};
```

#### **CanvasAction**

A simple object denoting the tool the Action belongs to and the array of Action Steps that compose the Action.

```ts
{
    tool: string, // Name of the tool
    steps: CanvasActionStep[],
}
```

#### **ToolMouseEventCallbackResult**

When a Tool's Mouse Event Callback processes a Mouse Event, it has the option of ignoring it (by returning `null`) or return this object to let the controller know that a new Action Step should be added to the current Action.

```ts
{
  actionStatus: string, // either 'continue', 'end', or 'cancel'
  actionUpdate: { // If not defined and 'actionStatus' is 'continue' or 'end' then no new Action Step is added to the Action
    replacePrevStep: boolean,
    actionStep: CanvasActionStep,
  }
}
```
Refer to [Defining Custom Tools](#defining-custom-tools) for more details.
import "./style.css";

const APP_NAME = "EZ SKETCH!!!";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// Add an h1 element with the app title
const titleElement = document.createElement("h1");
titleElement.textContent = APP_NAME;
app.appendChild(titleElement);

// Add a canvas element with size 256x256 pixels
const canvasElement = document.createElement("canvas");
canvasElement.width = 256;
canvasElement.height = 256;
canvasElement.id = "sketchCanvas";
app.appendChild(canvasElement);

// Add a clear button
const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
clearButton.id = "clearButton";
app.appendChild(clearButton);

// Add an undo button
const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
undoButton.id = "undoButton";
app.appendChild(undoButton);

// Add a redo button
const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
redoButton.id = "redoButton";
app.appendChild(redoButton);

// Add thin and thick marker tool buttons
const thinButton = document.createElement("button");
thinButton.textContent = "Thin";
thinButton.id = "thinButton";
thinButton.classList.add("selectedTool"); // Start with thin marker selected
app.appendChild(thinButton);

const thickButton = document.createElement("button");
thickButton.textContent = "Thick";
thickButton.id = "thickButton";
app.appendChild(thickButton);

// Add sticker buttons
const stickers = ["🎃", "👻", "🕸️"];
stickers.forEach((sticker, index) => {
    const stickerButton = document.createElement("button");
    stickerButton.textContent = sticker;
    stickerButton.id = `stickerButton${index}`;
    app.appendChild(stickerButton);

    stickerButton.addEventListener("click", () => {
        currentTool = "sticker";
        currentSticker = sticker;
        toolPreview = new ToolPreview(0, 0, currentThickness, currentSticker);

        // Remove "selectedTool" class from all sticker buttons
        stickers.forEach((_, i) => {
            document.getElementById(`stickerButton${i}`)?.classList.remove("selectedTool");
        });

        // Add "selectedTool" class to the clicked sticker button
        stickerButton.classList.add("selectedTool");

        thinButton.classList.remove("selectedTool");
        thickButton.classList.remove("selectedTool");
        canvasElement.dispatchEvent(new Event("tool-moved"));
    });
});

const ctx = canvasElement.getContext("2d")!;
let drawing = false;
let points: Array<Drawable> = [];
let redoStack: Array<Drawable> = [];
let currentLine: MarkerLine | null = null;
let currentThickness = 2; // Default thickness
let toolPreview: ToolPreview | null = null;
let currentTool: "marker" | "sticker" = "marker";
let currentSticker: string | null = null;

interface Drawable {
    display(ctx: CanvasRenderingContext2D): void;
}

class MarkerLine implements Drawable {
    private points: Array<{ x: number, y: number }> = [];
    private thickness: number;

    constructor(initialX: number, initialY: number, thickness: number) {
        this.points.push({ x: initialX, y: initialY });
        this.thickness = thickness;
    }

    drag(x: number, y: number) {
        this.points.push({ x, y });
    }

    display(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.lineWidth = this.thickness;
        this.points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
    }
}

class Sticker implements Drawable {
    private x: number;
    private y: number;
    private emoji: string;

    constructor(x: number, y: number, emoji: string) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
    }

    drag(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    display(ctx: CanvasRenderingContext2D) {
        ctx.font = "24px Arial";
        ctx.fillText(this.emoji, this.x, this.y);
    }
}

class ToolPreview implements Drawable {
    private x: number;
    private y: number;
    private thickness: number;
    private emoji: string | null;

    constructor(x: number, y: number, thickness: number, emoji: string | null) {
        this.x = x;
        this.y = y;
        this.thickness = thickness;
        this.emoji = emoji;
    }

    updatePosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    updateTool(thickness: number, emoji: string | null) {
        this.thickness = thickness;
        this.emoji = emoji;
    }

    display(ctx: CanvasRenderingContext2D) {
        if (this.emoji) {
            ctx.font = "24px Arial";
            ctx.fillText(this.emoji, this.x, this.y);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
            ctx.fillStyle = "black"; // Fill the circle to avoid a hole in the middle
            ctx.fill();
        }
    }
}

canvasElement.addEventListener("mousedown", (event) => {
    drawing = true;
    if (currentTool === "marker") {
        currentLine = new MarkerLine(event.offsetX, event.offsetY, currentThickness);
        points.push(currentLine);
    } else if (currentTool === "sticker" && currentSticker) {
        const sticker = new Sticker(event.offsetX, event.offsetY, currentSticker);
        points.push(sticker);
        toolPreview = null; // Hide tool preview when placing sticker
    }
});

canvasElement.addEventListener("mouseup", () => {
    drawing = false;
    currentLine = null;
    ctx.beginPath(); // Reset the path to avoid connecting lines
});

canvasElement.addEventListener("mousemove", (event) => {
    if (!drawing) {
        if (!toolPreview) {
            toolPreview = new ToolPreview(event.offsetX, event.offsetY, currentThickness, currentSticker);
        } else {
            toolPreview.updatePosition(event.offsetX, event.offsetY);
            toolPreview.updateTool(currentThickness, currentSticker);
        }
        canvasElement.dispatchEvent(new Event("tool-moved"));
    } else if (currentLine) {
        currentLine.drag(event.offsetX, event.offsetY);
        canvasElement.dispatchEvent(new Event("drawing-changed"));
    }
});

canvasElement.addEventListener("mouseleave", () => {
    toolPreview = null;
    canvasElement.dispatchEvent(new Event("tool-moved"));
});

canvasElement.addEventListener("drawing-changed", () => {
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    points.forEach(line => line.display(ctx));
});

canvasElement.addEventListener("tool-moved", () => {
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    points.forEach(line => line.display(ctx));

    if (toolPreview) {
        toolPreview.display(ctx);
    }
});

clearButton.addEventListener("click", () => {
    points = [];
    redoStack = [];
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
});

undoButton.addEventListener("click", () => {
    if (points.length > 0) {
        const lastLine = points.pop();
        if (lastLine) {
            redoStack.push(lastLine);
        }
        canvasElement.dispatchEvent(new Event("drawing-changed"));
    }
});

redoButton.addEventListener("click", () => {
    if (redoStack.length > 0) {
        const lastLine = redoStack.pop();
        if (lastLine) {
            points.push(lastLine);
        }
        canvasElement.dispatchEvent(new Event("drawing-changed"));
    }
});

thinButton.addEventListener("click", () => {
    currentTool = "marker";
    currentThickness = 2;
    currentSticker = null;
    toolPreview = new ToolPreview(0, 0, currentThickness, currentSticker);
    thinButton.classList.add("selectedTool");
    thickButton.classList.remove("selectedTool");
    stickers.forEach((_, index) => {
        document.getElementById(`stickerButton${index}`)?.classList.remove("selectedTool");
    });
    canvasElement.dispatchEvent(new Event("tool-moved"));
});

thickButton.addEventListener("click", () => {
    currentTool = "marker";
    currentThickness = 5;
    currentSticker = null;
    toolPreview = new ToolPreview(0, 0, currentThickness, currentSticker);
    thickButton.classList.add("selectedTool");
    thinButton.classList.remove("selectedTool");
    stickers.forEach((_, index) => {
        document.getElementById(`stickerButton${index}`)?.classList.remove("selectedTool");
    });
    canvasElement.dispatchEvent(new Event("tool-moved"));
});

 fdsaf

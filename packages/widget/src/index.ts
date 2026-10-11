import { FAILED_STATUSES, parseMessage, type Transaction } from "./message.ts";

export { FAILED_STATUSES, type Transaction, type TransactionStatus } from "./message.ts";

export type OpenOptions = {
  /** `url` returned by `POST /v1/sessions` (or a SEP-24 interactive URL). */
  url: string;
  /** "modal" (default) shows the widget over the page in an iframe; "popup" opens a window. */
  mode?: "modal" | "popup";
  /** Every status change of the deposit. */
  onStatus?: (transaction: Transaction) => void;
  /** The USDC reached the user's account. */
  onComplete?: (transaction: Transaction) => void;
  /** The deposit failed, or the popup was blocked. */
  onError?: (error: LendaraWidgetError) => void;
  /** The widget was closed, by the user or with `close()`. */
  onClose?: () => void;
};

export type WidgetHandle = {
  /** Closes the widget. */
  close: () => void;
};

export class LendaraWidgetError extends Error {
  /** The failed transaction; undefined when the popup was blocked. */
  readonly transaction: Transaction | undefined;

  constructor(message: string, transaction?: Transaction) {
    super(message);
    this.name = "LendaraWidgetError";
    this.transaction = transaction;
  }
}

const POPUP_WIDTH = 448;
const POPUP_HEIGHT = 780;
const STYLE_ID = "lendara-widget-style";
const CSS = `
.lendara-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(12,12,14,.55)}
.lendara-frame{width:100%;max-width:${POPUP_WIDTH}px;height:min(${POPUP_HEIGHT}px,calc(100dvh - 48px));border:0;border-radius:16px;background:#fff;box-shadow:0 24px 64px rgba(0,0,0,.3)}
@media (max-width:520px){.lendara-overlay{padding:0}.lendara-frame{max-width:none;height:100dvh;border-radius:0}}
`;

let current: WidgetHandle | null = null;

/** Opens the Lendara widget. Only one widget is open at a time. */
function open(options: OpenOptions): WidgetHandle {
  current?.close();
  const origin = new URL(options.url).origin;
  const mode = options.mode ?? "modal";

  let source: Window | null = null;
  let cleanup = () => {};
  let closed = false;

  const handle: WidgetHandle = {
    close() {
      if (closed) return;
      closed = true;
      window.removeEventListener("message", onMessage);
      cleanup();
      if (current === handle) current = null;
      options.onClose?.();
    },
  };

  function onMessage(event: MessageEvent) {
    if (event.origin !== origin || source === null || event.source !== source) return;
    const message = parseMessage(event.data);
    if (message?.type === "close") handle.close();
    if (message?.type !== "transaction") return;
    const tx = message.transaction;
    options.onStatus?.(tx);
    if (tx.status === "completed") options.onComplete?.(tx);
    else if (FAILED_STATUSES.has(tx.status)) {
      options.onError?.(new LendaraWidgetError(tx.message ?? `The deposit ended with status ${tx.status}`, tx));
    }
  }

  if (mode === "popup") {
    const left = Math.max(0, window.screenX + (window.outerWidth - POPUP_WIDTH) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2);
    const popup = window.open(
      options.url,
      "lendara-widget",
      `popup,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`,
    );
    if (!popup) {
      options.onError?.(new LendaraWidgetError("The browser blocked the popup. Open the widget from a click."));
      closed = true;
      return handle;
    }
    source = popup;
    // There is no close event for another window: poll for it.
    const timer = window.setInterval(() => popup.closed && handle.close(), 500);
    cleanup = () => {
      window.clearInterval(timer);
      if (!popup.closed) popup.close();
    };
  } else {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.append(style);
    }
    const overlay = document.createElement("div");
    overlay.className = "lendara-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Lendara");
    const frame = document.createElement("iframe");
    frame.className = "lendara-frame";
    frame.src = options.url;
    frame.title = "Lendara deposit";
    frame.allow = "clipboard-write";
    overlay.append(frame);

    const root = document.documentElement;
    const overflow = root.style.overflow;
    const focused = document.activeElement;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handle.close();

    root.style.overflow = "hidden";
    document.body.append(overlay);
    document.addEventListener("keydown", onKey);
    frame.focus();
    source = frame.contentWindow;
    cleanup = () => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      root.style.overflow = overflow;
      if (focused instanceof HTMLElement) focused.focus();
    };
  }

  window.addEventListener("message", onMessage);
  current = handle;
  return handle;
}

export const Lendara = { open };

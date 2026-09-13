"use client";

/**
 * Browser WebSocket manager for the Lighter stream.
 *
 * This runs in the visitor's browser on purpose. Public channels are
 * unauthenticated and the limits are per-IP (255 connections, 500
 * subscriptions each), so streaming from the client scales with traffic at
 * zero server cost — the opposite of the REST path, where every server render
 * shares one bucket.
 *
 * One socket per tab, multiplexed across channels, with refcounted
 * subscriptions and exponential-backoff reconnects.
 */

export const WS_URL =
  process.env.NEXT_PUBLIC_LIGHTER_WS ??
  "wss://mainnet.zklighter.elliot.ai/stream";

export type WsMessage = Record<string, unknown> & {
  type?: string;
  channel?: string;
};

type Handler = (msg: WsMessage) => void;
export type WsStatus = "connecting" | "open" | "closed";

export interface SubscribeOptions {
  /**
   * Ask the server to batch this channel's updates into one message per
   * interval, in milliseconds — what Lighter's own client does for stats.
   */
  flushInterval?: number;
}

const PING_MS = 25_000;
const MAX_BACKOFF = 30_000;

class LighterSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private options = new Map<string, SubscribeOptions>();
  private statusWatchers = new Set<(s: WsStatus) => void>();
  private attempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUs = false;
  /** Channels whose subscribe snapshot has already been delivered. */
  private snapshotted = new Set<string>();
  status: WsStatus = "closed";

  private setStatus(s: WsStatus) {
    this.status = s;
    this.statusWatchers.forEach((w) => w(s));
  }

  onStatus(w: (s: WsStatus) => void): () => void {
    this.statusWatchers.add(w);
    w(this.status);
    return () => this.statusWatchers.delete(w);
  }

  private connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;

    this.closedByUs = false;
    this.setStatus("connecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.setStatus("open");
      // Re-subscribe everything this tab is watching.
      for (const channel of this.handlers.keys()) this.send(channel, "subscribe");
      this.pingTimer = setInterval(() => {
        if (socket.readyState === 1) {
          try {
            socket.send(JSON.stringify({ type: "ping" }));
          } catch {
            /* the close handler will deal with it */
          }
        }
      }, PING_MS);
    };

    socket.onmessage = (ev) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(ev.data as string) as WsMessage;
      } catch {
        return;
      }
      // The server answers `channel` with ':' where subscribes use '/'.
      const raw = typeof msg.channel === "string" ? msg.channel : "";
      const normalised = raw.replace(/:/g, "/");
      if (String(msg.type ?? "").startsWith("subscribed")) this.snapshotted.add(normalised);
      const set = this.handlers.get(normalised) ?? this.handlers.get(raw);
      set?.forEach((h) => {
        try {
          h(msg);
        } catch (err) {
          console.error("[ws] handler threw", err);
        }
      });
    };

    socket.onerror = () => {
      /* onclose always follows; handle it there */
    };

    socket.onclose = () => {
      this.cleanupTimers();
      this.ws = null;
      this.snapshotted.clear();
      this.setStatus("closed");
      if (!this.closedByUs && this.handlers.size > 0) this.scheduleReconnect();
    };
  }

  private cleanupTimers() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    // Deploys drop connections; jitter avoids a thundering herd on reconnect.
    const delay = Math.min(MAX_BACKOFF, 700 * 2 ** this.attempts++);
    const jitter = delay * (0.7 + Math.random() * 0.6);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jitter);
  }

  private send(channel: string, type: "subscribe" | "unsubscribe") {
    if (this.ws?.readyState !== 1) return;
    const message: Record<string, string> = { type, channel };
    const flush = type === "subscribe" ? this.options.get(channel)?.flushInterval : undefined;
    if (flush && flush > 0) message.flush_interval = String(Math.round(flush));
    try {
      this.ws.send(JSON.stringify(message));
    } catch {
      /* reconnect will re-subscribe */
    }
  }

  /**
   * Drop and re-take a channel to force a fresh snapshot. Delta streams call
   * this on a sequence gap — patching over a gap would leave local state
   * silently wrong, and the server answers a new subscribe with a full copy.
   */
  resubscribe(channel: string) {
    if (!this.handlers.has(channel)) return;
    this.send(channel, "unsubscribe");
    this.send(channel, "subscribe");
  }

  subscribe(channel: string, handler: Handler, options?: SubscribeOptions): () => void {
    if (options) this.options.set(channel, options);
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
      if (this.ws?.readyState === 1) this.send(channel, "subscribe");
    } else if (this.snapshotted.has(channel)) {
      // The server sends a channel's snapshot once, to the first subscriber.
      // A component that joins later would only ever see deltas — an order
      // book with no levels, a stats map with one market — so ask again.
      // Every consumer tolerates a repeat: books reset, the rest de-duplicate.
      this.snapshotted.delete(channel);
      this.resubscribe(channel);
    }
    set.add(handler);

    this.connect();

    return () => {
      const s = this.handlers.get(channel);
      if (!s) return;
      s.delete(handler);
      if (s.size === 0) {
        this.handlers.delete(channel);
        this.options.delete(channel);
        this.snapshotted.delete(channel);
        this.send(channel, "unsubscribe");
      }
      if (this.handlers.size === 0) {
        this.closedByUs = true;
        this.cleanupTimers();
        this.ws?.close();
        this.ws = null;
      }
    };
  }
}

let singleton: LighterSocket | null = null;

export function lighterSocket(): LighterSocket {
  if (!singleton) singleton = new LighterSocket();
  return singleton;
}

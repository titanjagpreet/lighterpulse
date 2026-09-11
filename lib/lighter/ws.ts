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

const PING_MS = 25_000;
const MAX_BACKOFF = 30_000;

class LighterSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private statusWatchers = new Set<(s: WsStatus) => void>();
  private attempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUs = false;
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
    try {
      this.ws.send(JSON.stringify({ type, channel }));
    } catch {
      /* reconnect will re-subscribe */
    }
  }

  subscribe(channel: string, handler: Handler): () => void {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
      if (this.ws?.readyState === 1) this.send(channel, "subscribe");
    }
    set.add(handler);

    this.connect();

    return () => {
      const s = this.handlers.get(channel);
      if (!s) return;
      s.delete(handler);
      if (s.size === 0) {
        this.handlers.delete(channel);
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

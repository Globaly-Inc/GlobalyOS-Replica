import * as Y from 'yjs';
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lightweight Yjs provider that syncs via Supabase Realtime Broadcast + Presence.
 *
 * Broadcast is used for Yjs document updates (binary) AND awareness updates.
 * Presence is used only for detecting when peers leave (to remove their cursors).
 */
export class SupabaseYjsProvider {
  doc: Y.Doc;
  awareness: Awareness;

  private channel: RealtimeChannel;
  private supabase: SupabaseClient;
  private channelName: string;
  private connected = false;
  private synced = false;
  private _onDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private _onAwarenessUpdate: (changes: { added: number[]; updated: number[]; removed: number[] }) => void;
  private _destroyed = false;

  // Callbacks for BlockNote collaboration interface
  onConnect?: () => void;
  onDisconnect?: () => void;

  constructor(
    supabase: SupabaseClient,
    channelName: string,
    doc: Y.Doc,
  ) {
    this.supabase = supabase;
    this.channelName = channelName;
    this.doc = doc;
    this.awareness = new Awareness(doc);

    // Listen for local doc updates and broadcast them
    this._onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === this) return; // ignore updates applied by us
      this.broadcastUpdate(update);
    };

    // Listen for local awareness changes and broadcast via broadcast channel
    this._onAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = [...added, ...updated, ...removed];
      if (changedClients.includes(this.doc.clientID)) {
        this.broadcastAwareness();
      }
    };

    this.doc.on('update', this._onDocUpdate);
    this.awareness.on('update', this._onAwarenessUpdate);

    // Create channel
    this.channel = this.supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    this.setupChannel();
  }

  private setupChannel() {
    this.channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        if (this._destroyed) return;
        try {
          const update = new Uint8Array(payload.update);
          Y.applyUpdate(this.doc, update, this);
        } catch (e) {
          console.error('[SupabaseYjsProvider] Failed to apply update:', e);
        }
      })
      .on('broadcast', { event: 'yjs-sync-request' }, () => {
        // A new peer wants the full state — send our current doc state
        if (this._destroyed) return;
        const state = Y.encodeStateAsUpdate(this.doc);
        this.channel.send({
          type: 'broadcast',
          event: 'yjs-sync-response',
          payload: { update: Array.from(state) },
        });
        // Also send our current awareness so the new peer sees our cursor
        this.broadcastAwareness();
      })
      .on('broadcast', { event: 'yjs-sync-response' }, ({ payload }) => {
        if (this._destroyed) return;
        try {
          const update = new Uint8Array(payload.update);
          Y.applyUpdate(this.doc, update, this);
        } catch (e) {
          console.error('[SupabaseYjsProvider] Failed to apply sync response:', e);
        }
      })
      // Awareness updates arrive via broadcast (not presence)
      .on('broadcast', { event: 'yjs-awareness' }, ({ payload }) => {
        if (this._destroyed) return;
        try {
          const update = new Uint8Array(payload.update);
          applyAwarenessUpdate(this.awareness, update, this);
        } catch (e) {
          console.error('[SupabaseYjsProvider] Failed to apply awareness update:', e);
        }
      })
      // Presence is only used for detecting leave (to clean up cursors)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (this._destroyed) return;
        const clientsToRemove: number[] = [];
        for (const p of leftPresences) {
          if (p.clientID && p.clientID !== this.doc.clientID) {
            clientsToRemove.push(p.clientID as number);
          }
        }
        if (clientsToRemove.length > 0) {
          removeAwarenessStates(this.awareness, clientsToRemove, this);
        }
      })
      .subscribe(async (status) => {
        if (this._destroyed) return;
        if (status === 'SUBSCRIBED') {
          this.connected = true;
          this.onConnect?.();

          // Track presence with just our clientID (for leave detection)
          try {
            await this.channel.track({ clientID: this.doc.clientID });
          } catch {
            // Presence tracking can fail transiently
          }

          // Broadcast our awareness state
          this.broadcastAwareness();

          // Request full state from peers (in case someone is already editing)
          this.channel.send({
            type: 'broadcast',
            event: 'yjs-sync-request',
            payload: {},
          });

          // Mark synced after a short delay (give peers time to respond)
          setTimeout(() => {
            if (!this._destroyed) {
              this.synced = true;
            }
          }, 500);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.connected = false;
          this.onDisconnect?.();
        }
      });
  }

  private broadcastUpdate(update: Uint8Array) {
    if (!this.connected || this._destroyed) return;
    this.channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { update: Array.from(update) },
    });
  }

  private broadcastAwareness() {
    if (!this.connected || this._destroyed) return;
    const localState = this.awareness.getLocalState();
    if (!localState) return;
    try {
      const update = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-awareness',
        payload: { update: Array.from(update) },
      });
    } catch {
      // Encoding can fail transiently
    }
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.doc.off('update', this._onDocUpdate);
    this.awareness.off('update', this._onAwarenessUpdate);
    this.awareness.destroy();
    this.supabase.removeChannel(this.channel);
    this.connected = false;
  }
}

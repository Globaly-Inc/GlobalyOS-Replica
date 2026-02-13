import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lightweight Yjs provider that syncs via Supabase Realtime Broadcast + Presence.
 *
 * Broadcast is used for Yjs document updates (binary).
 * Presence is used for awareness (cursor positions, user info).
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

    // Listen for local awareness changes and broadcast via presence
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
      .on('presence', { event: 'sync' }, () => {
        if (this._destroyed) return;
        this.applyRemoteAwareness();
      })
      .on('presence', { event: 'join' }, () => {
        if (this._destroyed) return;
        this.applyRemoteAwareness();
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (this._destroyed) return;
        // Remove awareness for peers that left
        for (const p of leftPresences) {
          if (p.clientID && p.clientID !== this.doc.clientID) {
            const states = this.awareness.getStates();
            states.delete(p.clientID as number);
            this.awareness.emit('change', [
              { added: [], updated: [], removed: [p.clientID as number] },
              this,
            ]);
          }
        }
      })
      .subscribe(async (status) => {
        if (this._destroyed) return;
        if (status === 'SUBSCRIBED') {
          this.connected = true;
          this.onConnect?.();

          // Track presence with our awareness info
          await this.broadcastAwareness();

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

  private async broadcastAwareness() {
    if (!this.connected || this._destroyed) return;
    const localState = this.awareness.getLocalState();
    if (!localState) return;
    try {
      await this.channel.track({
        clientID: this.doc.clientID,
        awarenessState: localState,
      });
    } catch {
      // Presence tracking can fail transiently
    }
  }

  private applyRemoteAwareness() {
    const presenceState = this.channel.presenceState();
    for (const key of Object.keys(presenceState)) {
      const presences = presenceState[key] as Array<{
        clientID?: number;
        awarenessState?: Record<string, unknown>;
      }>;
      for (const p of presences) {
        if (p.clientID && p.clientID !== this.doc.clientID && p.awarenessState) {
          this.awareness.setLocalStateField('__remote__', null); // no-op to trigger
          // Directly set remote awareness state
          const states = this.awareness.getStates();
          states.set(p.clientID, p.awarenessState as Record<string, unknown>);
          // Emit awareness change
          this.awareness.emit('change', [
            { added: [p.clientID], updated: [], removed: [] },
            this,
          ]);
        }
      }
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

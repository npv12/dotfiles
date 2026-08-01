// Local plugin-context types matching the TUI plugin runtime bundled in
// opencode2 next-16664 (module shape { id, setup }). The installed
// @opencode-ai/plugin@1.17.16 package exports neither `Plugin.define` nor
// matching context types, so this module never imports it at runtime and
// types the context locally — same convention as opencode-session-recap and
// opencode-context-sidebar.
//
// Shapes derived from the next-16664 runtime sources (tui/src/plugin/api.tsx
// + context/data.tsx): ctx.ui.slot, ctx.ui.router.current, ctx.data.on,
// ctx.data.session.*, ctx.client (full API), ctx.keymap, ctx.theme.

export type Color = any; // RGBA object or hex string, accepted by <text fg=...>

export interface Theme {
  text: {
    default: Color;
    subdued: Color;
    feedback?: {
      warning?: { default?: Color };
      error?: { default?: Color };
      success?: { default?: Color };
    };
  };
  background?: { surface?: { offset?: Color } };
  hue?: Record<string, Record<number, Color>>;
}

export interface LocationInfo {
  directory?: string;
  workspaceID?: string;
}

export interface ModelLike {
  id: string;
  providerID: string;
  limit?: { context?: number };
}

export interface MessageLike {
  id: string;
  type?: string;
  status?: string;
  text?: string;
  content?: readonly { type?: string; text?: string }[];
  tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
  model?: { providerID: string; id: string };
}

export interface SessionInfo {
  id: string;
  parentID?: string;
  model?: { providerID: string; id: string; variant?: string };
  location?: LocationInfo;
  revert?: { messageID?: string };
  cost?: number;
}

export interface ShellLike {
  id: string;
  metadata: { sessionID?: string };
}

export interface Route {
  type?: string;
  sessionID?: string;
}

export interface TuiEvent {
  type: string;
  data?: Record<string, unknown>;
}

export interface TuiPluginContext {
  readonly options: Record<string, unknown>;
  readonly location: LocationInfo;
  readonly app: { version: string; channel: string };
  readonly theme: Theme;
  readonly data: {
    on(event: string, handler: (event: TuiEvent) => void): () => void;
    session: {
      get(sessionID: string): SessionInfo | undefined;
      family(sessionID: string): readonly string[];
      status(sessionID: string): string;
      cost(sessionID: string): number;
      message: { list(sessionID: string): readonly MessageLike[] };
    };
    shell: { list(location?: LocationInfo): readonly ShellLike[] };
    location: {
      model: { list(location?: LocationInfo): readonly ModelLike[] | undefined };
    };
  };
  readonly client: {
    session: {
      get(input: { sessionID: string }): Promise<unknown>;
      synthetic(input: {
        sessionID: string;
        text: string;
        description?: string;
        metadata?: Record<string, unknown>;
      }): Promise<unknown>;
    };
  };
  readonly keymap: {
    layer(layer: () => unknown): unknown;
    shortcuts(id: string): readonly { key: string }[];
  };
  readonly ui: {
    router: { current(): Route };
    slot(name: string, render: (props: Record<string, unknown>) => unknown): unknown;
    toast: {
      show(options: {
        title?: string;
        message: string;
        variant?: "info" | "success" | "warning" | "error";
        duration?: number;
      }): void;
    };
  };
}

// Local plugin-context types matching the Promise-plugin runtime bundled in
// opencode2 next-16664 (module shape { id, setup }). The installed
// @opencode-ai/plugin@1.17.16 package exports neither `Plugin.define` nor
// matching context types, so this module never imports it at runtime and
// types the context locally — same convention as opencode-memory-md and the
// TUI plugins in ../plugins/tui/.
//
// Shapes derived from the next-16664 runtime sources (core/src/plugin/
// promise.ts + host.ts): the promise adapter wraps the Effect host and
// exposes the capabilities below. Tool.Info comes from schema/src/tool.ts.

export interface PluginContext {
  readonly options: Record<string, unknown>;
  readonly app: { name: string; version: string; channel: string };
  readonly tool: {
    transform(
      callback: (draft: { add(tool: ToolInfo): void }) => void
    ): Promise<Registration>;
  };
  readonly session: {
    get(input: { sessionID: string }): Promise<SessionInfo>;
    synthetic(input: {
      sessionID: string;
      text: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }): Promise<unknown>;
  };
  readonly event: {
    subscribe(): AsyncIterable<PluginEvent>;
  };
}

export interface Registration {
  dispose(): Promise<void>;
}

// Tool.Info from the runtime schema (schema/src/tool.ts): `input` is raw
// JSON Schema; tools without `output` return model-visible `content` from
// execute.
export interface ToolInfo {
  name: string;
  description: string;
  input: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  execute(
    input: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> | ToolResult;
  options?: { namespace?: string; codemode?: boolean; permission?: string };
}

export interface ToolResult {
  output?: unknown;
  content?: unknown;
  metadata?: unknown;
}

export interface ToolContext {
  sessionID: string;
  agent: string;
  messageID: string;
  callID: string;
  progress(update: unknown): Promise<void>;
}

// Session.Info from the runtime schema (schema/src/session.ts), narrowed to
// the fields the plugin reads.
export interface SessionInfo {
  id: string;
  parentID?: string;
  model?: { providerID: string; id: string; variant?: string };
}

// Bus event as surfaced by ctx.event.subscribe(): every event carries a
// `type` plus its schema fields.
export interface PluginEvent {
  type: string;
  [key: string]: unknown;
}

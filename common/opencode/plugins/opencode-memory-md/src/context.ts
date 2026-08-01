// Local plugin-context types matching the Promise-plugin runtime bundled in
// opencode2 next-16650 (module shape { id, setup }, ctx.tool.transform with
// draft.add, ctx.session.hook("context") with a mutable system part array).
// The installed @opencode-ai/plugin@1.17.16 package exports neither the v2
// `Plugin.define` nor matching context types, so this module never imports
// it at runtime and types the context locally — same convention as the
// TUI plugins in ../plugins/tui/.
//
// Shapes derived from the next-16650 runtime sources (core/src/plugin/
// promise.ts + host.ts): the promise adapter wraps the Effect host and
// exposes exactly the capabilities below.

export interface PluginContext {
  readonly options: Record<string, unknown>;
  readonly app: { name: string; version: string; channel: string };
  readonly tool: {
    transform(
      callback: (draft: { add(tool: ToolInfo): void }) => void
    ): Promise<Registration>;
  };
  readonly session: {
    hook(
      name: "context",
      callback: (event: SessionContextEvent) => void
    ): Promise<Registration>;
  };
}

export interface Registration {
  dispose(): Promise<void>;
}

// Structural tool definition accepted by ctx.tool.transform -> draft.add.
// `input` is raw JSON Schema; tools without `output` return model-visible
// `content` from execute.
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
  options?: { namespace?: string; codemode?: boolean };
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

// LLM.SystemPart from the runtime schema (ai/src/schema/messages.ts).
export interface SystemPart {
  type: "text";
  text: string;
  cache?: unknown;
  metadata?: Record<string, unknown>;
}

// Event handed to ctx.session.hook("context", ...) on every outbound model
// request (core/src/session/model-request.ts): system/messages/tools are
// mutable, and the mutated event becomes the request.
export interface SessionContextEvent {
  sessionID: string;
  agent: string;
  model: { providerID: string; id: string; variant?: string };
  system: SystemPart[];
  messages: unknown[];
  tools: Record<string, { description: string; input: unknown }>;
}

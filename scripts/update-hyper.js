#!/usr/bin/env node

const fs = require("fs")
const https = require("https")
const path = require("path")

const DEFAULT_FILES = ["common/opencode/opencode.jsonc", "common/zed/settings.json"]

const HYPER_MODELS_URL = "https://hyper.charm.land/v1/models"

const HYPER_BASE_URL = "https://hyper.charm.land/v1"

const DEFAULT_PROVIDER_ID = "hyper"
const DEFAULT_PROVIDER_NAME = "Charm Hyper"
const DEFAULT_API_KEY = "{env:HYPER_API_KEY}"

function fetchJSON(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { accept: "application/json" } }, (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location &&
          redirects > 0
        ) {
          res.resume()
          const nextURL = new URL(res.headers.location, url).toString()
          return resolve(fetchJSON(nextURL, redirects - 1))
        }

        let data = ""

        res.on("data", (chunk) => {
          data += chunk
        })

        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`GET ${url} failed: HTTP ${res.statusCode}\n${data}`))
          }

          try {
            resolve(JSON.parse(data))
          } catch (err) {
            reject(new Error(`Failed to parse JSON from ${url}: ${err.message}`))
          }
        })
      })
      .on("error", reject)
  })
}

function stripJsonc(input) {
  let output = ""

  let inString = false
  let stringQuote = ""
  let escaped = false
  let inLineComment = false
  let inBlockComment = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const next = input[i + 1]

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false
        output += ch
      }
      continue
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false
        i++
      }
      continue
    }

    if (inString) {
      output += ch

      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === stringQuote) {
        inString = false
        stringQuote = ""
      }

      continue
    }

    if (ch === '"' || ch === "'") {
      inString = true
      stringQuote = ch
      output += ch
      continue
    }

    if (ch === "/" && next === "/") {
      inLineComment = true
      i++
      continue
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true
      i++
      continue
    }

    output += ch
  }

  return output.replace(/,\s*([}\]])/g, "$1")
}

function readJsonc(file) {
  if (!fs.existsSync(file)) {
    return {
      $schema: "https://opencode.ai/config.json",
    }
  }

  const content = fs.readFileSync(file, "utf8")
  const json = stripJsonc(content).trim()

  if (!json) {
    return {
      $schema: "https://opencode.ai/config.json",
    }
  }

  return JSON.parse(json)
}

function numberOrZero(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function sortObjectByKey(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    files: [],
    providerID: DEFAULT_PROVIDER_ID,
    providerName: DEFAULT_PROVIDER_NAME,
    baseURL: HYPER_BASE_URL,
    apiKey: DEFAULT_API_KEY,
    replaceModels: true,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === "--dry-run") {
      args.dryRun = true
      continue
    }

    if (arg === "--merge-models") {
      args.replaceModels = false
      continue
    }

    if (arg === "--replace-models") {
      args.replaceModels = true
      continue
    }

    if (arg === "--file") {
      const value = argv[++i]
      if (!value) throw new Error("--file requires a path")
      args.files.push(value)
      continue
    }

    if (arg === "--provider-id") {
      const value = argv[++i]
      if (!value) throw new Error("--provider-id requires a value")
      args.providerID = value
      continue
    }

    if (arg === "--provider-name") {
      const value = argv[++i]
      if (!value) throw new Error("--provider-name requires a value")
      args.providerName = value
      continue
    }

    if (arg === "--base-url") {
      const value = argv[++i]
      if (!value) throw new Error("--base-url requires a URL")
      args.baseURL = value
      continue
    }

    if (arg === "--api-key") {
      const value = argv[++i]
      if (!value) throw new Error("--api-key requires a value")
      args.apiKey = value
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (args.files.length === 0) {
    args.files = DEFAULT_FILES
  }

  return args
}

function ensureConfigShape(config) {
  config.$schema ||= "https://opencode.ai/config.json"
  config.provider ||= {}
  return config
}

function toOpenCodeModel(liveModel) {
  const supportsAttachments = Boolean(liveModel.capabilities?.vision)
  const supportsReasoning = Boolean(liveModel.reasoning?.effort_levels?.length > 0)

  const result = {
    name: liveModel.display_name || liveModel.id,

    limit: {
      context: numberOrZero(liveModel.context_window),
      input: numberOrZero(liveModel.context_window),
      output: numberOrZero(liveModel.max_output_tokens),
    },

    reasoning: supportsReasoning,
    attachment: supportsAttachments,
    tool_call: true,

    modalities: {
      input: supportsAttachments ? ["text", "image", "pdf"] : ["text"],
      output: ["text"],
    },

    status: "active",
  }

  result.cost = {
    input: numberOrZero(liveModel.pricing?.input),
    output: numberOrZero(liveModel.pricing?.output),
    cache_read: numberOrZero(liveModel.pricing?.cache_hit),
    cache_write: numberOrZero(liveModel.pricing?.cache_create),
  }

  if (liveModel.reasoning?.effort_levels?.length > 0) {
    result.variants = {}

    for (const level of liveModel.reasoning.effort_levels) {
      result.variants[level.value] = {
        reasoningEffort: level.value,
      }
    }

    if (
      liveModel.id.toLowerCase().includes("deepseek-v4") &&
      liveModel.reasoning.effort_levels.some((l) => l.value === "xhigh") &&
      !liveModel.reasoning.effort_levels.some((l) => l.value === "max")
    ) {
      result.variants.max = {
        disabled: true,
      }
    }
  }

  return result
}

function toZedModel(liveModel) {
  const supportsAttachments = Boolean(liveModel.capabilities?.vision)
  const supportsReasoning = Boolean(liveModel.reasoning?.effort_levels?.length > 0)

  let reasoningEffort = null
  if (liveModel.reasoning?.effort_levels?.length > 0) {
    reasoningEffort = liveModel.reasoning.effort_levels[0].value
  }

  return {
    name: liveModel.display_name || liveModel.id,
    max_tokens: numberOrZero(liveModel.context_window),
    max_output_tokens: numberOrZero(liveModel.max_output_tokens),
    max_completion_tokens: numberOrZero(liveModel.context_window),
    reasoning_effort: reasoningEffort || "high",
    capabilities: {
      tools: true,
      images: supportsAttachments,
      parallel_tool_calls: true,
      prompt_cache_key: true,
      chat_completions: true,
      interleaved_reasoning: supportsReasoning,
      max_tokens_parameter: true,
    },
  }
}

function detectConfigFormat(config, filePath) {
  if (config.language_models?.openai_compatible) return "zed"
  if (config.provider) return "opencode"
  if (filePath && filePath.includes("zed")) return "zed"
  return "opencode"
}

function updateOpenCodeConfig(config, hyperModels, options) {
  ensureConfigShape(config)

  const existing = config.provider[options.providerID] || {}

  config.provider[options.providerID] = {
    ...existing,
    npm: existing.npm || "@ai-sdk/openai-compatible",
    name: existing.name || options.providerName,
    options: {
      ...(existing.options || {}),
      baseURL: existing.options?.baseURL || options.baseURL,
      apiKey: existing.options?.apiKey || options.apiKey,
    },
    models: sortObjectByKey(
      options.replaceModels
        ? hyperModels
        : {
            ...(existing.models || {}),
            ...hyperModels,
          },
    ),
  }

  return config
}

function updateZedConfig(config, zedModels, options) {
  config.language_models ||= {}
  config.language_models.openai_compatible ||= {}
  config.language_models.openai_compatible.Hyper ||= {}

  config.language_models.openai_compatible.Hyper.api_url ||= options.baseURL

  if (options.replaceModels) {
    config.language_models.openai_compatible.Hyper.available_models = zedModels
  } else {
    const existing = config.language_models.openai_compatible.Hyper.available_models || []
    const existingByName = {}
    for (const m of existing) existingByName[m.name] = m
    for (const m of zedModels) existingByName[m.name] = m
    config.language_models.openai_compatible.Hyper.available_models =
      Object.values(existingByName)
  }

  return config
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log(`Fetching Hyper live models from ${HYPER_MODELS_URL}`)
  const livePayload = await fetchJSON(HYPER_MODELS_URL)

  if (!livePayload || !Array.isArray(livePayload.data)) {
    throw new Error("Hyper models response did not contain a data array")
  }

  const liveModels = livePayload.data
    .filter((model) => model && model.id)
    .sort((a, b) => a.id.localeCompare(b.id))

  const openCodeModels = {}
  const zedModels = []

  for (const liveModel of liveModels) {
    openCodeModels[liveModel.id] = toOpenCodeModel(liveModel)
    zedModels.push(toZedModel(liveModel))
  }

  const withCost = liveModels.filter((m) => m.pricing).length

  console.log(`Found ${liveModels.length} Hyper models (${withCost} with pricing)`)
  console.log("")
  console.log(Object.keys(openCodeModels).sort().join("\n"))

  for (const file of args.files) {
    const config = readJsonc(file)
    const format = detectConfigFormat(config, file)

    if (format === "zed") {
      updateZedConfig(config, zedModels, args)
    } else {
      updateOpenCodeConfig(config, openCodeModels, args)
    }

    const newContent = JSON.stringify(config, null, 2) + "\n"

    if (args.dryRun) {
      console.log(`\n--- ${file} (${format}) ---`)
      console.log(newContent)
      continue
    }

    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, newContent)

    if (format === "zed") {
      console.log(
        `Updated ${file}: language_models.openai_compatible.Hyper.available_models with ${zedModels.length} models`,
      )
    } else {
      console.log(
        `Updated ${file}: provider.${args.providerID} with ${Object.keys(openCodeModels).length} Hyper models`,
      )
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

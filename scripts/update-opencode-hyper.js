#!/usr/bin/env node

const fs = require("fs")
const https = require("https")
const path = require("path")

const DEFAULT_FILES = ["common/opencode/opencode.jsonc"]

const HYPER_MODELS_URL = "https://hyper.charm.land/v1/models"
const HYPER_COSTS_URL =
  "https://raw.githubusercontent.com/charmbracelet/crush/refs/heads/main/internal/agent/hyper/provider.json"

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
    forceAddExtra: false,
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

    if (arg === "--force-add-extra") {
      args.forceAddExtra = true
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

function costFromCrushModel(model) {
  return {
    input: numberOrZero(model.cost_per_1m_in),
    output: numberOrZero(model.cost_per_1m_out),
    cache_read: numberOrZero(model.cost_per_1m_in_cached),
    cache_write: numberOrZero(model.cost_per_1m_out_cached),
  }
}

function buildCrushCatalog(crushProvider) {
  if (!crushProvider || !Array.isArray(crushProvider.models)) {
    throw new Error("Crush Hyper provider JSON did not contain a models array")
  }

  const byID = {}

  for (const model of crushProvider.models) {
    if (!model || !model.id) continue
    byID[model.id] = model
  }

  return byID
}

function toOpenCodeModel(liveModel, crushModel) {
  const supportsAttachments = Boolean(liveModel.supports_attachments)

  const result = {
    name: liveModel.display_name || crushModel?.name || liveModel.id,

    limit: {
      context: numberOrZero(liveModel.context_window ?? crushModel?.context_window),
      input: numberOrZero(liveModel.context_window ?? crushModel?.context_window),
      output: numberOrZero(liveModel.max_output_tokens ?? crushModel?.default_max_tokens),
    },

    reasoning: Boolean(liveModel.supports_reasoning ?? crushModel?.can_reason),
    attachment: supportsAttachments,
    tool_call: true,

    modalities: {
      input: supportsAttachments ? ["text", "image", "pdf"] : ["text"],
      output: ["text"],
    },

    status: "active",
  }

  if (crushModel) {
    result.cost = costFromCrushModel(crushModel)
  }

  if (
    liveModel.supports_reasoning_effort &&
    Array.isArray(liveModel.reasoning_effort_levels) &&
    liveModel.reasoning_effort_levels.length > 0
  ) {
    result.variants = {}

    for (const effort of liveModel.reasoning_effort_levels) {
      result.variants[effort] = {
        reasoningEffort: effort,
      }
    }

    if (
      liveModel.id.toLowerCase().includes("deepseek-v4") &&
      liveModel.reasoning_effort_levels.includes("xhigh") &&
      !liveModel.reasoning_effort_levels.includes("max")
    ) {
      result.variants.max = {
        disabled: true,
      }
    }
  }

  return result
}

function updateConfig(config, hyperModels, options) {
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

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log(`Fetching Hyper live models from ${HYPER_MODELS_URL}`)
  const livePayload = await fetchJSON(HYPER_MODELS_URL)

  if (!livePayload || !Array.isArray(livePayload.data)) {
    throw new Error("Hyper models response did not contain a data array")
  }

  console.log(`Fetching Hyper costs from ${HYPER_COSTS_URL}`)
  const crushProvider = await fetchJSON(HYPER_COSTS_URL)
  const crushCatalog = buildCrushCatalog(crushProvider)

  const liveModels = livePayload.data
    .filter((model) => model && model.id)
    .sort((a, b) => a.id.localeCompare(b.id))

  const hyperModels = {}
  const skipped = []
  const forceAdded = []

  for (const liveModel of liveModels) {
    const crushModel = crushCatalog[liveModel.id]

    if (!crushModel && !args.forceAddExtra) {
      skipped.push(liveModel.id)
      continue
    }

    if (!crushModel && args.forceAddExtra) {
      forceAdded.push(liveModel.id)
    }

    hyperModels[liveModel.id] = toOpenCodeModel(liveModel, crushModel)
  }

  console.log(`Found live Hyper models: ${liveModels.length}`)
  console.log(`Found priced Crush models: ${Object.keys(crushCatalog).length}`)
  console.log(`Will write models: ${Object.keys(hyperModels).length}`)

  if (skipped.length > 0) {
    console.warn("")
    console.warn(`Skipped ${skipped.length} live model(s) missing from Crush pricing catalog:`)
    for (const id of skipped) console.warn(`  - ${id}`)
    console.warn("")
    console.warn("Use --force-add-extra to add them anyway with no cost field.")
  }

  if (forceAdded.length > 0) {
    console.warn("")
    console.warn(`Force-added ${forceAdded.length} unpriced live model(s):`)
    for (const id of forceAdded) console.warn(`  - ${id}`)
  }

  console.log("")
  console.log(Object.keys(hyperModels).sort().join("\n"))

  for (const file of args.files) {
    const config = readJsonc(file)
    updateConfig(config, hyperModels, args)

    const newContent = JSON.stringify(config, null, 2) + "\n"

    if (args.dryRun) {
      console.log(`\n--- ${file} ---`)
      console.log(newContent)
      continue
    }

    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, newContent)

    console.log(
      `Updated ${file}: provider.${args.providerID} with ${Object.keys(hyperModels).length} Hyper models`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

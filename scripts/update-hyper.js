#!/usr/bin/env node

const fs = require("fs")
const https = require("https")
const path = require("path")

const DEFAULT_FILES = ["common/zed/settings.json"]

const HYPER_MODELS_URL = "https://hyper.charm.land/v1/models"
const HYPER_BASE_URL = "https://hyper.charm.land/v1"

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
				res.on("data", (chunk) => (data += chunk))
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

function numberOrZero(value) {
	const n = Number(value)
	return Number.isFinite(n) ? n : 0
}

function parseArgs(argv) {
	const args = {
		dryRun: false,
		files: [],
		baseURL: HYPER_BASE_URL,
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

		if (arg === "--base-url") {
			const value = argv[++i]
			if (!value) throw new Error("--base-url requires a URL")
			args.baseURL = value
			continue
		}

		throw new Error(`Unknown argument: ${arg}`)
	}

	if (args.files.length === 0) {
		args.files = DEFAULT_FILES
	}

	return args
}

function toZedModel(liveModel) {
	const supportsAttachments = Boolean(liveModel.capabilities?.vision)
	const supportsReasoning = Boolean(liveModel.reasoning?.effort_levels?.length > 0)

	let reasoningEffort = null
	if (supportsReasoning) {
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
		config.language_models.openai_compatible.Hyper.available_models = Object.values(existingByName)
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

	const zedModels = liveModels.map(toZedModel)
	const withCost = liveModels.filter((m) => m.pricing).length

	console.log(`Found ${liveModels.length} Hyper models (${withCost} with pricing)`)
	console.log("")
	console.log(zedModels.map((m) => m.name).join("\n"))

	for (const file of args.files) {
		const config = JSON.parse(fs.readFileSync(file, "utf8"))
		updateZedConfig(config, zedModels, args)

		const newContent = JSON.stringify(config, null, 2) + "\n"

		if (args.dryRun) {
			console.log(`\n--- ${file} (zed) ---`)
			console.log(newContent)
			continue
		}

		fs.mkdirSync(path.dirname(file), { recursive: true })
		fs.writeFileSync(file, newContent)
		console.log(
			`Updated ${file}: language_models.openai_compatible.Hyper.available_models with ${zedModels.length} models`,
		)
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})

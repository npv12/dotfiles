#!/usr/bin/env node
// update-commandcode-models.js — sync `providers.commandcode` models into
// common/opencode/opencode.jsonc from the live Command Code Provider API:
//
//   GET https://api.commandcode.ai/provider/v1/models  (Bearer key)
//
// Behaviour:
// - Catalog key == live model id; entries carry { name, modelID, limit.context }.
// - Costs are NOT emitted (the endpoint carries no pricing).
// - claude-* ids are skipped: they route via /messages (Anthropic), not
//   /chat/completions, so an openai-compatible entry would 400.
// - Variants of already-configured models are preserved (matched by modelID).
// - Writes a .bak copy of the config before any change.
//
// Key precedence: opencode stored token for `commandcode` (auth.json then
// credential DB) → COMMANDCODE_API_KEY env → ~/.commandcode/auth.json.
// Usage:    node scripts/update-commandcode-models.js [--dry-run]
// Periodic: launchctl load ~/Library/LaunchAgents/com.npv12.opencode-cc-models.plist
const fs = require('fs');
const path = require('path');
const os = require('os');

const DRY = process.argv.includes('--dry-run');
const FILE = path.join(__dirname, '..', 'common', 'opencode', 'opencode.jsonc');
const API = 'https://api.commandcode.ai/provider/v1';

function die(message) {
	console.error(`update-commandcode-models: ${message}`);
	process.exit(1);
}

// opencode-stored token for `commandcode`: provider-keyed auth.json first,
// then the credential DB (integration_id `commandcode`).
function opencodeStoredToken() {
	const authPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
	try {
		const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
		const entry = auth.commandcode;
		if (entry && typeof entry === 'object') {
			if (entry.type === 'api' && typeof entry.key === 'string') return entry.key;
			if (entry.type === 'oauth' && typeof entry.access === 'string') return entry.access;
		}
	} catch {}

	const { DatabaseSync } = require('node:sqlite');
	for (const dbPath of [
		path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db'),
		path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode-next.db'),
	]) {
		try {
			const db = new DatabaseSync(dbPath, { readOnly: true });
			try {
				const row = db
					.prepare(
						"SELECT value FROM credential WHERE integration_id = 'commandcode' ORDER BY time_updated DESC LIMIT 1",
					)
					.get();
				if (row?.value) {
					const parsed = JSON.parse(row.value);
					if (typeof parsed?.key === 'string' && parsed.key) return parsed.key;
				}
			} finally {
				db.close();
			}
		} catch {}
	}
	return undefined;
}

function apiKey() {
	const stored = opencodeStoredToken();
	if (stored) return stored;
	if (process.env.COMMANDCODE_API_KEY) return process.env.COMMANDCODE_API_KEY;
	try {
		const auth = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.commandcode', 'auth.json'), 'utf8'));
		if (typeof auth.apiKey === 'string' && auth.apiKey) return auth.apiKey; // pragma: allowlist secret
	} catch {}
	die('no API key: opencode stored credential for commandcode, COMMANDCODE_API_KEY env, or ~/.commandcode/auth.json');
}

async function fetchModels(key) {
	const res = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${key}` } });
	if (!res.ok) die(`GET /models → HTTP ${res.status}`);
	const body = await res.json();
	const list = Array.isArray(body?.data) ? body.data : [];
	return list
		.filter((m) => typeof m?.id === 'string' && m.id)
		.map((m) => ({ id: m.id, name: String(m.name ?? m.id), context: Number(m.context_length) }));
}

// Brace-matching extractor that ignores braces inside quoted strings.
function objectBounds(text, openBraceIndex) {
	let depth = 0;
	let inString = false;
	for (let i = openBraceIndex; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (ch === '\\') i++;
			else if (ch === '"') inString = false;
		} else if (ch === '"') inString = true;
		else if (ch === '{') depth++;
		else if (ch === '}') {
			if (--depth === 0) return { start: openBraceIndex, end: i + 1 };
		}
	}
	return undefined;
}

// Finds the `"name": {` object property, returning the index of its opening brace.
function propertyBrace(text, name, from) {
	const needle = `"${name}"`;
	let idx = text.indexOf(needle, from);
	while (idx !== -1) {
		const rest = text.slice(idx + needle.length).trimStart();
		if (rest.startsWith(':')) {
			const brace = text.indexOf('{', idx + needle.length);
			const newline = text.indexOf('\n', idx);
			if (brace !== -1 && (newline === -1 || brace < newline)) return brace;
		}
		idx = text.indexOf(needle, idx + needle.length);
	}
	return -1;
}

// Leading whitespace of the line containing `index`.
function lineIndent(text, index) {
	const lineStart = text.lastIndexOf('\n', index - 1) + 1;
	return text.slice(lineStart).match(/^[ \t]*/)[0];
}

async function main() {
	const models = await fetchModels(apiKey());
	const openAI = models.filter((m) => !m.id.startsWith('claude-'));
	const skipped = models.length - openAI.length;

	const text = fs.readFileSync(FILE, 'utf8');
	const providerBrace = propertyBrace(text, 'commandcode');
	if (providerBrace === -1) die(`providers."commandcode" not found in ${FILE} (add it first)`);
	const provider = objectBounds(text, providerBrace);
	const modelsBrace = propertyBrace(text, 'models', providerBrace + 1);
	if (modelsBrace === -1 || modelsBrace >= provider.end) die('"models" block missing inside the commandcode provider');

	// Preserve variants of existing entries, matched by modelID.
	// (strip JSONC trailing commas before JSON.parse)
	const prev = JSON.parse(
		text.slice(modelsBrace, objectBounds(text, modelsBrace).end).replace(/,\s*([}\]])/g, '$1'),
	);
	const variantsByModel = {};
	for (const entry of Object.values(prev)) {
		if (Array.isArray(entry?.variants) && entry.variants.length) variantsByModel[entry.modelID] = entry.variants;
	}

	const entries = {};
	for (const m of openAI.sort((a, b) => (a.id < b.id ? -1 : 1))) {
		const entry = { name: m.name, modelID: m.id };
		if (Number.isFinite(m.context) && m.context > 0) entry.limit = { context: m.context };
		if (variantsByModel[m.id]) entry.variants = variantsByModel[m.id];
		entries[m.id] = entry;
	}

	const removed = Object.keys(prev).filter((k) => !(k in entries));
	const block = objectBounds(text, modelsBrace);
	const entryIndent = lineIndent(text, block.start) + '\t';
	const pretty = JSON.stringify(entries, null, 2)
		.split('\n')
		.map((line, i) => (i === 0 ? lineIndent(text, block.start) + line : entryIndent + line))
		.join('\n');
	const next = text.slice(0, block.start) + pretty + text.slice(block.end);

	console.log(`models: ${openAI.length} (${skipped} claude-* skipped — they need /messages, not /chat/completions)`);
	if (removed.length) console.log(`removed from config: ${removed.join(', ')}`);
	const withVariants = Object.keys(entries).filter((k) => entries[k].variants);
	if (withVariants.length) console.log(`variants preserved for: ${withVariants.join(', ')}`);

	if (DRY) {
		console.log(`\n--- dry run: would write models block of ${FILE} ---`);
		console.log(pretty);
		return;
	}
	fs.writeFileSync(`${FILE}.bak`, text);
	fs.writeFileSync(FILE, next);
	console.log(`wrote ${FILE} (backup: ${FILE}.bak)`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

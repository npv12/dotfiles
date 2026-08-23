#!/usr/bin/env node
const fs = require('fs');
const https = require('https');

// Target: native V2 config. The V1 `blacklist` array is gone; every catalog
// model we do not explicitly enable gets a `"disabled": true` entry under
// providers["amazon-bedrock"].models. The block below the MARKER comment is
// regenerated in place so comments/tabs/trailing commas elsewhere survive.

const FILE = 'common/opencode/opencode.jsonc';
const MODELS_DEV_URL = 'https://models.dev/api.json';
const MARKER = '// V1 `blacklist` has no native V2 equivalent; hide each model instead.';
const DISABLED_LINE_RE = /^\t\t\t\t"(.+)": \{ "disabled": true \},?$/gm;
const MULTILINE_KEY_RE = /^\t\t\t\t"(.+)": \{$/gm;

function fetchJSON(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				try {
					resolve(JSON.parse(data));
				} catch (e) {
					reject(e);
				}
			});
		}).on('error', reject);
	});
}

async function main() {
	const data = await fetchJSON(MODELS_DEV_URL);
	const bedrock = data['amazon-bedrock'];
	if (!bedrock || !bedrock.models) {
		console.log('No bedrock models found');
		return;
	}

	const catalogIds = Object.keys(bedrock.models).sort();
	console.log(`Found ${catalogIds.length} bedrock models on models.dev`);

	const content = fs.readFileSync(FILE, 'utf8');

	const markerAt = content.indexOf(MARKER);
	if (markerAt === -1) throw new Error(`Marker not found in ${FILE}: ${MARKER}`);
	const spliceStart = content.indexOf('\n', markerAt) + 1;
	// The bedrock `models` map closes with a 3-tab `},`; disabled entries are 4-tab.
	const spliceEnd = content.indexOf('\n\t\t\t},', spliceStart);
	if (spliceEnd === -1) throw new Error('Bedrock models map closing brace not found');

	const body = content.slice(spliceStart, spliceEnd);
	const existingDisabled = [...body.matchAll(DISABLED_LINE_RE)].map((m) => m[1]);

	// Keys defined as regular multi-line entries elsewhere in the file
	// (e.g. friendly `modelID` aliases) must never be added as disabled.
	const enabledKeys = [...content.matchAll(MULTILINE_KEY_RE)].map((m) => m[1]);

	const before = new Set(existingDisabled);
	const merged = [...new Set([...existingDisabled, ...catalogIds])]
		.filter((id) => !enabledKeys.includes(id))
		.sort();

	const added = merged.filter((id) => !before.has(id));
	console.log(`Existing disabled entries: ${existingDisabled.length}`);
	console.log(merged.join('\n'));

	const block = merged.map((id) => `\t\t\t\t"${id}": { "disabled": true },`).join('\n');
	fs.writeFileSync(FILE, content.slice(0, spliceStart) + block + content.slice(spliceEnd));

	console.log(`Updated ${FILE}: ${merged.length} disabled entries (${added.length} newly added)`);
	if (added.length > 0) console.log(`Newly blacklisted: ${added.join(', ')}`);
}

main().catch(console.error);

#!/usr/bin/env node
const fs = require('fs');
const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const data = await fetchJSON('https://models.dev/api.json');
  const bedrock = data['amazon-bedrock'];
  if (!bedrock || !bedrock.models) {
    console.log('No bedrock models found');
    return;
  }

  const modelIds = Object.keys(bedrock.models).sort();
  console.log('Found bedrock models:', modelIds.length);
  console.log(modelIds.join('\n'));

  const files = [
    'common/kilo/opencode.jsonc',
    'common/opencode/opencode.jsonc'
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const jsonContent = content.replace(/^\s*\/\/.*$/gm, '').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    const config = JSON.parse(jsonContent);

    const existingBlacklist = config.provider['amazon-bedrock'].blacklist || [];
    const newBlacklist = [...new Set([...existingBlacklist, ...modelIds])].sort();

    config.provider['amazon-bedrock'].blacklist = newBlacklist;

    const newContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file} with ${modelIds.length} new models`);
  }
}

main().catch(console.error);

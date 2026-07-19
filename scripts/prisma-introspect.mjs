import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const defaultUrl =
  'postgresql://postgres:postgres@localhost:5432/charging_system?schema=charging_system';
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? defaultUrl };

const result = spawnSync('npx', ['prisma', 'db', 'pull'], {
  encoding: 'utf8',
  env,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const schemaPath = 'prisma/schema.prisma';
let schema = readFileSync(schemaPath, 'utf8');

schema = ensureAnnotation(
  schema,
  'model coin_insertions',
  '  @@unique([device_event_id, device_id], map: "prisma_uq_coin_insertions_event_device")',
);
schema = ensureAnnotation(
  schema,
  'model device_telemetry',
  '  @@unique([device_event_id, device_id], map: "prisma_uq_device_telemetry_event_device")',
);

writeFileSync(schemaPath, schema);
console.log('Applied Prisma-only relation annotations after introspection.');

function ensureAnnotation(schemaText, modelName, annotation) {
  const modelStart = schemaText.indexOf(modelName);
  if (modelStart === -1) return schemaText;
  const modelEnd = schemaText.indexOf('\n}', modelStart);
  const modelBlock = schemaText.slice(modelStart, modelEnd);
  if (modelBlock.includes(annotation.trim())) return schemaText;
  return `${schemaText.slice(0, modelEnd)}\n${annotation}${schemaText.slice(modelEnd)}`;
}

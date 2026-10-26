
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";
import Ajv2020 from "ajv/dist/2020.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.resolve(__dirname, "../toml");
const schemaUrl = "https://ext.nulls.gg/mods/schema/ui.schema.json";

const ajv = new Ajv2020({
	allErrors: true,
	strict: false,
	verbose: true,
});

async function loadJson(url) {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
	}

	return response.json();
}

async function findUiFiles(dir) {
	const result = [];

	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			result.push(...(await findUiFiles(fullPath)));
		} else if (entry.isFile() && entry.name.endsWith(".ui")) {
			result.push(fullPath);
		}
	}

	return result;
}

function normalizeSchema(schema) {
	const normalized = structuredClone(schema);

	// The remote schema uses legacy "id" as its schema identifier.
	// Do not recursively rename keys: properties.id is a real UI property.
	delete normalized.id;
	normalized.$id = schemaUrl;

	return normalized;
}

function escapePointerPart(value) {
	return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
}

function decodePointer(pointer) {
	if (!pointer || pointer === "/") {
		return [];
	}

	return pointer
		.split("/")
		.slice(1)
		.map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function stripComment(line) {
	let quote = "";
	let escaped = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (quote === '"' && char === "\\") {
			escaped = true;
			continue;
		}

		if (quote) {
			if (char === quote) {
				quote = "";
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
		} else if (char === "#") {
			return line.slice(0, i);
		}
	}

	return line;
}

function parseDottedKey(text) {
	const result = [];
	let token = "";
	let quote = "";
	let escaped = false;

	for (const char of text) {
		if (escaped) {
			token += char;
			escaped = false;
			continue;
		}

		if (quote === '"' && char === "\\") {
			token += char;
			escaped = true;
			continue;
		}

		if (quote) {
			if (char === quote) {
				quote = "";
			} else {
				token += char;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
		} else if (char === ".") {
			if (token.trim()) result.push(token.trim());
			token = "";
		} else {
			token += char;
		}
	}

	if (token.trim()) result.push(token.trim());

	return result;
}

function getSourceLocations(source) {
	const lines = source.split(/\r?\n/);
	const locations = new Map();
	const arrayTableCounts = new Map();

	let currentPath = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		const clean = stripComment(line);
		const trimmed = clean.trim();

		if (!trimmed) continue;

		const arrayHeader = trimmed.match(/^\[\[\s*(.*?)\s*\]\]$/);
		const tableHeader = !arrayHeader && trimmed.match(/^\[\s*(.*?)\s*\]$/);

		if (arrayHeader || tableHeader) {
			const parts = parseDottedKey((arrayHeader ?? tableHeader)[1]);

			if (arrayHeader) {
				const arrayPath = JSON.stringify(parts);
				const index = arrayTableCounts.get(arrayPath) ?? 0;

				arrayTableCounts.set(arrayPath, index + 1);
				currentPath = [...parts, String(index)];
			} else {
				currentPath = parts;
			}

			continue;
		}

		const assignment = clean.match(
			/^(\s*)(?:"((?:[^"\\]|\\.)+)"|'([^']+)'|([A-Za-z0-9_-]+))\s*=/,
		);

		if (!assignment) continue;

		const rawKey = assignment[2] ?? assignment[3] ?? assignment[4];
		const keyParts = parseDottedKey(rawKey);
		if (!keyParts.length) continue;

		const fullPath = [...currentPath, ...keyParts];
		const pointer = `/${fullPath.map(escapePointerPart).join("/")}`;

		const valueOffset = clean.indexOf("=", assignment[0].length - 1) + 1;
		const whitespace = clean.slice(valueOffset).match(/^\s*/)?.[0].length ?? 0;
		const valueColumn = valueOffset + whitespace + 1;

		locations.set(pointer, {
			line: lineIndex + 1,
			column: valueColumn,
			keyColumn: assignment[1].length + 1,
			key: rawKey,
		});
	}

	return { lines, locations };
}

function locateError(error, sourceInfo) {
	const { lines, locations } = sourceInfo;
	const parts = decodePointer(error.instancePath);

	if (error.keyword === "required" && error.params?.missingProperty) {
		parts.push(error.params.missingProperty);
	}

	// Exact mapping is preferred. It works for ordinary assignments,
	// nested tables and array-of-table entries.
	for (let length = parts.length; length > 0; length--) {
		const pointer = `/${parts.slice(0, length).map(escapePointerPart).join("/")}`;
		const location = locations.get(pointer);

		if (location) return location;
	}

	// Fallback for inline tables, dotted assignments and other TOML
	// constructs that cannot be unambiguously mapped by the simple scanner.
	const lastPart = parts.at(-1);

	if (lastPart) {
		for (let i = lines.length - 1; i >= 0; i--) {
			const clean = stripComment(lines[i]);
			const match = clean.match(
				new RegExp(`(^|[,{\\s])("${lastPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"|'${lastPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'|${lastPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*=`),
			);

			if (match) {
				const equalsIndex = clean.indexOf("=", match.index);
				const whitespace = clean.slice(equalsIndex + 1).match(/^\s*/)?.[0].length ?? 0;

				return {
					line: i + 1,
					column: equalsIndex + whitespace + 2,
					keyColumn: match.index + match[1].length + 1,
				};
			}
		}
	}

	return undefined;
}

function formatSourceSnippet(sourceInfo, location, context = 1) {
	if (!location) return [];

	const { lines } = sourceInfo;
	const lineNumber = location.line;
	const start = Math.max(1, lineNumber - context);
	const end = Math.min(lines.length, lineNumber + context);
	const width = String(end).length;
	const result = [];

	for (let n = start; n <= end; n++) {
		const prefix = `${String(n).padStart(width)} | `;
		result.push(prefix + lines[n - 1]);

		if (n === lineNumber) {
			const column = Math.max(1, location.column ?? location.keyColumn ?? 1);
			result.push(`${" ".repeat(width)} | ${" ".repeat(column - 1)}^`);
		}
	}

	return result;
}

function formatAjvError(error, file, data, sourceInfo) {
	const details = [];
	const relativeFile = path.relative(process.cwd(), file);
	const location = locateError(error, sourceInfo);

	if (location) {
		details.push(`${relativeFile}:${location.line}:${location.column}`);
	} else {
		details.push(relativeFile);
	}

	details.push(`  Path: ${error.instancePath || "/"}`);
	details.push(`  Rule: ${error.keyword}`);
	details.push(`  Message: ${error.message ?? "Validation failed"}`);

	// Preserve all Ajv parameters, including allowedValues and
	// additionalProperty / unevaluatedProperty / missingProperty.
	if (error.params && Object.keys(error.params).length) {
		details.push(`  Parameters: ${JSON.stringify(error.params)}`);
	}

	if (error.keyword === "enum") {
		details.push(`  Allowed values: ${JSON.stringify(error.params.allowedValues)}`);
	}

	if (error.keyword === "type") {
		details.push(`  Expected type: ${error.params.type}`);
	}

	if (error.keyword === "required") {
		details.push(`  Missing property: ${error.params.missingProperty}`);
	}

	if (error.keyword === "additionalProperties") {
		details.push(`  Unexpected property: ${error.params.additionalProperty}`);
	}

	if (error.keyword === "unevaluatedProperties") {
		details.push(`  Unexpected property: ${error.params.unevaluatedProperty}`);
	}

	if (error.schemaPath) {
		details.push(`  Schema rule: ${error.schemaPath}`);
	}

	if (error.parentSchema?.description) {
		details.push(`  Description: ${error.parentSchema.description}`);
	}

	if (location) {
		details.push("");
		details.push(...formatSourceSnippet(sourceInfo, location));
	}

	return details.join("\n");
}

function getParseErrorLocation(error) {
	if (Number.isInteger(error?.line) && Number.isInteger(error?.column)) {
		return { line: error.line, column: error.column };
	}

	if (Number.isInteger(error?.lineNumber)) {
		return {
			line: error.lineNumber,
			column: error.columnNumber ?? 1,
		};
	}

	const message = String(error?.message ?? "");
	const match =
		message.match(/\bline\s+(\d+)[,:]?\s*(?:column\s+(\d+))?/i) ??
		message.match(/\brow\s+(\d+)[,:]?\s*(?:column\s+(\d+))?/i);

	if (match) {
		return {
			line: Number(match[1]),
			column: Number(match[2] ?? 1),
		};
	}

	return undefined;
}

function formatParseError(error, file, sourceInfo) {
	const relativeFile = path.relative(process.cwd(), file);
	const location = getParseErrorLocation(error);
	const lines = [];

	if (location) {
		lines.push(`${relativeFile}:${location.line}:${location.column}`);
	} else {
		lines.push(relativeFile);
	}

	lines.push(`  TOML parse error: ${error.message}`);

	if (location) {
		lines.push("");
		lines.push(...formatSourceSnippet(sourceInfo, location));
	}

	return lines.join("\n");
}

async function main() {
	const files = (await findUiFiles(uiDir)).sort();

	if (files.length === 0) {
		console.log(`No .ui files found in ${uiDir}`);
		return;
	}

	const schema = normalizeSchema(await loadJson(schemaUrl));
	const validate = ajv.compile(schema);

	let failed = 0;

	for (const file of files) {
		const source = await readFile(file, "utf8");
		const sourceInfo = getSourceLocations(source);

		let data;

		try {
			data = parse(source);
		} catch (error) {
			failed++;
			console.error(`\n${formatParseError(error, file, sourceInfo)}`);
			continue;
		}

		if (!validate(data)) {
			failed++;

			for (const error of validate.errors ?? []) {
				console.error(`\n${formatAjvError(error, file, data, sourceInfo)}`);
			}
		}
	}

	if (failed > 0) {
		console.error(`\nValidation failed: ${failed}/${files.length} file(s) have errors.`);
		process.exitCode = 1;
	} else {
		console.log(`Validation passed: ${files.length} .ui file(s).`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

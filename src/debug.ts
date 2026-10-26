export function logTableType(obj: object, indent = 0): void {
	log(`${" ".repeat(indent)}{`);

	for (const [key, value] of Object.entries(obj)) {
		const type = Array.isArray(value)
			? "array"
			: value === null
				? "null"
				: typeof value;

		log(`${" ".repeat(indent + 1)}${key}: ${type}`);

		if (value !== null && typeof value === "object") {
			log(`${" ".repeat(indent + 1)}${key}: ${type}`);
			logTableType(value, indent + 3);
		}
	}

	log(`${" ".repeat(indent)}}`);
}

function gatherTableLog(obj: object, indent = 0, result: string = ""): string {
	result += `${" ".repeat(indent)}{\n`;

	for (const [key, value] of Object.entries(obj)) {
		if (value !== null && typeof value === "object") {
			result += `${" ".repeat(indent + 1)}${key}: \n`;
			result = gatherTableLog(value, indent + 3, result);
		} else {
			result += `${" ".repeat(indent + 1)}${key}: ${value}\n`;
		}
	}

	result += `${" ".repeat(indent)}}\n`;
	return result;
}

export function logTable(obj: object): void {
	const info = gatherTableLog(obj);
	log(info);
}

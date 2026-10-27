export enum LogColors {
	Orange = "FF7800",
	Red = "FF0000",
}

interface LogOptions {
	color?: LogColors | string | number;
}

export class Logger {
	constructor(private name: string) {}

	log(input: string, options?: LogOptions) {
		let text = `[${this.name}] ${input}`;

		if (options?.color !== undefined) {
			let colorCode: string = "FFFFFF";
			switch (typeof options.color) {
				case "string":
					colorCode = options.color.toUpperCase();
					break;
				case "number":
					if (!Number.isFinite(options.color)) {
						this.error(`Got incorrect color code while logging: ${input}`);
						break;
					}

					colorCode = options.color.toString(16).toUpperCase();
					break;
			}

			text = `<c${colorCode}>${text}</c>`;
		}

		// TODO: replace to events in future
		log(text);
	}

	trace(text: string) {
		// TODO: replace this thunk to debug only or something?
		this.log(text);
	}

	warn(text: string) {
		this.log(`WARN: ${text}`, { color: LogColors.Orange });
	}

	error(text: string) {
		this.log(`ERROR: ${text}`, { color: LogColors.Red });
	}
}

export const GlobalLogger = new Logger("Global");

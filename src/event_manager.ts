import { Logger } from "./logger";

/** Basically max events count in single batch that scheduleTask can handle */
const MAX_DEFERRED_EVENTS = 300;

/** Max count of events that server could properly process per */
const MAX_EVENTS_COUNT = 20;

/** Simple event queue manager */
class EventManager {
	/** Array of events in queue */
	private eventsQueue: any[] = [];

	/** Count of sent events in current tick */
	private tickSentEvents = 0;

	/** Count of sent events in current tick counting batch optimizations */
	private tickSentEventsTotal = 0;

	private logger = new Logger(EventManager.name);

	update() {
		if (DEBUG && this.tickSentEventsTotal > 0) {
			const sentTick = server.tick - 1;
			this.logger.trace(
				`Events in ${sentTick}: Total - ${this.tickSentEventsTotal}, Batches - ${this.tickSentEvents}`,
			);
		}

		this.tickSentEvents = 0;
		this.tickSentEventsTotal = 0;
	}

	private sendEvent(action: EventType, data: any) {
		event(action, data);
		this.tickSentEvents++;
	}

	send(action: EventType, data: any, deferred: boolean = true) {
		//if (DEBUG) {
		//	this.logger.trace(`Got ${action} event with deferred ${deferred}`);
		//}

		this.tickSentEventsTotal++;
		if (deferred) {
			this.eventsQueue.push({
				action,
				...data,
			});
			return;
		}

		this.sendEvent(action, data);
	}

	pushEvents() {
		const queue = this.eventsQueue;
		const count = queue.length;

		if (count === 0) return;

		if (DEBUG) {
			this.logger.trace(`Sending ${count} deferred UI events`);
		}

		let offset = 0;
		while (offset < count && this.tickSentEvents < MAX_EVENTS_COUNT) {
			const end = Math.min(offset + MAX_DEFERRED_EVENTS, count);

			this.sendEvent("scheduleTasks", {
				tasks: queue.slice(offset, end),
			});

			offset = end;
		}

		this.eventsQueue = queue.slice(offset);

		if (this.eventsQueue.length > 0 && DEBUG) {
			this.logger.warn(
				`Trying to send too many events in single tick. Remain ${this.eventsQueue.length} events will be processed in next tick`,
			);
		}
	}
}

const Events = new EventManager();
export default Events;

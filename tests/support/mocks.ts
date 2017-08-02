import Executor, { Events } from 'intern/lib/executors/Executor';
import Suite from 'intern/lib/Suite';
import Task from '@dojo/core/async/Task';

import * as sinon from 'sinon';

export interface MockExecutor extends Executor {
	suites: Suite[];
	events: { name: string, data: any; }[];
	handlers: { [key: string]: Function[]; };
}

export function mockExecutor(): MockExecutor {
	let rootSuite: Suite;

	const executor: MockExecutor = {
		events: [],
		handlers: {},

		addSuite: sinon.spy((callback: (suite: Suite) => void) => {
			callback(rootSuite);
		}),
		on: sinon.spy((event: string, handler: Function) => {
			if (!executor.handlers[event]) {
				executor.handlers[event] = [];
			}
			executor.handlers[event].push(handler);

			const handle = {
				destroy: () => {
					handle.destroy = function () {};
					if (executor.handlers[event]) {
						const index = executor.handlers[event].indexOf(handler);
						if (index > -1) {
							executor.handlers[event].splice(index, 1);
						}
					}
				}
			};
			return handle;
		}),
		emit(name: keyof Events, data?: any) {
			// Ignore log events
			if (name !== 'log') {
				executor.events.push({ name, data });
			}

			if (name === 'beforeRun' || name === 'runEnd' || name === 'runStart' || name === 'afterRun') {
				data = executor;
			}

			const notifications: Promise<any>[] = (executor.handlers[name] || []).map(handler => {
				return Task.resolve(handler(data));
			});

			if (!notifications.length) {
				return Task.resolve();
			}

			return Task.all<void>(notifications).then(() => {});
		},
		log(...args: any[]) {
			return executor.emit('log', JSON.stringify(args));
		},
		run() {
			return this.emit('beforeRun')
				.then(() => this.emit('runStart'))
				.then(() => rootSuite.run())
				.then(() => this.emit('runEnd'))
				.then(() => this.emit('afterRun'))
			;
		},
		getPlugin: <any> function (name: string) {
			if (name === 'chai') {
				return intern.getPlugin('chai');
			}
		}
	} as any;

	rootSuite = new Suite({ name: 'parent', executor });
	executor.suites = [ rootSuite ];

	return executor;
}

import Executor from 'intern/lib/executors/Executor';
import Suite from 'intern/lib/Suite';
import Test from 'intern/lib/Test';
import { on } from '@dojo/core/aspect';
import { create } from '@dojo/core/lang';
import { Handle } from '@dojo/interfaces/core';

import { Interface, BaseAssert, Assertions, Config, Hooks, NestedCallback } from './types';

let interfaces = new WeakMap<Executor, Interface>();

interface QUnitSuite extends Suite {
	_qunitContext: any;
}

interface QUnitTest extends Test {
	parent: QUnitSuite;
}

/**
 * Escape special characters in a regexp string
 */
function escapeRegExp(str: any) {
	return String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function extend<T extends {}, U extends {}>(target: T, mixin: U, skipExistingTargetProperties?: boolean): T & U {
	const result: T & U = target as any;
	for (let key in mixin) {
		if (mixin.hasOwnProperty(key)) {
			if (mixin[key] === undefined) {
				delete result[key];
			}
			else if (!skipExistingTargetProperties || result[key] === undefined) {
				result[key] = mixin[key];
			}
		}
	}
	return result;
}

export default function getInterface(executor: Executor) {
	if (interfaces.has(executor)) {
		return interfaces.get(executor)!;
	}

	let currentSuites: Suite[];

	function wrapChai(name: keyof Chai.AssertStatic) {
		return function (this: BaseAssert): void {
			// TODO: Could try/catch errors to make them act more like the way QUnit acts, where an assertion failure
			// does not fail the test, but not sure of the best way to get multiple assertion failures out of a test
			// like that
			++this._numAssertions;
			assert[name].apply(assert, arguments);
		};
	}

	const { assert, AssertionError } = executor.getPlugin('chai');

	const baseAssert: BaseAssert = {
		_steps: null,
		_expectedAssertions: NaN,
		_numAssertions: 0,

		async(_acceptCallCount) {
			return null as any;
		},
		deepEqual: wrapChai('deepEqual'),
		equal: wrapChai('equal'),
		expect: function (this: BaseAssert, numTotal?: number) {
			if (typeof numTotal !== 'undefined') {
				this._expectedAssertions = numTotal;
			}
			else {
				return this._expectedAssertions;
			}
		} as Assertions['expect'],
		notDeepEqual: wrapChai('notDeepEqual'),
		notEqual: wrapChai('notEqual'),
		notOk: wrapChai('notOk'),
		notPropEqual: wrapChai('notDeepEqual'),
		notStrictEqual: wrapChai('notStrictEqual'),
		ok: wrapChai('ok'),
		propEqual: wrapChai('deepEqual'),
		strictEqual: wrapChai('strictEqual'),
		pushResult(result) {
			this._numAssertions++;
			if (!result.result) {
				assert.fail(result.actual, result.expected, result.message);
			}
		},
		step(message) {
			this._steps!.push(message);
		},
		timeout(_duration: number) {},
		throws: ((): BaseAssert['throws'] => {
			const throws = wrapChai('throws');
			return function (this: BaseAssert, fn, expected, message) {
				if (typeof expected === 'function') {
					++this._numAssertions;
					try {
						fn();
						throw new AssertionError(
							(message ? message + ': ' : '') +
							'expected [Function] to throw'
						);
					}
					catch (error) {
						if (!expected(error)) {
							throw new AssertionError(
								(message ? message + ': ' : '') +
								'expected [Function] to throw error matching [Function] but got ' +
								(error instanceof Error ? error.toString() : error)
							);
						}
					}
				}
				else {
					throws.apply(this, arguments);
				}
			};
		})(),
		verifySteps(steps, message) {
			this._numAssertions++;
			assert.includeMembers(this._steps!, steps, message);
		}
	};

	function verifyExpects(assert: BaseAssert) {
		if (isNaN(assert._expectedAssertions) && QUnit.config.requireExpects) {
			throw new AssertionError('Expected number of assertions to be defined, but expect() was not called.');
		}

		if (!isNaN(assert._expectedAssertions) && assert._numAssertions !== assert._expectedAssertions) {
			throw new AssertionError(`Expected ${assert._expectedAssertions} assertions, but ${assert._numAssertions} were run`);
		}
	}

	function createAssert(suiteOrTest: Suite | Test): BaseAssert {
		const assert = create(baseAssert, {
			_expectedAssertions: NaN,
			_numAssertions: 0,
			_steps: [],

			async(callCount: number = 1) {
				const dfd = suiteOrTest.async!();

				if (isNaN(callCount) || callCount < 1) {
					callCount = 1;
				}

				function done() {
					--callCount;
					if (callCount === 0) {
						dfd.resolve();
					}
					else if (callCount < 0) {
						throw new Error('resolve called too many times');
					}
				}

				assert.async = () => done;

				return done;
			},

			timeout(duration: number) {
				suiteOrTest.timeout = duration;
			}
		});

		return assert;
	}

	let autostartHandle: Handle | undefined;
	let moduleName: string | undefined;

	const config: Config = {
		get autostart() {
			return !autostartHandle;
		},
		set autostart(value) {
			if (autostartHandle) {
				autostartHandle.destroy();
				autostartHandle = undefined;
			}

			if (!value) {
				autostartHandle = executor.on('beforeRun', () => {
					return new Promise<void>(resolve => {
						QUnit.start = resolve;
					});
				});

				QUnit.start = () => {
					autostartHandle!.destroy();
					autostartHandle = undefined;
					QUnit.start = /* istanbul ignore next */ function () {};
				};
			}
		},
		get module() {
			return moduleName;
		},
		set module(value) {
			moduleName = value;
			executor.addSuite(suite => {
				suite.grep = new RegExp('(?:^|[^-]* - )' + escapeRegExp(value) + ' - ', 'i');
			});
		},
		requireExpects: false,
		testTimeout: Infinity
	};

	const QUnit: Interface = {
		get assert() {
			return baseAssert;
		},
		get config() {
			return config;
		},

		extend,

		stack(): string {
			return '';
		},
		start: /* istanbul ignore next */ () => {},

		// test registration
		/*asyncTest(name, test) {
			registerTest(name, self => {
				self.timeout = QUnit.config.testTimeout;

				let numCallsUntilResolution = 1;
				const dfd = self.async();
				const testAssert = create(baseAssert, { _expectedAssertions: NaN, _numAssertions: 0 });

				QUnit.stop = function () {
					++numCallsUntilResolution;
				};
				QUnit.start = dfd.rejectOnError(() => {
					if (--numCallsUntilResolution === 0) {
						try {
							testAssert.verifyAssertions();
							dfd.resolve();
						}
						finally {
							QUnit.stop = QUnit.start = /* istanbul ignore next *//* function () {};
						}
					}
				});

				try {
					test.call(self.parent._qunitContext, testAssert);
				}
				catch (error) {
					dfd.reject(error);
				}
			});
		},*/

		module(name: string, hooks?: Hooks | NestedCallback, nested?: NestedCallback) {
			if (typeof hooks === 'function') {
				nested = hooks;
				hooks = undefined;
			}

			currentSuites = [];
			executor.addSuite(parentSuite => {
				const suite = new Suite({ name: name, parent: parentSuite, _qunitContext: {} } as any);
				parentSuite.tests.push(suite);
				currentSuites.push(suite);

				if (hooks && typeof hooks !== 'function') {
					Object.keys(hooks).forEach((key: keyof Hooks) => {
						on(suite, key, () => {
							(hooks as Hooks)[key]!.call((suite as QUnitSuite)._qunitContext);
						});
					});
				}
			});
		},

		test(name, callback) {
			function test(self: QUnitTest) {
				const testAssert = createAssert(self);
				const result = callback.call(self.parent._qunitContext, testAssert);

				if (result && result.then) {
					return result.then(() => {
						verifyExpects(testAssert);
					});
				}

				verifyExpects(testAssert);
			}
			currentSuites.forEach(parent => {
				parent.add(new Test({ name, parent, test }));
			});
		},

		// callbacks
		begin(callback) {
			executor.on('runStart', (executor: Executor) => {
				const totalTests = executor.suites.reduce((numTests, suite) => {
					return numTests + suite.numTests;
				}, 0);

				callback({ totalTests });
			});
		},

		done(callback) {
			executor.on('runEnd', (executor: Executor) => {
				const failed = executor.suites.reduce((numTests, suite) => {
					return numTests + suite.numFailedTests;
				}, 0);
				const total = executor.suites.reduce((numTests, suite) => {
					return numTests + suite.numTests;
				}, 0);
				const numSkippedTests = executor.suites.reduce(function (numTests, suite) {
					return numTests + suite.numSkippedTests;
				}, 0);
				const runtime = Math.max.apply(null, executor.suites.map(function (suite) {
					return suite.timeElapsed;
				}));

				callback({
					failed,
					passed: total - failed - numSkippedTests,
					total,
					runtime
				});
			});
		},

		log(callback) {
			executor.on('testEnd', (test: QUnitTest) => {
				callback({
					result: test.hasPassed,
					actual: test.error && test.error.actual,
					expected: test.error && test.error.expected,
					message: test.error && test.error.message,
					source: test.error && test.error.stack,
					module: test.parent.name,
					name: test.name
				});
			});
		},

		moduleDone(callback) {
			executor.on('suiteEnd', (suite: QUnitSuite) => {
				if (suite._qunitContext) {
					callback({
						name: suite.name,
						failed: suite.numFailedTests,
						passed: suite.numTests - suite.numFailedTests - suite.numSkippedTests,
						total: suite.numTests,
						runtime: suite.timeElapsed
					});
				}
			});
		},

		moduleStart(callback) {
			executor.on('suiteStart', (suite: QUnitSuite) => {
				if (suite._qunitContext) {
					callback({
						name: suite.name
					});
				}
			});
		},

		testDone(callback) {
			executor.on('testEnd', (test: QUnitTest) => {
				callback({
					name: test.name,
					module: test.parent.name,
					failed: test.hasPassed ? 0 : 1,
					passed: test.hasPassed ? 1 : 0,
					total: 1,
					runtime: test.timeElapsed
				});
			});
		},

		testStart(callback) {
			executor.on('testStart', (test: QUnitTest) => {
				callback({
					name: test.name,
					module: test.parent.name
				});
			});
		},

		on(name, callback) {
			QUnit[name](callback);
		}
	};

	interfaces.set(executor, QUnit);

	return QUnit;
}

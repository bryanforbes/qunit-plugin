import * as _getInterface from 'src/getInterface';
import { Interface } from 'src/types';

const { suite, test, beforeEach, afterEach } = intern.getInterface('tdd');
const { assert, AssertionError } = intern.getPlugin('chai');

import { mockExecutor, MockExecutor } from '../support/mocks';

import Suite from 'intern/lib/Suite';
import Test from 'intern/lib/Test';
import { InternError } from 'intern/lib/types';

import { on } from '@dojo/core/aspect';
import { create } from '@dojo/core/lang';

const MockModule = intern.getPlugin('mocking');

suite('src/getInterface', () => {
	let mock: MockModule<typeof _getInterface>;
	let module: typeof _getInterface;
	let getInterface: typeof _getInterface.default;

	let rootSuite: Suite;
	let executor: MockExecutor;

	beforeEach(async () => {
		executor = mockExecutor();
		rootSuite = executor.suites[0];

		mock = new MockModule('src/getInterface', require);

		await mock.mockDependencies({
			'intern/lib/Suite': {
				default: Suite
			},
			'intern/lib/Test': {
				default: Test
			},
			'@dojo/core/lang': { create },
			'@dojo/core/aspect': { on }
		});
		module = await mock.getModuleUnderTest();
		getInterface = module.default;
	});

	afterEach(() => {
		mock.destroy();
	});

	test('getInterface()', () => {
		const iface = getInterface(executor);

		assert.isObject(iface.assert);
		assert.isObject(iface.config);
		assert.isFunction(iface.extend);
		assert.isFunction(iface.stack);
		assert.isFunction(iface.module);
		assert.isFunction(iface.start);
		assert.isFunction(iface.test);
		assert.isFunction(iface.begin);
		assert.isFunction(iface.done);
		assert.isFunction(iface.log);
		assert.isFunction(iface.moduleDone);
		assert.isFunction(iface.moduleStart);
		assert.isFunction(iface.on);
		assert.isFunction(iface.testDone);
		assert.isFunction(iface.testStart);

		const otherIface = getInterface({
			getPlugin() {
				return intern.getPlugin('chai');
			}
		} as any);
		assert.isOk(otherIface);
		assert.notStrictEqual(otherIface, iface);

		const sameIface = getInterface(executor);
		assert.strictEqual(sameIface, iface);
	});

	suite('interface methods', () => {
		let iface: Interface;

		beforeEach(() => {
			iface = getInterface(executor);
		});

		test('.asyncTest()', async () => {
			iface.module('qunit suite 1');

			iface.config.testTimeout = 500;

			iface.asyncTest('qunit async test 1', function (assertParam) {
				assertParam.ok(false);
				iface.start();
			});

			iface.asyncTest('qunit async test 2', function (assertParam) {
				setTimeout(function () {
					assertParam.ok(true);
				}, 50);
			});

			iface.asyncTest('qunit async test 3', function (assertParam) {
				setTimeout(function () {
					assertParam.ok(true);
					iface.start();
				}, 50);
			});

			iface.asyncTest('qunit async test 4', function (assertParam) {
				iface.stop();
				setTimeout(function () {
					assertParam.ok(true);
					iface.start();
				}, 50);

				setTimeout(function () {
					assertParam.ok(true);
					iface.start();
				}, 50);
			});

			await rootSuite.run();
			const test0 = <Test> (<Suite> rootSuite.tests[0]).tests[0];
			const test1 = <Test> (<Suite> rootSuite.tests[0]).tests[1];
			const test2 = <Test> (<Suite> rootSuite.tests[0]).tests[2];
			const test3 = <Test> (<Suite> rootSuite.tests[0]).tests[3];

			assert.isDefined(test0.error,
				'async test should throw an error on failed assertion');
			assert.isDefined(test1.error,
				'async test should fail without QUnit.start');
			assert.strictEqual(test1.error!.message,
				'Timeout reached on parent - qunit suite 1 - qunit async test 2#',
				'async test should fail without QUnit.start with a timeout message');
			assert.strictEqual(test2.hasPassed, true,
				'async test should work with QUnit.start');
			assert.strictEqual(test3.hasPassed, true,
				'async test should handle QUnit.start according to number of calls to QUnit.stop');
		});

		suite('.module', () => {
			test('should create a subsuite', () => {
				iface.module('qunit suite 1');
				assert.strictEqual(rootSuite.tests[0].name, 'qunit suite 1',
					'First registered module should have name "qunit suite 1');
				assert.strictEqual(rootSuite.tests[0].parent, rootSuite,
					'First registered module\'s parent should be rootSuite');
			});

			test('should add setup and teardown methods', () => {
				iface.module('qunit suite 1', {
					setup: function () {},
					teardown: function () {}
				});

				assert.typeOf((<Suite> rootSuite.tests[0]).afterEach, 'Function',
					'afterEach of the created suite should have type "Function"');
				assert.typeOf((<Suite> rootSuite.tests[0]).beforeEach, 'Function',
					'beforeEach of the created suite should have type "Function"');

				iface.module('qunit suite 2', {});

				assert.typeOf((<Suite> rootSuite.tests[1]).afterEach, 'undefined',
					'afterEach of the created suite should have type "undefined" if not present');
				assert.typeOf((<Suite> rootSuite.tests[1]).beforeEach, 'undefined',
					'beforeEach of the created suite should have type "undefined" if not present');
			});

			test('should have a working lifecycle methods', () => {
				const moduleParams: { [key: string]: Function } = {};
				const results: string[] = [];
				const expectedResults = [ 'setup', 'teardown' ];
				const lifecycleMethods = [ 'beforeEach', 'afterEach' ];

				expectedResults.forEach(function (method) {
					moduleParams[method] = function () {
						results.push(method);
					};
				});

				iface.module('qunit suite 1', moduleParams);

				lifecycleMethods.forEach(function (method: string) {
					const suite = rootSuite.tests[0];
					(<Function> (<any> suite)[method])();
				});

				assert.deepEqual(results, expectedResults,
					'QUnit interface methods should get called when ' + 'corrosponding Suite methods all called');
			});
		});

		suite('.test', () => {
			test('should create and push test', () => {
				iface.module('qunit suite 1');

				iface.test('qunit test 1', () => {});

				const test0 = <Test> (<Suite> rootSuite.tests[0]).tests[0];
				assert.strictEqual(test0.name, 'qunit test 1',
					'Module should register a test named "qunit test 1"');
				assert.strictEqual(test0.parent.name, 'qunit suite 1',
					'Test should be registered in module named "qunit suite 1"');
			});

			test('should be added to latest module', () => {
				iface.module('qunit suite 1');
				iface.module('qunit suite 2');

				iface.test('qunit test 1', () => {});

				const test0 = <Test> (<Suite> rootSuite.tests[0]).tests[0];
				const test1 = <Test> (<Suite> rootSuite.tests[1]).tests[0];
				assert.isUndefined(test0,
					'There should not be any tests registered in module named "qunit suite 1"');
				assert.isDefined(test1,
					'There be a test registered in module named "qunit suite 1"');
				assert.strictEqual(test1.name, 'qunit test 1',
					'Module 2 should register a test named "qunit test 1"');
				assert.strictEqual(test1.parent.name, 'qunit suite 2',
					'Test should be registered under module named "qunit suite 2"');
			});

			test('should call the test function', async () => {
				const results: any[] = [];

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function (assertParam) {
					results.push(assertParam);
				});

				const test0 = <Test> (<Suite> rootSuite.tests[0]).tests[0];
				assert.instanceOf(test0, Test,
					'test 1 should be a Test Instance');

				await rootSuite.run();

				assert.strictEqual(iface.assert.isPrototypeOf(results[0]), true,
					'Assert passed to QUnit test should be instance of QUnit.assert');
			});
		});

		suite('.extend', () => {
			test('should have a working expect', () => {
				const testObject: any = { a: 1 };

				iface.extend(testObject, {
					b: { c: 1 }
				});
				assert.deepEqual(testObject, { a: 1, b: { c: 1 } }, 'Extended Object should be equal to expected one');

				iface.extend(testObject, { b: undefined });
				assert.deepEqual(testObject, { a: 1 }, 'Extended object should delete undefined props');

				iface.extend(testObject, { a: 2, b: 2 }, true);
				assert.deepEqual(testObject, { a: 1, b: 2 },
					'Extended object should set undefined props only if undef option is set');
			});
		});

		suite('events', () => {
			test('.begin', async () => {
				const results: number[] = [];
				const expectedResults = [ 3 ];

				iface.begin(function (param: any) {
					results.push(param.totalTests);
				});

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function () {});
				iface.test('qunit test 2', function () {});

				iface.module('qunit suite 2');

				iface.test('qunit test 1', function () {});

				await executor.run();

				assert.deepEqual(results, expectedResults,
					'Test suite should have "3" tests registered');
			});

			test('.done', async () => {
				const results: number[] = [];
				const expectedResults = [ 0, 3, 3 ];
				let runtime = 0;

				iface.done(function (param: any) {
					results.push(param.failed, param.passed, param.total);
					runtime = param.runtime;
				});

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function () {});
				iface.test('qunit test 2', function () {});

				iface.module('qunit suite 2');

				iface.test('qunit test 1', function () {});

				await executor.run();

				assert.deepEqual(results, expectedResults,
					'results should be equal to expectedResults on "done"');
				assert.isDefined(runtime, 'runtime should be defined on "done"');
			});

			test('.log', async () => {
				const results: any[] = [];
				const expectedResults = [ false, 2, 1,
					'actual should be equal to expected: expected 2 to equal 1',
					'qunit suite 1', 'qunit test 1' ];

				iface.log(function (param: any) {
					results.push(param.result, param.actual, param.expected,
						param.message, param.module, param.name);
				});

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function (assertParam) {
					const expected = 1;
					const actual = 2;
					assertParam.strictEqual(actual, expected,
						'actual should be equal to expected');
				});

				await rootSuite.run();

				assert.deepEqual(results, expectedResults,
					'results should be equal to expectedResults on "log"');
			});

			test('.moduleStart', async () => {
				const results: string[] = [];
				const expectedResults = [ 'qunit suite 1' ];

				iface.moduleStart(function (param: any) {
					results.push(param.name);
				});

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function () {});

				await rootSuite.run();

				assert.deepEqual(results, expectedResults,
					'Module should have name "qunit suite 1"');
			});

			test('.moduleDone', async () => {
				const results: any[] = [];
				const expectedResults = [ 'qunit suite 1', 0, 1, 1 ];
				let runtime = 0;

				iface.moduleDone(function (param: any) {
					results.push(param.name, param.failed, param.passed, param.total);
					runtime = param.runtime;
				});

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function () {});

				await rootSuite.run();

				assert.deepEqual(results, expectedResults, 'results should match expectedResults on "moduleDone"');
				assert.isDefined(runtime, 'Runtime should be defined on "moduleDone"');
			});

			test('.testStart', async () => {
				const results: string[] = [];
				const expectedResults = ['qunit test 1'];

				iface.testStart(function (param: any) {
					results.push(param.name);
				});

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function () {});

				await rootSuite.run();

				assert.deepEqual(results, expectedResults, 'results should match expectedResults on "testStart"');
			});

			test('.testDone', async () => {
				const results: any[] = [];
				const expectedResults = [
					'qunit test 1', 'qunit suite 1', 0, 1, 1,
					'qunit test 2', 'qunit suite 1', 1, 0, 1
				];
				const runtime: any[] = [];

				iface.testDone(function (param: any) {
					results.push(param.name, param.module, param.failed, param.passed, param.total);
					runtime.push(param.runtime);
				});

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function () {});
				iface.test('qunit test 2', function (assertParam) {
					assertParam.ok(false, 'Failing test');
				});

				await rootSuite.run();

				assert.deepEqual(results, expectedResults,
					'results should match expectedResults on "testDone"');
				assert.isDefined(runtime[0],
					'Runtime for "qunit test 1" should exist');
				assert.isDefined(runtime[1],
					'Runtime for "qunit test 2" should exist');
			});
		});
	});

	suite('interface properties', () => {
		let iface: Interface;

		beforeEach(() => {
			iface = getInterface(executor);
		});

		suite('.asserts', () => {
			test('.expect', async () => {
				const results: any[] = [];

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function (assertParam) {
					assertParam.expect(1);
					results.push(assertParam._expectedAssertions);
					results.push(assertParam.expect());
				});

				await rootSuite.run();

				assert.strictEqual(results[0], 1, 'Base assert should have "1" expected assertions');
				assert.strictEqual(results[1], 1,
					'Expect should return number of expected assertions if 0 or > 1 argument(s) is(are) passed');
			});

			test('.pushResult', async () => {
				const results: any[] = [];

				iface.module('qunit suite 1');

				iface.test('qunit test 1', function (assertParam) {
					let actual = 1;
					const expected = 1;

					assertParam.pushResult({
						result: actual === expected,
						actual,
						expected,
						message: '"actual" should be equal to "expected"'
					});
					results.push(assertParam._numAssertions);

					actual = 2;

					assert.throws(function () {
						assertParam.pushResult({
							result: actual === expected,
							actual,
							expected,
							message: '"actual" should be equal to "expected"'
						});
					}, AssertionError, 'push should throw an assertion error on fail');
				});

				await rootSuite.run();

				assert.strictEqual(results[0], 1, 'Base assert should have "1" assertion');
			});

			test('.throws', () => {
				assert.throws(function () {
					iface.assert.throws(function () {}, function () {});
				}, 'expected [Function] to throw');

				assert.throws(function () {
					iface.assert.throws(function () {}, function () {}, 'foo');
				}, 'foo: expected [Function] to throw');

				assert.doesNotThrow(function () {
					iface.assert.throws(function () {
						throw new Error('Oops');
					}, function (error: InternError) {
						return error.message === 'Oops';
					});
				}, 'Error should be passed to test function, and matching test function should not throw');

				assert.throws(function () {
					iface.assert.throws(function () {
						throw new Error('Oops');
					}, function () {
						return false;
					}, 'foo');
				}, 'foo: expected [Function] to throw error matching [Function] but got Error: Oops');
			});
		});

		suite('.config', () => {
			suite('.autostart', () => {
				test('default', () => {
					assert.strictEqual(iface.config.autostart, true,
						'Autostart should be true by default');
				});

				test('enabled', async () => {
					iface.config.autostart = false;
					assert.strictEqual(iface.config.autostart, false,
						'Autostart can be set via config to false');

					let finishedBeforeCall = true;
					setTimeout(function () {
						finishedBeforeCall = false;
						iface.start();
					}, 100);

					await executor.run();

					assert.isFalse(finishedBeforeCall,
						'Execution should be blocked until QUnit.start is called');
				});

				test('enabled, then disabled', () => {
					iface.config.autostart = false;
					assert.strictEqual(iface.config.autostart, false,
						'Autostart can be set via config to false');

					assert.ok(executor.handlers['beforeRun'],
						'Disabling autostart should add a block to the pre-execution function');

					iface.config.autostart = true;
					assert.strictEqual(iface.config.autostart, true,
						'Autostart can be set via config to true');

					assert.lengthOf(executor.handlers['beforeRun'], 0,
						'Execution should not be blocked when autostart is true');
				});
			});

			test('.module', async () => {
				assert.isUndefined(iface.config.module,
					'There should not be any module in config by default');

				iface.module('suite 1');
				iface.test('test 1', function () {});
				iface.module('suite 2');
				iface.test('test 2', function () {});

				iface.config.module = 'suite 1';

				assert.strictEqual(iface.config.module, 'suite 1',
					'Module filter can be set through config');

				await rootSuite.run();

				const test = <Test> (<Suite> rootSuite.tests[0]).tests[0];
				const skippedTest = <Test> (<Suite> rootSuite.tests[1]).tests[0];
				assert.isTrue(test.hasPassed, 'Matching module should run and pass');
				assert.strictEqual(skippedTest.skipped, 'grep',
					'Non-matching module should be skipped');
			});

			test('.requireExpects', async () => {
				iface.module('qunit suite 1');

				iface.config.requireExpects = true;

				iface.test('qunit test 1', function (assertParam) {
					assertParam.expect(0);
				});

				// This test should fail even though it has no failures because it is missing `expects`
				iface.test('qunit test 2', function () {});

				await rootSuite.run();

				const passedTest = <Test> (<Suite> rootSuite.tests[0]).tests[0];
				const failedTest = <Test> (<Suite> rootSuite.tests[0]).tests[1];
				assert.isTrue(passedTest.hasPassed, 'Test with `expect` should pass');
				assert.isFalse(failedTest.hasPassed, 'Test without `expect` should fail');
			});
		});
	});
});

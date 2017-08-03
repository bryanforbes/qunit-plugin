import * as _QUnitInterface from 'src/index';

const { suite, test, beforeEach, afterEach } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

import * as sinon from 'sinon';

const MockModule = intern.getPlugin('mocking');

type InterfaceKeys = keyof _QUnitInterface.Interface;
type MockInterface = {
	[P in InterfaceKeys]: sinon.SinonStub;
} & {
	readonly assert: any;
	readonly config: any;
};

function createMockInterface(): MockInterface {
	return [
		'extend', 'stack', 'module', 'start', 'test', 'on',
		'begin', 'done', 'log', 'moduleDone', 'moduleStart', 'testDone', 'testStart'
	].reduce((iface: any, key) => {
		iface[key] = sinon.stub();
		return iface;
	}, {
		assert: {},
		config: {}
	});
}

suite('src/index', () => {
	let mock: MockModule<typeof _QUnitInterface>;
	let module: typeof _QUnitInterface;

	let mockInterface: MockInterface;
	let mockGetInterface: sinon.SinonStub;

	beforeEach(async () => {
		mockInterface = createMockInterface();
		mockGetInterface = sinon.stub().returns(mockInterface);
		mock = new MockModule('src/index', require);

		await mock.mockDependencies({
			'src/getInterface': {
				default: mockGetInterface
			},
			'intern/lib/Suite': {
				default: sinon.stub()
			},
			'intern/lib/Test': {
				default: sinon.stub()
			}
		});
		module = await mock.getModuleUnderTest();
	});

	afterEach(() => {
		mock.destroy();
		intern.registerPlugin('interface.qunit', () => undefined);
	});

	test('module interface', () => {
		assert.isTrue(mockGetInterface.calledOnce);
		assert.strictEqual(mockGetInterface.firstCall.args[0], intern);

		assert.strictEqual(module.assert, mockInterface.assert);
		assert.strictEqual(module.config, mockInterface.config);
		assert.strictEqual(module.getInterface, mockGetInterface);

		assert.isFunction(module.extend);
		assert.isFunction(module.stack);
		assert.isFunction(module.module);
		assert.isFunction(module.start);
		assert.isFunction(module.test);
		assert.isFunction(module.begin);
		assert.isFunction(module.done);
		assert.isFunction(module.log);
		assert.isFunction(module.moduleDone);
		assert.isFunction(module.moduleStart);
		assert.isFunction(module.on);
		assert.isFunction(module.testDone);
		assert.isFunction(module.testStart);
	});

	function addTest(name: InterfaceKeys, ...args: any[]) {
		test(`.${name}()`, () => {
			(module as any)[name].apply(null, args);

			assert.isTrue(mockInterface[name].calledOnce);
			assert.isTrue(mockInterface[name].calledWithExactly(...args));
		});
	}

	addTest('extend', {}, {}, false);
	addTest('stack', 5);
	addTest('module', 'foo', {});
	addTest('start');
	addTest('test', 'foo', () => undefined);
	addTest('begin', () => undefined);
	addTest('done', () => undefined);
	addTest('log', () => undefined);
	addTest('moduleDone', () => undefined);
	addTest('moduleStart', () => undefined);
	addTest('on', 'begin', () => undefined);
	addTest('testDone', () => undefined);
	addTest('testStart', () => undefined);
});

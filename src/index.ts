import getInterface from './getInterface';
import {
	Interface, Assertions, Config, TestFunction, Hooks, Callback, BeginData,
	DoneData, LogData, ModuleDoneData, ModuleStartData, TestDoneData,
	TestStartData
} from './types';

export { getInterface };
export * from './types';

const QUnit = getInterface(intern);

export const assert: Assertions = QUnit.assert;
export const config: Config = QUnit.config;

export function extend<T extends {}, U extends {}>(target: T, mixin: U, skipExistingTargetProperties?: boolean): T & U {
	return QUnit.extend(target, mixin, skipExistingTargetProperties);
}

export function start() {
	QUnit.start();
}

export function stop() {
	QUnit.stop();
}

export function asyncTest(name: string, test: TestFunction) {
	QUnit.asyncTest(name, test);
}

export function module(name: string, hooks?: Hooks) {
	QUnit.module(name, hooks);
}

export function test(name: string, test: TestFunction) {
	QUnit.test(name, test);
}

export function begin(callback: Callback<BeginData>) {
	QUnit.begin(callback);
}

export function done(callback: Callback<DoneData>) {
	QUnit.done(callback);
}

export function log(callback: Callback<LogData>) {
	QUnit.log(callback);
}

export function moduleDone(callback: Callback<ModuleDoneData>) {
	QUnit.moduleDone(callback);
}

export function moduleStart(callback: Callback<ModuleStartData>) {
	QUnit.moduleStart(callback);
}

export function testDone(callback: Callback<TestDoneData>) {
	QUnit.testDone(callback);
}

export function testStart(callback: Callback<TestStartData>) {
	QUnit.testStart(callback);
}

declare module 'intern/lib/executors/Executor' {
	export default interface Executor {
		getInterface(name: 'qunit'): Interface;
	}
}

intern.registerInterface('qunit', QUnit);
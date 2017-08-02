export interface Assertions {
	deepEqual(actual: any, expected: any, message?: string): void;
	equal(actual: any, expected: any, message?: string): void;
	expect(numTotal: number): void;
	expect(): number;
	notDeepEqual(actual: any, expected: any, message?: string): void;
	notEqual(actual: any, expected: any, message?: string): void;
	// notOk(state: any, message?: string): void;
	notPropEqual(actual: any, expected: any, message?: string): void;
	notStrictEqual(actual: any, expected: any, message?: string): void;
	ok(state: any, message?: string): void;
	push(ok: boolean, actual: any, expected: any, message?: string): void;
	// pushResult(assertionResult: AssertionResult): void;
	propEqual(actual: any, expected: any, message?: string): void;
	strictEqual(actua: any, expected: any, message?: string): void;
	throws(block: Function, expected: Object | RegExp | Error, message?: string): void;
	raises(block: Function, expected: Object | RegExp | Error, message?: string): void;
	verifyAssertions(): void;
}

export interface BaseAssert extends Assertions {
	_expectedAssertions: number;
	_numAssertions: number;
}

export type Callback<T> = (data: T) => void;

export interface Config {
	autostart: boolean;
	module: string | undefined;
	requireExpects: boolean;
	testTimeout: number;
}

export interface BeginData {
	totalTests: number;
}

export interface DoneData {
	failed: number;
	passed: number;
	runtime: number;
	total: number;
}

export interface Hooks {
	setup?(): void;
	teardown?(): void;
}

export interface Interface {
	assert: Assertions;
	config: Config;
	extend<T extends {}, U extends {}>(target: T, mixin: U, skipExistingTargetProperties?: boolean): T & U;
	start(): void;
	stop(): void;
	asyncTest(name: string, test: TestFunction): void;
	module(name: string, hooks?: Hooks): void;
	test(name: string, test: TestFunction): void;
	begin(callback: Callback<BeginData>): void;
	done(callback: Callback<DoneData>): void;
	log(callback: Callback<LogData>): void;
	moduleDone(callback: Callback<ModuleDoneData>): void;
	moduleStart(callback: Callback<ModuleStartData>): void;
	testDone(callback: Callback<TestDoneData>): void;
	testStart(callback: Callback<TestStartData>): void;
}

export interface LogData {
	actual: any;
	expected: any;
	message?: string;
	module: string;
	name: string;
	result: boolean;
	source?: string;
}

export interface ModuleDoneData extends ModuleStartData, DoneData {}

export interface ModuleStartData {
	name: string;
}

export interface TestDoneData extends ModuleDoneData, TestStartData {}

export type TestFunction = (assert: BaseAssert) => void;

export interface TestStartData extends ModuleStartData {
	module: string;
}

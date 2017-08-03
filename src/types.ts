export interface Assertions {
	async(acceptCallCount?: number): () => void;
	deepEqual(actual: any, expected: any, message?: string): void;
	equal(actual: any, expected: any, message?: string): void;
	expect(numTotal: number): void;
	expect(): number;
	notDeepEqual(actual: any, expected: any, message?: string): void;
	notEqual(actual: any, expected: any, message?: string): void;
	notOk(state: any, message?: string): void;
	notPropEqual(actual: any, expected: any, message?: string): void;
	notStrictEqual(actual: any, expected: any, message?: string): void;
	ok(state: any, message?: string): void;
	propEqual(actual: any, expected: any, message?: string): void;
	pushResult(assertionResult: AssertionResult): void;
	step(message: string): void;
	strictEqual(actua: any, expected: any, message?: string): void;
	throws(block: Function, expected: Object | RegExp | Error, message?: string): void;
	timeout(duration: number): void;
	verifySteps(steps: string[], message?: string): void;
}

export interface AssertionResult {
	actual: any;
	expected: any;
	message: string;
	result: boolean;
}

export interface BaseAssert extends Assertions {
	_expectedAssertions: number;
	_numAssertions: number;
	_steps: string[] | null;
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
	after?(): void;
	afterEach?(): void;
	before?(): void;
	beforeEach?(): void;
}

export interface Events {
	begin: BeginData;
	done: DoneData;
	log: LogData;
	moduleDone: ModuleDoneData;
	moduleStart: ModuleStartData;
	testDone: TestDoneData;
	testStart: TestStartData;
}

export interface Interface {
	assert: Assertions;
	config: Config;
	extend<T extends {}, U extends {}>(target: T, mixin: U, skipExistingTargetProperties?: boolean): T & U;
	stack(offset?: number): string;

	module(name: string): void;
	module(name: string, hooks: Hooks): void;
	module(name: string, nested: NestedCallback): void;
	module(name: string, hooks: Hooks, nested: NestedCallback): void;
	start(): void;
	test(name: string, test: TestFunction): void;

	// callbacks
	begin(callback: Callback<BeginData>): void;
	done(callback: Callback<DoneData>): void;
	log(callback: Callback<LogData>): void;
	moduleDone(callback: Callback<ModuleDoneData>): void;
	moduleStart(callback: Callback<ModuleStartData>): void;
	on<K extends keyof Events>(name: K, callback: Callback<Events[K]>): void;
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

export interface ModuleHooks {
	after(callback: TestFunction): void;
	afterEach(callback: TestFunction): void;
	before(callback: TestFunction): void;
	beforeEach(callback: TestFunction): void;
}

export interface ModuleStartData {
	name: string;
}

export type NestedCallback = (hooks: ModuleHooks) => void;

export interface TestDoneData extends ModuleDoneData, TestStartData {}

export type TestFunction = (assert: BaseAssert) => (Promise<any> | void);

export interface TestStartData extends ModuleStartData {
	module: string;
}

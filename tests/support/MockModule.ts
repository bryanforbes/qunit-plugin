import * as sinon from 'sinon';

export default abstract class BaseMockModule<T> {
	protected require: any;
	protected moduleUnderTestPath: string;
	protected sandbox: sinon.SinonSandbox;

	constructor(moduleUnderTestPath: string, require?: any) {
		this.require = require;
		this.moduleUnderTestPath = moduleUnderTestPath;
		this.sandbox = sinon.sandbox.create();
	}

	abstract getModuleUnderTest(): Promise<T>;
	protected abstract registerMock(name: string, mock: any): void;

	reset(): void {
		this.sandbox.reset();
	}

	mockDependencies(mocks: { [name: string]: any; }) {
		Object.keys(mocks).forEach(name => {
			const mock = mocks[name];
			this.registerMock(name, mock === null ? this.sandbox.stub() : mock);
		});
	}

	destroy(): void {
		this.sandbox.restore();
	}
}

declare global {
	class MockModule<T> extends BaseMockModule<T> {
		getModuleUnderTest(): Promise<T>;
		protected registerMock(_name: string, _mock: any): void;
	}
}

declare module 'intern/lib/executors/Executor' {
	export default interface Executor {
		getPlugin(name: 'mocking'): typeof MockModule;
	}
}

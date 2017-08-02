/// <reference types="@dojo/loader"/>

import MockModule from './MockModule';

const notDefined = {};

function fetchModule(require: DojoLoader.Require, moduleId: string): Promise<any> {
	return new Promise(resolve => {
		try {
			require([ moduleId ], module => {
				resolve(module);
			});
		}
		catch (error) {
			resolve(notDefined);
		}
	});
}

export default class MockDojoModule<T> extends MockModule<T> {
	protected require: DojoLoader.RootRequire;

	private registeredMocks: { id: string, original?: any }[] = [];

	getModuleUnderTest(): Promise<T> {
		this.addRegisteredMock(this.moduleUnderTestPath);
		this.undefine(this.moduleUnderTestPath);
		return fetchModule(this.require, this.moduleUnderTestPath);
	}

	destroy(): void {
		while (this.registeredMocks.length > 0) {
			const { id, original } = this.registeredMocks.pop()!;
			if (original !== notDefined) {
				this.redefine(id, original);
			}
			else {
				this.undefine(id);
			}
		}

		super.destroy();
	}

	protected registerMock(name: string, mock: any) {
		this.addRegisteredMock(name);
		this.redefine(name, mock);
	}

	protected addRegisteredMock(name: string) {
		const original = this.getOriginal(name);
		this.registeredMocks.push({ id: name, original });
	}

	private getOriginal(moduleId: string) {
		moduleId = this.require.toAbsMid(moduleId);
		try {
			return this.require(moduleId);
		}
		catch (error) {
			return notDefined;
		}
	}

	private undefine(moduleId: string) {
		const { require } = this;
		require.undef(require.toAbsMid(moduleId));
	}

	private redefine(moduleId: string, mock: any) {
		this.undefine(moduleId);
		define(this.require.toAbsMid(moduleId), [], () => mock);
	}
}

intern.registerPlugin('mocking', () => MockDojoModule);

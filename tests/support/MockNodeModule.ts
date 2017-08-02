import MockModule from './MockModule';

import * as mockery from 'mockery';
import { relative, dirname } from 'path';

export default class MockNodeModule<T> extends MockModule<T> {
	private packageName: string;

	constructor(name: string) {
		super(name);

		this.packageName = name.split('/')[0];
	}

	getModuleUnderTest(): Promise<T> {
		mockery.enable({ useCleanCache: true });
		mockery.registerAllowable(this.moduleUnderTestPath, true);
		return Promise.resolve(require(this.moduleUnderTestPath));
	}

	destroy(): void {
		mockery.deregisterAll();
		mockery.disable();

		super.destroy();
	}

	protected registerMock(name: string, mock: any) {
		if (name.split('/')[0] === this.packageName) {
			name = relative(dirname(this.moduleUnderTestPath), name);
			if (name[0] !== '.') {
				name = `./${name}`;
			}
		}
		mockery.registerMock(name, mock);
	}
}

intern.registerPlugin('mocking', () => MockNodeModule);

/**
 * Plugin class providing {@link @tapjs/after!After#after} and
 * {@link @tapjs/after!After#teardown} on the
 * {@link @tapjs/test!index.Test} class.
 *
 * @module
 */

import { TapPlugin, TestBase } from '@tapjs/core'
import { isPromise } from 'is-actual-promise'

/**
 * Implementation class returned by plugin function
 */
export class After {
  #t: TestBase
  #onTeardown: (() => any)[] = []
  #didOnEOF: boolean = false

  constructor(t: TestBase) {
    this.#t = t
  }

  /**
   * Alias for {@link @tapjs/after!After#after}
   *
   * @group Test Lifecycle Management
   */
  teardown(fn: () => any) {
    return this.after(fn)
  }

  /**
   * Runs the supplied function after the test is completely finished, and
   * before the next test starts.
   *
   * @group Test Lifecycle Management
   */
  after(fn: () => any) {
    this.#onTeardown.push(fn)

    if (!this.#didOnEOF) {
      this.#didOnEOF = true
      const onEOF = this.#t.onEOF
      this.#t.onEOF = () => {
        const ret = onEOF()
        if (isPromise(ret)) {
          return ret.then(() => this.#callTeardown())
        }
        return this.#callTeardown()
      }
    }
  }

  /**
   * call the teardown functions
   *
   * @internal
   */
  #callTeardown(): void | Promise<void> {
    let fn: (() => any) | undefined
    while ((fn = this.#onTeardown.pop())) {
      try {
        const ret = fn.call(this.#t.t)
        if (isPromise(ret)) {
          return ret.then(() => this.#callTeardown())
        }
      } catch (e) {
        this.#onTeardown.length = 0
        this.#t.threw(e)
        return
      }
    }
  }
}

/**
 * Plugin method that creates the {@link @tapjs/after!After} instance
 */
export const plugin: TapPlugin<After> = (t: TestBase) => new After(t)

import type { Tester, TesterContext } from '@jest/expect-utils'
import { expect } from '@jest/globals'
import { Equal, Utils } from 'effect'
import type { MatcherFunction } from 'expect'
import * as fc from 'fast-check'
import type { Html } from '../src/html.js'

if (typeof process.env['FAST_CHECK_NUM_RUNS'] === 'string') {
  fc.configureGlobal({ ...fc.readConfigureGlobal(), numRuns: parseInt(process.env['FAST_CHECK_NUM_RUNS'], 10) })
}

expect.addEqualityTesters([effectEquals, urlEquals, temporalEquals])

function effectEquals(this: TesterContext, a: unknown, b: unknown, customTesters: Array<Tester>) {
  if (!Equal.isEqual(a) || !Equal.isEqual(b)) {
    return undefined
  }

  return Utils.structuralRegion(
    () => Equal.equals(a, b),
    (x, y) =>
      this.equals(
        x,
        y,
        customTesters.filter(t => t !== effectEquals),
      ),
  )
}

function urlEquals(this: TesterContext, a: unknown, b: unknown, customTesters: Array<Tester>) {
  if (!(a instanceof URL) || !(b instanceof URL)) {
    return undefined
  }

  return this.equals(a.href, b.href, customTesters)
}

function temporalEquals(this: TesterContext, a: unknown, b: unknown, customTesters: Array<Tester>) {
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return undefined
  }

  const typeA = Object.prototype.toString.call(a)
  const typeB = Object.prototype.toString.call(b)

  if (!typeA.startsWith('[object Temporal.') || typeA !== typeB) {
    return undefined
  }

  return this.equals(a.toString(), b.toString(), customTesters)
}

const htmlContaining: MatcherFunction<[sample: Html | string]> = function (actual, sample) {
  if (typeof actual !== 'string' && !(actual instanceof String)) {
    throw new TypeError('Not Html')
  }

  if (!actual.includes(sample.toString())) {
    return {
      message: () => `expected ${this.utils.printReceived(actual)} to be Html ${this.utils.printExpected(sample)}`,
      pass: false,
    }
  }

  return {
    message: () => `expected ${this.utils.printReceived(actual)} not to be Html ${this.utils.printExpected(sample)}`,
    pass: true,
  }
}

const plainTextContaining: MatcherFunction<[sample: string]> = function (actual, sample) {
  if (typeof actual !== 'string' && !(actual instanceof String)) {
    throw new TypeError('Not PlainText')
  }

  if (!actual.includes(sample.toString())) {
    return {
      message: () => `expected ${this.utils.printReceived(actual)} to be PlainText ${this.utils.printExpected(sample)}`,
      pass: false,
    }
  }

  return {
    message: () =>
      `expected ${this.utils.printReceived(actual)} not to be PlainText ${this.utils.printExpected(sample)}`,
    pass: true,
  }
}

expect.extend({
  htmlContaining,
  plainTextContaining,
})

declare module 'expect' {
  interface AsymmetricMatchers {
    htmlContaining(sample: Html | string): void
    plainTextContaining(sample: string): void
  }
  interface Matchers<R> {
    htmlContaining(sample: Html | string): R
    plainTextContaining(sample: string): R
  }
}

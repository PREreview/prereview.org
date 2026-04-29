import type { ExpectationResult, MatcherState, Tester, TesterContext } from '@vitest/expect'
import { Either, Equal, Utils } from 'effect'
import * as fc from 'fast-check'
import { expect } from 'vitest'
import { Html, PlainText } from '../src/html.ts'

if (typeof process.env['FAST_CHECK_NUM_RUNS'] === 'string') {
  fc.configureGlobal({ ...fc.readConfigureGlobal(), numRuns: parseInt(process.env['FAST_CHECK_NUM_RUNS'], 10) })
}

expect.addEqualityTesters([effectEquals])

function effectEquals(this: TesterContext, a: unknown, b: unknown, customTesters: Array<Tester>) {
  if (!Equal.isEqual(a) || !Equal.isEqual(b)) {
    return undefined
  }

  if (Either.isEither(a) && Either.isEither(b)) {
    if (Either.isLeft(a) && Either.isLeft(b)) {
      a = a.left
      b = b.left
    } else if (Either.isRight(a) && Either.isRight(b)) {
      a = a.right
      b = b.right
    }
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

function htmlContaining(this: MatcherState, actual: unknown, sample: Html | string): ExpectationResult {
  if (!(actual instanceof Html)) {
    throw new TypeError('Not Html')
  }

  if (!actual.value.includes(sample.toString())) {
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

function plainTextContaining(this: MatcherState, actual: unknown, sample: string): ExpectationResult {
  if (!(actual instanceof PlainText)) {
    throw new TypeError('Not PlainText')
  }

  if (!actual.value.includes(sample)) {
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

interface CustomMatchers<R = unknown> {
  htmlContaining(sample: Html | string): R
  plainTextContaining(sample: string): R
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Matchers<T = any> extends CustomMatchers<T> {}
}

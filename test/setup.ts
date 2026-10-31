import { type MatcherResult, type MatcherState, expect } from '@effect/vitest'
import { Equal, Option, Result } from 'effect'
import * as fc from 'fast-check'
import { Html, PlainText } from '../src/html.ts'

if (typeof process.env['FAST_CHECK_NUM_RUNS'] === 'string') {
  fc.configureGlobal({ ...fc.readConfigureGlobal(), numRuns: parseInt(process.env['FAST_CHECK_NUM_RUNS'], 10) })
}

const isEffectLike = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (typeof value !== 'object' || value === null || globalThis.Array.isArray(value)) {
    return false
  }

  const prototype: unknown = Object.getPrototypeOf(value)

  return (
    prototype === Object.prototype || prototype === null || typeof (value as { pipe?: unknown }).pipe === 'function'
  )
}

const isContainer = (value: unknown) => Option.isOption(value) || Result.isResult(value)

const definedKeys = (value: Record<PropertyKey, unknown>) => Object.keys(value).filter(key => value[key] !== undefined)

function effectEqualityTester(
  this: { equals: (a: unknown, b: unknown, customTesters?: ReadonlyArray<unknown>) => boolean },
  a: unknown,
  b: unknown,
  customTesters: ReadonlyArray<unknown>,
): boolean | undefined {
  if (Equal.isEqual(a) && Equal.isEqual(b) && !isContainer(a) && !isContainer(b)) {
    return Equal.equals(a, b)
  }

  if (
    !isEffectLike(a) ||
    !isEffectLike(b) ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b) ||
    customTesters.some(tester => typeof tester === 'function' && tester.name === 'subsetEquality')
  ) {
    return undefined
  }

  const keys = definedKeys(a)

  return (
    keys.length === definedKeys(b).length &&
    keys.every(key => Object.hasOwn(b, key) && this.equals(a[key], b[key], customTesters))
  )
}

expect.addEqualityTesters([effectEqualityTester as never])

function htmlContaining(this: MatcherState, actual: unknown, sample: Html | string): MatcherResult {
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

function plainTextContaining(this: MatcherState, actual: unknown, sample: string): MatcherResult {
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
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends CustomMatchers<R>, Record<never, T> {}
}

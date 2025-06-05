import type { Tester, TesterContext } from '@jest/expect-utils'
import { expect } from '@jest/globals'
import { Equal, Utils } from 'effect'
import * as fc from 'fast-check'

if (typeof process.env['FAST_CHECK_NUM_RUNS'] === 'string') {
  fc.configureGlobal({ ...fc.readConfigureGlobal(), numRuns: parseInt(process.env['FAST_CHECK_NUM_RUNS'], 10) })
}

expect.addEqualityTesters([effectEquals, urlEquals])

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

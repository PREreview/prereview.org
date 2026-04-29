import { it } from '@effect/vitest'
import { describe, expect } from 'vitest'
import * as _ from '../src/time.ts'
import * as fc from './fc.ts'

describe('renderTime', () => {
  it.prop('with a plain date', [fc.locale(), fc.plainDate()], ([locale, date]) => {
    const actual = _.renderDate(locale)(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })

  it.prop('with a plain year-month', [fc.locale(), fc.plainYearMonth()], ([locale, date]) => {
    const actual = _.renderDate(locale)(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })

  it.prop('with a year', [fc.locale(), fc.year()], ([locale, year]) => {
    const actual = _.renderDate(locale)(year)

    expect(actual.toString()).toContain(`<time datetime="${year}"`)
  })
})

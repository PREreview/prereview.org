import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../src/time.ts'
import * as fc from './fc.ts'

describe('renderTime', () => {
  test.prop([fc.locale(), fc.plainDate()])('with a plain date', (locale, date) => {
    const actual = _.renderDate(locale)(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })

  test.prop([fc.locale(), fc.plainYearMonth()])('with a plain year-month', (locale, date) => {
    const actual = _.renderDate(locale)(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })

  test.prop([fc.locale(), fc.year()])('with a year', (locale, year) => {
    const actual = _.renderDate(locale)(year)

    expect(actual.toString()).toContain(`<time datetime="${year}"`)
  })
})

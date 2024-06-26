import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../src/time.js'
import * as fc from './fc.js'

describe('renderTime', () => {
  test.prop([fc.plainDate()])('with a plain date', date => {
    const actual = _.renderDate(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })

  test.prop([fc.plainYearMonth()])('with a plain year-month', date => {
    const actual = _.renderDate(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })

  test.prop([fc.year()])('with a year', year => {
    const actual = _.renderDate(year)

    expect(actual.toString()).toContain(`<time datetime="${year}">`)
  })
})

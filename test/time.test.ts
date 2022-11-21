import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../src/time'
import * as fc from './fc'

describe('time', () => {
  test.prop([fc.plainDate()])('renderTime', date => {
    const actual = _.renderDate(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })
})

import { describe, expect } from '@jest/globals'
import * as _ from '../src/time'
import * as fc from './fc'

describe('time', () => {
  fc.test('renderTime', [fc.plainDate()], date => {
    const actual = _.renderDate(date)

    expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
  })
})

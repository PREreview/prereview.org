import * as _ from '../src/time'
import * as fc from './fc'

describe('time', () => {
  test('renderTime', () => {
    fc.assert(
      fc.property(fc.plainDate(), date => {
        const actual = _.renderDate(date)

        expect(actual.toString()).toContain(`<time datetime="${date.toString()}"`)
      }),
    )
  })
})

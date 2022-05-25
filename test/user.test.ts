import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import * as _ from '../src/user'
import * as fc from './fc'

describe('user', () => {
  describe('UserC', () => {
    test('when the user can be decoded', () => {
      fc.assert(
        fc.property(fc.user(), user => {
          const actual = pipe(user, _.UserC.encode, _.UserC.decode)

          expect(actual).toStrictEqual(D.success(user))
        }),
      )
    })

    test('when the user cannot be decoded', () => {
      fc.assert(
        fc.property(fc.string(), string => {
          const actual = _.UserC.decode(string)

          expect(actual).toStrictEqual(D.failure(expect.anything(), expect.anything()))
        }),
      )
    })
  })
})

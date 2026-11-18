import { Effect } from 'effect'
import { UrlParams } from 'effect/http'
import * as _ from '../../../../src/WebApp/MyDetails/LocationPage/LocationForm.ts'
import * as fc from '../../../fc.ts'
import { describe, expect, it } from '../../../vitest.ts'

describe('fromBody', () => {
  it.effect.prop('when there is a value', [fc.nonEmptyString()], ([value]) =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.fromInput({ location: value }))

      expect(actual).toStrictEqual(new _.CompletedForm({ location: value }))
    }),
  )

  it.effect('when it is empty', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.fromInput({ location: '' }))

      expect(actual).toStrictEqual(new _.EmptyForm())
    }),
  )

  it.effect('when it is missing', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.empty)

      expect(actual).toStrictEqual(new _.EmptyForm())
    }),
  )

  it.effect('when it is repeated', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(
        UrlParams.make([
          ['location', 'a'],
          ['location', 'b'],
        ]),
      )

      expect(actual).toStrictEqual(new _.EmptyForm())
    }),
  )
})

import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect } from 'effect'
import * as _ from '../../../../src/WebApp/MyDetails/LanguagesPage/LanguagesForm.ts'
import * as fc from '../../../fc.ts'

describe('fromBody', () => {
  it.effect.prop('when there is a value', [fc.nonEmptyString()], ([value]) =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.fromInput({ languages: value }))

      expect(actual).toStrictEqual(new _.CompletedForm({ languages: value }))
    }),
  )

  it.effect('when it is empty', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.fromInput({ languages: '' }))

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
          ['languages', 'a'],
          ['languages', 'b'],
        ]),
      )

      expect(actual).toStrictEqual(new _.EmptyForm())
    }),
  )
})

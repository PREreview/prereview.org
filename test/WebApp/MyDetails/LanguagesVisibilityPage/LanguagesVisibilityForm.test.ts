import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect } from 'effect'
import * as _ from '../../../../src/WebApp/MyDetails/LanguagesVisibilityPage/LanguagesVisibilityForm.ts'
import * as fc from '../../../fc.ts'

describe('fromBody', () => {
  it.effect.prop(
    'when the visibility is valid',
    [fc.constantFrom('public' as const, 'restricted' as const)],
    ([visibility]) =>
      Effect.gen(function* () {
        const actual = yield* _.fromBody(UrlParams.fromInput({ languagesVisibility: visibility }))

        expect(actual).toStrictEqual({ languagesVisibility: visibility })
      }),
  )

  it.effect.prop(
    'when the visibility is something else',
    [fc.string().filter(value => value !== 'public' && value !== 'restricted')],
    ([visibility]) =>
      Effect.gen(function* () {
        const actual = yield* _.fromBody(UrlParams.fromInput({ languagesVisibility: visibility }))

        expect(actual).toStrictEqual({ languagesVisibility: 'restricted' })
      }),
  )

  it.effect('when the visibility is missing', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.empty)

      expect(actual).toStrictEqual({ languagesVisibility: 'restricted' })
    }),
  )

  it.effect('when the visibility is repeated', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(
        UrlParams.make([
          ['languagesVisibility', 'public'],
          ['languagesVisibility', 'public'],
        ]),
      )

      expect(actual).toStrictEqual({ languagesVisibility: 'restricted' })
    }),
  )
})

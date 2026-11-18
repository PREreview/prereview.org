import { Effect } from 'effect'
import { UrlParams } from 'effect/http'
import * as _ from '../../../../src/WebApp/MyDetails/OpenForRequestsVisibilityPage/OpenForRequestsVisibilityForm.ts'
import * as fc from '../../../fc.ts'
import { describe, expect, it } from '../../../vitest.ts'

describe('fromBody', () => {
  it.effect.prop(
    'when the visibility is valid',
    [fc.constantFrom('public' as const, 'restricted' as const)],
    ([visibility]) =>
      Effect.gen(function* () {
        const actual = yield* _.fromBody(UrlParams.fromInput({ openForRequestsVisibility: visibility }))

        expect(actual).toStrictEqual({ openForRequestsVisibility: visibility })
      }),
  )

  it.effect.prop(
    'when the visibility is something else',
    [fc.string().filter(value => value !== 'public' && value !== 'restricted')],
    ([visibility]) =>
      Effect.gen(function* () {
        const actual = yield* _.fromBody(UrlParams.fromInput({ openForRequestsVisibility: visibility }))

        expect(actual).toStrictEqual({ openForRequestsVisibility: 'restricted' })
      }),
  )

  it.effect('when the visibility is missing', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.empty)

      expect(actual).toStrictEqual({ openForRequestsVisibility: 'restricted' })
    }),
  )

  it.effect('when the visibility is repeated', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(
        UrlParams.make([
          ['openForRequestsVisibility', 'public'],
          ['openForRequestsVisibility', 'public'],
        ]),
      )

      expect(actual).toStrictEqual({ openForRequestsVisibility: 'restricted' })
    }),
  )
})

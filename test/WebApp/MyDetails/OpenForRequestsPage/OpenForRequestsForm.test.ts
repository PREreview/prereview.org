import { Effect } from 'effect'
import { UrlParams } from 'effect/http'
import * as _ from '../../../../src/WebApp/MyDetails/OpenForRequestsPage/OpenForRequestsForm.ts'
import * as fc from '../../../fc.ts'
import { describe, expect, it } from '../../../vitest.ts'

describe('fromBody', () => {
  it.effect.prop('when there is an answer', [fc.constantFrom('yes' as const, 'no' as const)], ([openForRequests]) =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.fromInput({ openForRequests }))

      expect(actual).toStrictEqual(new _.CompletedForm({ openForRequests }))
    }),
  )

  it.effect.prop(
    'when it is something else',
    [fc.string().filter(value => value !== 'yes' && value !== 'no')],
    ([openForRequests]) =>
      Effect.gen(function* () {
        const actual = yield* _.fromBody(UrlParams.fromInput({ openForRequests }))

        expect(actual).toStrictEqual(new _.InvalidForm())
      }),
  )

  it.effect('when it is missing', () =>
    Effect.gen(function* () {
      const actual = yield* _.fromBody(UrlParams.empty)

      expect(actual).toStrictEqual(new _.InvalidForm())
    }),
  )
})

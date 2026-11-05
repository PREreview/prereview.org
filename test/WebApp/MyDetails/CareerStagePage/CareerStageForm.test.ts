import { UrlParams } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect } from 'effect'
import * as _ from '../../../../src/WebApp/MyDetails/CareerStagePage/CareerStageForm.ts'
import * as fc from '../../../fc.ts'

describe('fromBody', () => {
  it.effect.prop(
    'when there is a career stage',
    [fc.constantFrom('early' as const, 'mid' as const, 'late' as const, 'skip' as const)],
    ([careerStage]) =>
      Effect.gen(function* () {
        const actual = yield* _.fromBody(UrlParams.fromInput({ careerStage }))

        expect(actual).toStrictEqual(new _.CompletedForm({ careerStage }))
      }),
  )

  it.effect.prop(
    'when it is something else',
    [fc.string().filter(value => !['early', 'mid', 'late', 'skip'].includes(value))],
    ([careerStage]) =>
      Effect.gen(function* () {
        const actual = yield* _.fromBody(UrlParams.fromInput({ careerStage }))

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

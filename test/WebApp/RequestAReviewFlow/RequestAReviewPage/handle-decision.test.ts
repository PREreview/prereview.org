import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as _ from '../../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/handle-decision.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from './fc.ts'

describe('handleDecision', () => {
  test.prop([fc.preprintId(), fc.supportedLocale()])('with a BeginFlow decision', (preprint, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'BeginFlow', preprint })

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }),
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('with a ShowError decision', locale =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'ShowError' })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('with a ShowNotAPreprint decision', locale =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'ShowNotAPreprint' })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'with a ShowUnknownPreprint decision',
    (preprint, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.handleDecision({ _tag: 'ShowUnknownPreprint', preprint })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('with a ShowUnsupportedDoi decision', locale =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'ShowUnsupportedDoi' })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('with a ShowUnsupportedUrl decision', locale =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'ShowUnsupportedUrl' })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.invalidForm(), fc.supportedLocale()])('with an ShowFormWithErrors decision', (form, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'ShowFormWithErrors', form })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.RequestAReview,
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('with an ShowEmptyForm decision', locale =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'ShowEmptyForm' })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.RequestAReview,
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )
})

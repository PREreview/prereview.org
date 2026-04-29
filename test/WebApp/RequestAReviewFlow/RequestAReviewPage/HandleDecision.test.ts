import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as _ from '../../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/HandleDecision.ts'
import * as fc from './fc.ts'

describe('handleDecision', () => {
  it.effect.prop('with a BeginFlow decision', [fc.preprintId(), fc.supportedLocale()], ([preprint, locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.handleDecision({ _tag: 'BeginFlow', preprint })

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }),
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop('with a ShowError decision', [fc.supportedLocale()], ([locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop('with a ShowNotAPreprint decision', [fc.supportedLocale()], ([locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop(
    'with a ShowUnknownPreprint decision',
    [fc.indeterminatePreprintId(), fc.supportedLocale()],
    ([preprint, locale]) =>
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
      }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop('with a ShowUnsupportedDoi decision', [fc.supportedLocale()], ([locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop('with a ShowUnsupportedUrl decision', [fc.supportedLocale()], ([locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop('with an ShowFormWithErrors decision', [fc.invalidForm(), fc.supportedLocale()], ([form, locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop('with an ShowEmptyForm decision', [fc.supportedLocale()], ([locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )
})

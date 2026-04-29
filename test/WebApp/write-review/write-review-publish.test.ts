import { test } from '@fast-check/vitest'
import { Effect, Layer } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { merge } from 'ts-deepmerge'
import { describe, expect, vi } from 'vitest'
import { LanguageDetection } from '../../../src/ExternalInteractions/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { localeToIso6391 } from '../../../src/types/iso639.ts'
import type { AddToSessionEnv } from '../../../src/WebApp/session.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewPublish', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.completedForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'when the user needs to verify their email address',
    (preprintId, preprintTitle, method, newReview, user, locale, contactEmailAddress) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()
        const formStore = new Keyv()
        yield* Effect.promise(() =>
          formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
        )

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method, user })({
            addToSession: shouldNotBeCalled,
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            publishPrereview: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide([LanguageDetection.layerCld, Layer.mock(Personas.Personas, {})]), EffectTest.run),
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.completedForm(),
    fc.user(),
    fc.supportedLocale(),
  ])('when the user needs to enter an email address', (preprintId, preprintTitle, method, newReview, user, locale) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()
      const formStore = new Keyv()
      yield* Effect.promise(() =>
        formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
      )

      const actual = yield* Effect.promise(() =>
        _.writeReviewPublish({ id: preprintId, locale, method, user })({
          addToSession: shouldNotBeCalled,
          formStore,
          getContactEmailAddress: () => TE.left('not-found'),
          getPreprintTitle: () => TE.right(preprintTitle),
          publishPrereview: shouldNotBeCalled,
          runtime,
        })(),
      )

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
      })
    }).pipe(Effect.provide([LanguageDetection.layerCld, Layer.mock(Personas.Personas, {})]), EffectTest.run),
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.completedQuestionsForm(),
    fc.user(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
    fc.boolean(),
  ])(
    'when the form is complete with a questions-based review',
    (
      preprintId,
      preprintTitle,
      newReview,
      user,
      publicPersona,
      pseudonymPersona,
      locale,
      contactEmailAddress,
      reviewDoi,
      reviewId,
    ) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()
        const formStore = new Keyv()
        yield* Effect.promise(() =>
          formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
        )
        const publishPrereview = vi.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))
        const addToSession = vi.fn<AddToSessionEnv['addToSession']>(_ => TE.of(undefined))

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method: 'POST', user })({
            addToSession,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            publishPrereview,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            runtime,
          })(),
        )

        expect(publishPrereview).toHaveBeenCalledWith({
          conduct: 'yes',
          otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
          persona: newReview.persona === 'public' ? publicPersona : pseudonymPersona,
          preprint: preprintTitle,
          review: expect.anything(),
          language: localeToIso6391(locale),
          license: newReview.generativeAiIdeas === 'yes' ? 'CC0-1.0' : 'CC-BY-4.0',
          locale,
          structured: true,
          user: { orcidId: user.orcid, pseudonym: pseudonymPersona.pseudonym },
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewPublishedMatch.formatter, { id: preprintTitle.id }),
        })
        expect(addToSession).toHaveBeenCalledWith('published-review', {
          doi: reviewDoi,
          form: CompletedFormC.encode(newReview) as never,
          id: reviewId,
        })
        expect(yield* Effect.promise(() => formStore.has(formKey(user.orcid, preprintTitle.id)))).toBe(false)
      }).pipe(
        Effect.provide([
          LanguageDetection.layerCld,
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ]),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.completedFreeformForm(),
    fc.user(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
    fc.boolean(),
  ])(
    'when the form is complete with a freeform review',
    (
      preprintId,
      preprintTitle,
      newReview,
      user,
      publicPersona,
      pseudonymPersona,
      locale,
      contactEmailAddress,
      reviewDoi,
      reviewId,
    ) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))
        const publishPrereview = vi.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))
        const addToSession = vi.fn<AddToSessionEnv['addToSession']>(_ => TE.of(undefined))

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method: 'POST', user })({
            addToSession,
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            publishPrereview,
            runtime,
          })(),
        )

        expect(publishPrereview).toHaveBeenCalledWith({
          conduct: 'yes',
          otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
          persona: newReview.persona === 'public' ? publicPersona : pseudonymPersona,
          preprint: preprintTitle,
          review: expect.htmlContaining(newReview.review) as never,
          language: expect.anything(),
          license: newReview.generativeAiIdeas === 'yes' ? 'CC0-1.0' : 'CC-BY-4.0',
          locale,
          structured: false,
          user: { orcidId: user.orcid, pseudonym: pseudonymPersona.pseudonym },
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewPublishedMatch.formatter, { id: preprintTitle.id }),
        })
        expect(addToSession).toHaveBeenCalledWith('published-review', {
          doi: reviewDoi,
          form: FormC.encode(CompletedFormC.encode(newReview)),
          id: reviewId,
        })
        expect(yield* Effect.promise(() => formStore.has(formKey(user.orcid, preprintTitle.id)))).toBe(false)
      }).pipe(
        Effect.provide([
          LanguageDetection.layerCld,
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ]),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.incompleteForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
  ])(
    'when the form is incomplete',
    (preprintId, preprintTitle, method, newPrereview, user, locale, contactEmailAddress) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newPrereview)))

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method, user })({
            addToSession: shouldNotBeCalled,
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            formStore,
            publishPrereview: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      }).pipe(Effect.provide([LanguageDetection.layerCld, Layer.mock(Personas.Personas, {})]), EffectTest.run),
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when there is no form',
    (preprintId, preprintTitle, method, user, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method, user })({
            addToSession: shouldNotBeCalled,
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            formStore: new Keyv(),
            publishPrereview: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide([LanguageDetection.layerCld, Layer.mock(Personas.Personas, {})]), EffectTest.run),
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    (preprintId, method, user, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method, user })({
            addToSession: shouldNotBeCalled,
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
            publishPrereview: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide([LanguageDetection.layerCld, Layer.mock(Personas.Personas, {})]), EffectTest.run),
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    (preprintId, method, user, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method, user })({
            addToSession: shouldNotBeCalled,
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
            publishPrereview: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(Effect.provide([LanguageDetection.layerCld, Layer.mock(Personas.Personas, {})]), EffectTest.run),
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    (preprintId, preprintTitle, method, locale) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method, user: undefined })({
            addToSession: shouldNotBeCalled,
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            formStore: new Keyv(),
            publishPrereview: shouldNotBeCalled,
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }).pipe(Effect.provide([LanguageDetection.layerCld, Layer.mock(Personas.Personas, {})]), EffectTest.run),
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .tuple(fc.incompleteForm(), fc.completedForm().map(CompletedFormC.encode))
      .map(parts => merge.withOptions({ mergeArrays: false }, ...parts)),
    fc.user(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
  ])(
    'when the PREreview cannot be published',
    (preprintId, preprintTitle, newReview, user, publicPersona, pseudonymPersona, locale, contactEmailAddress) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<LanguageDetection.LanguageDetection | Personas.Personas>()
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(() =>
          _.writeReviewPublish({ id: preprintId, locale, method: 'POST', user })({
            addToSession: shouldNotBeCalled,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            formStore,
            publishPrereview: () => TE.left('unavailable'),
            runtime,
          })(),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toStrictEqual(
          FormC.encode(newReview),
        )
      }).pipe(
        Effect.provide([
          LanguageDetection.layerCld,
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ]),
        EffectTest.run,
      ),
  )
})

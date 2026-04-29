import { it } from '@effect/vitest'
import { Effect, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { describe, expect } from 'vitest'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewPublishMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewPersona', () => {
  it.effect.prop(
    'when the form is completed',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.personaType().map(persona => Tuple.make(persona, { persona })),
      fc.user(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
      fc.supportedLocale(),
      fc.completedForm(),
    ],
    ([preprintId, preprintTitle, [persona, body], user, publicPersona, pseudonymPersona, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() =>
          formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview))),
        )

        const actual = yield* Effect.promise(
          _.writeReviewPersona({ body, locale, method: 'POST', id: preprintId, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: () => TE.right(publicPersona),
            getPseudonymPersona: () => TE.right(pseudonymPersona),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          persona,
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when the form is incomplete',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.personaType().map(persona => Tuple.make(persona, { persona })),
      fc.user(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
      fc.supportedLocale(),
      fc.incompleteForm(),
    ],
    ([preprintId, preprintTitle, [persona, body], user, publicPersona, pseudonymPersona, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewPersona({ body, locale, method: 'POST', id: preprintId, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: () => TE.right(publicPersona),
            getPseudonymPersona: () => TE.right(pseudonymPersona),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprintTitle.id)))).toMatchObject({
          persona,
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPersona({ body, locale, method, id: preprintId, user })({
            formStore: new Keyv(),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            getPseudonymPersona: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPersona({ body, locale, method, id: preprintId, user })({
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
            getPublicPersona: shouldNotBeCalled,
            getPseudonymPersona: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPersona({ body, locale, method, id: preprintId, user })({
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
            getPublicPersona: shouldNotBeCalled,
            getPseudonymPersona: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewPersona({ body, locale, method, id: preprintId, user: undefined })({
            formStore: new Keyv(),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            getPseudonymPersona: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'without a persona',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ persona: fc.string() }, { requiredKeys: [] }),
      fc.user(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
      fc.supportedLocale(),
      fc.form(),
    ],
    ([preprintId, preprintTitle, body, user, publicPersona, pseudonymPersona, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewPersona({ body, locale, method: 'POST', id: preprintId, user })({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: () => TE.right(publicPersona),
            getPseudonymPersona: () => TE.right(pseudonymPersona),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }),
  )
})

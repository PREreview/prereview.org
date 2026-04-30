import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { merge } from 'ts-deepmerge'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { CompletedFormC } from '../../../src/WebApp/write-review/completed-form.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewReviewType', () => {
  it.effect.prop(
    'can view the form',
    [
      fc.indeterminatePreprintId(),
      fc.preprint(),
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc.supportedLocale(),
      fc.option(fc.form(), { nil: undefined }),
    ],
    ([preprintId, preprint, body, method, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        if (newReview) {
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))
        }

        const actual = yield* Effect.promise(
          _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
            formStore,
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the form is completed',
    [
      fc.indeterminatePreprintId(),
      fc.preprint(),
      fc.reviewType(),
      fc.user(),
      fc.supportedLocale(),
      fc
        .tuple(
          fc.completedFreeformForm().map(CompletedFormC.encode),
          fc.completedQuestionsForm().map(CompletedFormC.encode),
        )
        .map(parts => merge.withOptions({ mergeArrays: false }, ...parts)),
    ],
    ([preprintId, preprint, reviewType, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReviewType({
            id: preprintId,
            locale,
            user,
            body: { reviewType },
            method: 'POST',
          })({
            formStore,
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprint.id)))).toMatchObject({
          reviewType,
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewPublishMatch.formatter, { id: preprint.id }),
        })
      }),
  )

  it.effect.prop(
    'when the form is incomplete',
    [
      fc.indeterminatePreprintId(),
      fc.preprint(),
      fc.reviewType(),
      fc.user(),
      fc.supportedLocale(),
      fc.incompleteForm(),
    ],
    ([preprintId, preprint, reviewType, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReviewType({
            id: preprintId,
            locale,
            user,
            body: { reviewType },
            method: 'POST',
          })({
            formStore,
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(yield* Effect.promise(() => formStore.get(formKey(user.orcid, preprint.id)))).toMatchObject({
          reviewType,
        })
        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprint.id })}/`),
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprint(), fc.reviewType(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprint, reviewType, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewReviewType({
            id: preprintId,
            locale,
            user,
            body: { reviewType },
            method: 'POST',
          })({
            formStore: new Keyv(),
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprint.id })}/`),
        })
      }),
  )

  it.effect.prop(
    'the user is an author',
    [
      fc.indeterminatePreprintId(),
      fc
        .user()
        .chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.preprint({ authors: fc.tuple(fc.record({ name: fc.string(), orcid: fc.constant(user.orcid) })) }),
          ),
        ),
      fc.supportedLocale(),
      fc.anything(),
      fc.string(),
      fc.option(fc.form(), { nil: undefined }),
    ],
    ([preprintId, [user, preprint], locale, body, method, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        if (newReview) {
          yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))
        }

        const actual = yield* Effect.promise(
          _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
            formStore: new Keyv(),
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
          status: StatusCodes.Forbidden,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
            formStore: new Keyv(),
            getPreprint: () => TE.left(new PreprintIsUnavailable({})),
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
          _.writeReviewReviewType({ id: preprintId, locale, user, body, method })({
            formStore: new Keyv(),
            getPreprint: () => TE.left(new PreprintIsNotFound({})),
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
    'without saying how you would like to write your PREreview',
    [
      fc.indeterminatePreprintId(),
      fc.preprint(),
      fc.record({ reviewType: fc.lorem() }, { requiredKeys: [] }),
      fc.user(),
      fc.supportedLocale(),
      fc.form(),
    ],
    ([preprintId, preprint, body, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewReviewType({ id: preprintId, locale, user, body, method: 'POST' })({
            formStore,
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprint(), fc.anything(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprint, body, method, locale]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()

        const actual = yield* Effect.promise(
          _.writeReviewReviewType({ id: preprintId, locale, user: undefined, body, method })({
            formStore,
            getPreprint: () => TE.right(preprint),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(writeReviewMatch.formatter, { id: preprint.id }),
        })
      }),
  )
})

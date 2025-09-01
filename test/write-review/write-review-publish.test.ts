import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { merge } from 'ts-deepmerge'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../src/routes.js'
import type { AddToSessionEnv } from '../../src/session.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { localeToIso6391 } from '../../src/types/iso639.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

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
    async (preprintId, preprintTitle, method, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewPublish({ id: preprintId, locale, method, user })({
        addToSession: shouldNotBeCalled,
        formStore,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        publishPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.completedForm(),
    fc.user(),
    fc.supportedLocale(),
  ])(
    'when the user needs to enter an email address',
    async (preprintId, preprintTitle, method, newReview, user, locale) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewPublish({ id: preprintId, locale, method, user })({
        addToSession: shouldNotBeCalled,
        formStore,
        getContactEmailAddress: () => TE.left('not-found'),
        getPreprintTitle: () => TE.right(preprintTitle),
        publishPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.completedQuestionsForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
    fc.boolean(),
  ])(
    'when the form is complete with a questions-based review',
    async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, reviewDoi, reviewId) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))
      const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))
      const addToSession = jest.fn<AddToSessionEnv['addToSession']>(_ => TE.of(undefined))

      const actual = await _.writeReviewPublish({ id: preprintId, locale, method: 'POST', user })({
        addToSession,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        publishPrereview,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
      })()

      expect(publishPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
        persona: newReview.persona,
        preprint: preprintTitle,
        review: expect.anything(),
        language: localeToIso6391(locale),
        license: 'CC-BY-4.0',
        locale,
        structured: true,
        user,
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
      expect(await formStore.has(formKey(user.orcid, preprintTitle.id))).toBe(false)
    },
  )
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.completedFreeformForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
    fc.boolean(),
  ])(
    'when the form is complete with a freeform review',
    async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, reviewDoi, reviewId) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))
      const addToSession = jest.fn<AddToSessionEnv['addToSession']>(_ => TE.of(undefined))

      const actual = await _.writeReviewPublish({ id: preprintId, locale, method: 'POST', user })({
        addToSession,
        formStore,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        publishPrereview,
      })()

      expect(publishPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
        persona: newReview.persona,
        preprint: preprintTitle,
        review: expect.htmlContaining(newReview.review) as never,
        language: expect.anything(),
        license: 'CC-BY-4.0',
        locale,
        structured: false,
        user,
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
      expect(await formStore.has(formKey(user.orcid, preprintTitle.id))).toBe(false)
    },
  )

  describe('the form is complete and generative AI was used', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.completedForm({ generativeAiIdeas: fc.constant('yes') }),
      fc.user(),
      fc.supportedLocale(),
      fc.verifiedContactEmailAddress(),
      fc.doi(),
      fc.integer(),
      fc.boolean(),
    ])(
      'when the feature flag is enabled',
      async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, reviewDoi, reviewId) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))
        const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ =>
          TE.right([reviewDoi, reviewId]),
        )

        await _.writeReviewPublish({ aiReviewsAsCc0: true, id: preprintId, locale, method: 'POST', user })({
          addToSession: () => TE.of(undefined),
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          publishPrereview,
        })()

        expect(publishPrereview).toHaveBeenCalledWith(expect.objectContaining({ license: 'CC0-1.0' }))
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.completedForm({ generativeAiIdeas: fc.constant('yes') }),
      fc.user(),
      fc.supportedLocale(),
      fc.verifiedContactEmailAddress(),
      fc.doi(),
      fc.integer(),
      fc.boolean(),
    ])(
      'when the feature flag is not enabled',
      async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress, reviewDoi, reviewId) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))
        const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ =>
          TE.right([reviewDoi, reviewId]),
        )

        await _.writeReviewPublish({ aiReviewsAsCc0: false, id: preprintId, locale, method: 'POST', user })({
          addToSession: () => TE.of(undefined),
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          publishPrereview,
        })()

        expect(publishPrereview).toHaveBeenCalledWith(expect.objectContaining({ license: 'CC-BY-4.0' }))
      },
    )
  })

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
    async (preprintId, preprintTitle, method, newPrereview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newPrereview))

      const actual = await _.writeReviewPublish({ id: preprintId, locale, method, user })({
        addToSession: shouldNotBeCalled,
        getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        formStore,
        publishPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when there is no form',
    async (preprintId, preprintTitle, method, user, locale) => {
      const actual = await _.writeReviewPublish({ id: preprintId, locale, method, user })({
        addToSession: shouldNotBeCalled,
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        formStore: new Keyv(),
        publishPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, method, user, locale) => {
      const actual = await _.writeReviewPublish({ id: preprintId, locale, method, user })({
        addToSession: shouldNotBeCalled,
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
        publishPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (preprintId, method, user, locale) => {
      const actual = await _.writeReviewPublish({ id: preprintId, locale, method, user })({
        addToSession: shouldNotBeCalled,
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
        publishPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, method, locale) => {
      const actual = await _.writeReviewPublish({ id: preprintId, locale, method, user: undefined })({
        addToSession: shouldNotBeCalled,
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        formStore: new Keyv(),
        publishPrereview: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .tuple(fc.incompleteForm(), fc.completedForm().map(CompletedFormC.encode))
      .map(parts => merge.withOptions({ mergeArrays: false }, ...parts)),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
  ])(
    'when the PREreview cannot be published',
    async (preprintId, preprintTitle, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewPublish({ id: preprintId, locale, method: 'POST', user })({
        addToSession: shouldNotBeCalled,
        getContactEmailAddress: () => TE.right(contactEmailAddress),
        getPreprintTitle: () => TE.right(preprintTitle),
        formStore,
        publishPrereview: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toStrictEqual(FormC.encode(newReview))
    },
  )
})

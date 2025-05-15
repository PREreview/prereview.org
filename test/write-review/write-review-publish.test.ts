import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import { merge } from 'ts-deepmerge'
import type { TemplatePageEnv } from '../../src/page.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../src/routes.js'
import type { AddToSessionEnv } from '../../src/session.js'
import { localeToIso6391 } from '../../src/types/iso639.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewPublish', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.completedForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'when the user needs to verify their email address',
    async (preprintId, preprintTitle, connection, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.completedForm(),
    fc.user(),
    fc.supportedLocale(),
  ])(
    'when the user needs to enter an email address',
    async (preprintId, preprintTitle, connection, newReview, user, locale) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          formStore,
          getContactEmailAddress: () => TE.left('not-found'),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ method: fc.constant('POST') }),
    fc.completedQuestionsForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
    fc.boolean(),
  ])(
    'when the form is complete with a questions-based review',
    async (
      preprintId,
      preprintTitle,
      connection,
      newReview,
      user,
      locale,
      contactEmailAddress,
      reviewDoi,
      reviewId,
    ) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))
      const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))
      const addToSession = jest.fn<AddToSessionEnv['addToSession']>(_ => TE.of(undefined))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(publishPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
        persona: newReview.persona,
        preprint: preprintTitle,
        review: expect.anything(),
        language: localeToIso6391(locale),
        locale,
        structured: true,
        user,
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewPublishedMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(addToSession).toHaveBeenCalledWith('published-review', {
        doi: reviewDoi,
        form: CompletedFormC.encode(newReview),
        id: reviewId,
      })
      expect(await formStore.has(formKey(user.orcid, preprintTitle.id))).toBe(false)
    },
  )
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ method: fc.constant('POST') }),
    fc.completedFreeformForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
    fc.boolean(),
  ])(
    'when the form is complete with a freeform review',
    async (
      preprintId,
      preprintTitle,
      connection,
      newReview,
      user,
      locale,
      contactEmailAddress,
      reviewDoi,
      reviewId,
    ) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))
      const addToSession = jest.fn<AddToSessionEnv['addToSession']>(_ => TE.of(undefined))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession,
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(publishPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
        persona: newReview.persona,
        preprint: preprintTitle,
        review: expect.stringContaining(newReview.review.toString()),
        language: expect.anything(),
        locale,
        structured: false,
        user,
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewPublishedMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(addToSession).toHaveBeenCalledWith('published-review', {
        doi: reviewDoi,
        form: FormC.encode(CompletedFormC.encode(newReview)),
        id: reviewId,
      })
      expect(await formStore.has(formKey(user.orcid, preprintTitle.id))).toBe(false)
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.incompleteForm(),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
  ])(
    'when the form is incomplete',
    async (preprintId, preprintTitle, connection, newPrereview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newPrereview))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          formStore,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user(), fc.supportedLocale()])(
    'when there is no form',
    async (preprintId, preprintTitle, connection, user, locale) => {
      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          formStore: new Keyv(),
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.supportedLocale(), fc.html()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user, locale, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.supportedLocale(), fc.html()])(
    'when the preprint cannot be found',
    async (preprintId, connection, user, locale, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, locale) => {
      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          getUserOnboarding: shouldNotBeCalled,
          formStore: new Keyv(),
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ method: fc.constant('POST') }),
    fc
      .tuple(fc.incompleteForm(), fc.completedForm().map(CompletedFormC.encode))
      .map(parts => merge.withOptions({ mergeArrays: false }, ...parts)),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
    fc.html(),
  ])(
    'when the PREreview cannot be published',
    async (preprintId, preprintTitle, connection, newReview, user, locale, contactEmailAddress, page) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          addToSession: shouldNotBeCalled,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.left('unavailable'),
          formStore,
          locale,
          publicUrl: new URL('http://example.com'),
          publishPrereview: () => TE.left('unavailable'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toStrictEqual(FormC.encode(newReview))
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main']],
        js: [],
        type: 'streamline',
        locale,
        user,
      })
    },
  )
})

import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import type { TemplatePageEnv } from '../../src/page.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewDataPresentation', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.dataPresentation(), fc.dataPresentationDetails()).chain(([dataPresentation, dataPresentationDetails]) =>
      fc.tuple(
        fc.constant(dataPresentation),
        fc.constant(dataPresentationDetails),
        fc.connection({
          body: fc.constant({
            dataPresentation,
            dataPresentationInappropriateUnclearDetails: dataPresentationDetails['inappropriate-unclear'],
            dataPresentationSomewhatInappropriateUnclearDetails:
              dataPresentationDetails['somewhat-inappropriate-unclear'],
            dataPresentationNeutralDetails: dataPresentationDetails.neutral,
            dataPresentationMostlyAppropriateClearDetails: dataPresentationDetails['mostly-appropriate-clear'],
            dataPresentationHighlyAppropriateClearDetails: dataPresentationDetails['highly-appropriate-clear'],
          }),
          method: fc.constant('POST'),
        }),
      ),
    ),
    fc.user(),
    fc.supportedLocale(),
    fc.completedQuestionsForm(),
  ])(
    'when the form is completed',
    async (
      preprintId,
      preprintTitle,
      [dataPresentation, dataPresentationDetails, connection],
      user,
      locale,
      newReview,
    ) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await runMiddleware(
        _.writeReviewDataPresentation(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        dataPresentation,
        dataPresentationDetails,
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.dataPresentation(), fc.dataPresentationDetails()).chain(([dataPresentation, dataPresentationDetails]) =>
      fc.tuple(
        fc.constant(dataPresentation),
        fc.constant(dataPresentationDetails),
        fc.connection({
          body: fc.constant({
            dataPresentation,
            dataPresentationInappropriateUnclearDetails: dataPresentationDetails['inappropriate-unclear'],
            dataPresentationSomewhatInappropriateUnclearDetails:
              dataPresentationDetails['somewhat-inappropriate-unclear'],
            dataPresentationNeutralDetails: dataPresentationDetails.neutral,
            dataPresentationMostlyAppropriateClearDetails: dataPresentationDetails['mostly-appropriate-clear'],
            dataPresentationHighlyAppropriateClearDetails: dataPresentationDetails['highly-appropriate-clear'],
          }),
          method: fc.constant('POST'),
        }),
      ),
    ),
    fc.user(),
    fc.supportedLocale(),
    fc.incompleteQuestionsForm(),
  ])(
    'when the form is incomplete',
    async (
      preprintId,
      preprintTitle,
      [dataPresentation, dataPresentationDetails, connection],
      user,
      locale,
      newReview,
    ) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewDataPresentation(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        dataPresentation,
        dataPresentationDetails,
      })
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
        _.writeReviewDataPresentation(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
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
        _.writeReviewDataPresentation(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
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
        _.writeReviewDataPresentation(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({
      body: fc.record({ dataPresentation: fc.lorem() }, { requiredKeys: [] }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.supportedLocale(),
    fc.questionsForm(),
    fc.html(),
  ])(
    'without saying if the data presentations are well-suited',
    async (preprintId, preprintTitle, connection, user, locale, newReview, page) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewDataPresentation(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.left('unavailable'),
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#form']],
        js: ['conditional-inputs.js', 'error-summary.js'],
        type: 'streamline',
        locale,
        user,
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.user(),
    fc.supportedLocale(),
    fc.oneof(fc.freeformForm(), fc.constant({})),
  ])(
    "when you haven't said you want to answer questions",
    async (preprintId, preprintTitle, connection, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewDataPresentation(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
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
            value: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, locale) => {
      const formStore = new Keyv()

      const actual = await runMiddleware(
        _.writeReviewDataPresentation(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
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
})

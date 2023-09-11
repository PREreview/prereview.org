import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { CompletedFormC } from '../../src/write-review/completed-form'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReviewDataPresentation', () => {
  describe('when reviews can be rapid', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .tuple(fc.dataPresentation(), fc.dataPresentationDetails())
        .chain(([dataPresentation, dataPresentationDetails]) =>
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
      fc.completedQuestionsForm(),
    ])(
      'when the form is completed',
      async (preprintId, preprintTitle, [dataPresentation, dataPresentationDetails, connection], user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

        const actual = await runMiddleware(
          _.writeReviewDataPresentation(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
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
      fc
        .tuple(fc.dataPresentation(), fc.dataPresentationDetails())
        .chain(([dataPresentation, dataPresentationDetails]) =>
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
      fc.incompleteQuestionsForm(),
    ])(
      'when the form is incomplete',
      async (preprintId, preprintTitle, [dataPresentation, dataPresentationDetails, connection], user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewDataPresentation(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
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

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
      'when there is no form',
      async (preprintId, preprintTitle, connection, user) => {
        const actual = await runMiddleware(
          _.writeReviewDataPresentation(preprintId)({
            canRapidReview: () => true,
            formStore: new Keyv(),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
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

    test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
      'when the preprint cannot be loaded',
      async (preprintId, connection, user) => {
        const actual = await runMiddleware(
          _.writeReviewDataPresentation(preprintId)({
            canRapidReview: () => true,
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left('unavailable'),
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.ServiceUnavailable },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
      'when the preprint cannot be found',
      async (preprintId, connection, user) => {
        const actual = await runMiddleware(
          _.writeReviewDataPresentation(preprintId)({
            canRapidReview: () => true,
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left('not-found'),
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.NotFound },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection({
        body: fc.record({ dataPresentation: fc.lorem() }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.questionsForm(),
    ])(
      'without saying if the data presentations are well-suited',
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewDataPresentation(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.BadRequest },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.user(),
      fc.oneof(fc.freeformForm(), fc.constant({})),
    ])(
      "when you haven't said you want to answer questions",
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewDataPresentation(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
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
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.boolean()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, canRapidReview) => {
      const formStore = new Keyv()

      const actual = await runMiddleware(
        _.writeReviewDataPresentation(preprintId)({
          canRapidReview: () => canRapidReview,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user(), fc.form()])(
    "when reviews can't be rapid",
    async (preprintId, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewDataPresentation(preprintId)({
          canRapidReview: () => false,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )
})

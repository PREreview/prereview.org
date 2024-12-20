import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import { rawHtml } from '../../src/html.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewCompetingInterests', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .oneof(
        fc.constant({ competingInterests: 'no' }),
        fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.lorem() }),
      )
      .chain(competingInterests =>
        fc.tuple(
          fc.constant(competingInterests),
          fc.connection({
            body: fc.constant(competingInterests),
            method: fc.constant('POST'),
          }),
        ),
      ),
    fc.user(),
    fc.completedForm(),
  ])(
    'when the form is completed',
    async (preprintId, preprintTitle, [competingInterests, connection], user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(competingInterests)
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
      .oneof(
        fc.constant({ competingInterests: 'no' }),
        fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.lorem() }),
      )
      .chain(competingInterests =>
        fc.tuple(
          fc.constant(competingInterests),
          fc.connection({
            body: fc.constant(competingInterests),
            method: fc.constant('POST'),
          }),
        ),
      ),
    fc.user(),
    fc.incompleteForm(),
  ])(
    'when the form is incomplete',
    async (preprintId, preprintTitle, [competingInterests, connection], user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(competingInterests)
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
        _.writeReviewCompetingInterests(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.html()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left('unavailable'),
          getUser: () => M.of(user),
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
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.html()])(
    'when the preprint cannot be found',
    async (preprintId, connection, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.of(user),
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
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection) => {
      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
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
    fc.connection({
      body: fc.oneof(
        fc.record({ competingInterests: fc.string() }, { withDeletedKeys: true }),
        fc.record(
          { competingInterests: fc.constant('yes'), competingInterestsDetails: fc.constant('') },
          { withDeletedKeys: true },
        ),
      ),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.form(),
    fc.html(),
  ])(
    'without declaring any competing interests',
    async (preprintId, preprintTitle, connection, user, newReview, page) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[rawHtml('Skip to form'), '#form']],
        js: ['conditional-inputs.js', 'error-summary.js'],
        type: 'streamline',
        user,
      })
    },
  )
})

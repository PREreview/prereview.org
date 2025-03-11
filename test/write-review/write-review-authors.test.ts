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
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewAddAuthorsMatch, writeReviewMatch, writeReviewPublishMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewAuthors', () => {
  describe('when there are more authors', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection({
        body: fc.constant({ moreAuthors: 'yes', moreAuthorsApproved: 'yes' }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.form(),
      fc.boolean(),
    ])(
      'when they have read and agreed',
      async (preprintId, preprintTitle, connection, user, newReview, mustDeclareUseOfAi) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintId)({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            mustDeclareUseOfAi,
            templatePage: shouldNotBeCalled,
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
          moreAuthors: 'yes',
          moreAuthorsApproved: 'yes',
          otherAuthors: newReview.otherAuthors ?? [],
        })
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            {
              type: 'setHeader',
              name: 'Location',
              value: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
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
        body: fc.record(
          { moreAuthors: fc.constant('yes'), moreAuthorsApproved: fc.string() },
          { requiredKeys: ['moreAuthors'] },
        ),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.form(),
      fc.html(),
      fc.boolean(),
    ])(
      "when they haven't read and agreed",
      async (preprintId, preprintTitle, connection, user, newReview, page, mustDeclareUseOfAi) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintId)({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            mustDeclareUseOfAi,
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

    describe("when they don't want to be listed", () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.connection({
          body: fc.record(
            { moreAuthors: fc.constantFrom('yes-private'), moreAuthorsApproved: fc.moreAuthorsApproved() },
            { requiredKeys: ['moreAuthors'] },
          ),
          method: fc.constant('POST'),
        }),
        fc.user(),
        fc.completedForm(),
        fc.boolean(),
      ])(
        'when the form is completed',
        async (preprintId, preprintTitle, connection, user, newReview, mustDeclareUseOfAi) => {
          const formStore = new Keyv()
          await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

          const actual = await runMiddleware(
            _.writeReviewAuthors(preprintId)({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
              getUser: () => M.of(user),
              mustDeclareUseOfAi,
              templatePage: shouldNotBeCalled,
            }),
            connection,
          )()

          expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
            moreAuthors: 'yes-private',
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
        fc.connection({
          body: fc.record(
            { moreAuthors: fc.constant('yes-private'), moreAuthorsApproved: fc.moreAuthorsApproved() },
            { requiredKeys: ['moreAuthors'] },
          ),
          method: fc.constant('POST'),
        }),
        fc.user(),
        fc.incompleteForm(),
        fc.boolean(),
      ])(
        'when the form is incomplete',
        async (preprintId, preprintTitle, connection, user, newReview, mustDeclareUseOfAi) => {
          const formStore = new Keyv()
          await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

          const actual = await runMiddleware(
            _.writeReviewAuthors(preprintId)({
              formStore,
              getPreprintTitle: () => TE.right(preprintTitle),
              getUser: () => M.of(user),
              mustDeclareUseOfAi,
              templatePage: shouldNotBeCalled,
            }),
            connection,
          )()

          expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
            moreAuthors: 'yes-private',
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
    })
  })

  describe("when there aren't more authors", () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection({
        body: fc.record(
          { moreAuthors: fc.constantFrom('no'), moreAuthorsApproved: fc.moreAuthorsApproved() },
          { requiredKeys: ['moreAuthors'] },
        ),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.completedForm(),
      fc.boolean(),
    ])(
      'when the form is completed',
      async (preprintId, preprintTitle, connection, user, newReview, mustDeclareUseOfAi) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintId)({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            mustDeclareUseOfAi,
            templatePage: shouldNotBeCalled,
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ moreAuthors: 'no' })
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
      fc.connection({
        body: fc.record(
          { moreAuthors: fc.constant('no'), moreAuthorsApproved: fc.moreAuthorsApproved() },
          { requiredKeys: ['moreAuthors'] },
        ),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.incompleteForm(),
      fc.boolean(),
    ])(
      'when the form is incomplete',
      async (preprintId, preprintTitle, connection, user, newReview, mustDeclareUseOfAi) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintId)({
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            mustDeclareUseOfAi,
            templatePage: shouldNotBeCalled,
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ moreAuthors: 'no' })
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
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user(), fc.boolean()])(
    'when there is no form',
    async (preprintId, preprintTitle, connection, user, mustDeclareUseOfAi) => {
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          mustDeclareUseOfAi,
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.html(), fc.boolean()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user, page, mustDeclareUseOfAi) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
          getUser: () => M.of(user),
          mustDeclareUseOfAi,
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.html(), fc.boolean()])(
    'when the preprint cannot be found',
    async (preprintId, connection, user, page, mustDeclareUseOfAi) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
          getUser: () => M.of(user),
          mustDeclareUseOfAi,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.boolean()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, mustDeclareUseOfAi) => {
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          mustDeclareUseOfAi,
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
      body: fc.record(
        { moreAuthors: fc.string(), moreAuthorsApproved: fc.moreAuthorsApproved() },
        { requiredKeys: [] },
      ),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.form(),
    fc.html(),
    fc.boolean(),
  ])(
    'without a moreAuthors',
    async (preprintId, preprintTitle, connection, user, newReview, page, mustDeclareUseOfAi) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          mustDeclareUseOfAi,
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

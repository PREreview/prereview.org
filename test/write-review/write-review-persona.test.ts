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
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewPersona', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .persona()
      .chain(persona =>
        fc.tuple(fc.constant(persona), fc.connection({ body: fc.constant({ persona }), method: fc.constant('POST') })),
      ),
    fc.user(),
    fc.completedForm(),
  ])('when the form is completed', async (preprintId, preprintTitle, [persona, connection], user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintId)({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        getUser: () => M.of(user),
        templatePage: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ persona })
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .persona()
      .chain(persona =>
        fc.tuple(fc.constant(persona), fc.connection({ body: fc.constant({ persona }), method: fc.constant('POST') })),
      ),
    fc.user(),
    fc.incompleteForm(),
  ])('when the form is incomplete', async (preprintId, preprintTitle, [persona, connection], user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintId)({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        getUser: () => M.of(user),
        templatePage: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ persona })
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
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
    'when there is no form',
    async (preprintId, preprintTitle, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewPersona(preprintId)({
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
        _.writeReviewPersona(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
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
        _.writeReviewPersona(preprintId)({
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
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
        _.writeReviewPersona(preprintId)({
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
      body: fc.record({ persona: fc.string() }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.form(),
    fc.html(),
  ])('without a persona', async (preprintId, preprintTitle, connection, user, newReview, page) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintId)({
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
      js: ['error-summary.js'],
      type: 'streamline',
      user,
    })
  })
})

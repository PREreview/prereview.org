import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewMatch } from '../../src/routes.js'
import type { PopFromSessionEnv } from '../../src/session.js'
import * as _ from '../../src/write-review/index.js'
import { PublishedReviewC } from '../../src/write-review/published-review.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewPublished', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.origin(),
    fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
    fc.user(),
    fc.supportedLocale(),
    fc.html(),
  ])(
    'when the form is complete',
    async (preprintId, preprintTitle, connection, publicUrl, publishedReview, user, locale, page) => {
      const popFromSession = jest.fn<PopFromSessionEnv['popFromSession']>(_ =>
        TE.of(PublishedReviewC.encode(publishedReview)),
      )
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          locale,
          popFromSession,
          publicUrl,
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(popFromSession).toHaveBeenCalledWith('published-review')
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
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
    fc.either(fc.constant('unavailable'), fc.json()),
    fc.user(),
    fc.supportedLocale(),
  ])(
    'when there is no published review',
    async (preprintId, preprintTitle, connection, publishedReview, user, locale) => {
      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          locale,
          popFromSession: () => TE.fromEither(publishedReview),
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.connection(),
    fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
    fc.user(),
    fc.supportedLocale(),
    fc.html(),
  ])('when the preprint cannot be loaded', async (preprintId, connection, publishedReview, user, locale, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.writeReviewPublished(preprintId)({
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
        getUser: () => M.of(user),
        locale,
        popFromSession: () => TE.right(PublishedReviewC.encode(publishedReview)),
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.connection(),
    fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
    fc.user(),
    fc.supportedLocale(),
    fc.html(),
  ])('when the preprint cannot be found', async (preprintId, connection, publishedReview, user, locale, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.writeReviewPublished(preprintId)({
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
        getUser: () => M.of(user),
        locale,
        popFromSession: () => TE.right(PublishedReviewC.encode(publishedReview)),
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
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, locale) => {
      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          locale,
          popFromSession: shouldNotBeCalled,
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

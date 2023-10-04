import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../src/review'
import { reviewMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('review', () => {
  test.prop([
    fc.origin(),
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.record({
      authors: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
      doi: fc.doi(),
      language: fc.option(fc.languageCode(), { nil: undefined }),
      license: fc.constant('CC-BY-4.0' as const),
      published: fc.plainDate(),
      preprint: fc.record({
        id: fc.preprintId(),
        language: fc.languageCode(),
        title: fc.html(),
        url: fc.url(),
      }),
      structured: fc.boolean(),
      text: fc.html(),
    }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the review can be loaded', async (publicUrl, id, connection, prereview, user) => {
    const getPrereview = jest.fn<_.GetPrereviewEnv['getPrereview']>(_ => TE.right(prereview))

    const actual = await runMiddleware(
      _.review(id)({ getPrereview, getUser: () => M.fromEither(user), publicUrl }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        {
          type: 'setHeader',
          name: 'Link',
          value: `<${publicUrl.href.slice(0, -1)}${format(reviewMatch.formatter, { id })}>; rel="canonical"`,
        },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(getPrereview).toHaveBeenCalledWith(id)
  })

  test.prop([
    fc.origin(),
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the review is not found', async (publicUrl, id, connection, user) => {
    const actual = await runMiddleware(
      _.review(id)({
        getPrereview: () => TE.left({ status: Status.NotFound }),
        getUser: () => M.fromEither(user),
        publicUrl,
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
  })

  test.prop([
    fc.origin(),
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the review was removed', async (publicUrl, id, connection, user) => {
    const actual = await runMiddleware(
      _.review(id)({
        getPrereview: () => TE.left('removed'),
        getUser: () => M.fromEither(user),
        publicUrl,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.Gone },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([
    fc.origin(),
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.anything(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the review cannot be loaded', async (publicUrl, id, connection, error, user) => {
    const actual = await runMiddleware(
      _.review(id)({ getPrereview: () => TE.left(error), getUser: () => M.fromEither(user), publicUrl }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})

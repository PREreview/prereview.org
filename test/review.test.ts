import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import * as _ from '../src/review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('review', () => {
  test.prop([
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
      text: fc.html(),
    }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the review can be loaded', async (id, connection, prereview, user) => {
    const getPrereview: Mock<_.GetPrereviewEnv['getPrereview']> = jest.fn(_ => TE.right(prereview))

    const actual = await runMiddleware(_.review(id)({ getPrereview, getUser: () => M.fromEither(user) }), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(getPrereview).toHaveBeenCalledWith(id)
  })

  test.prop([
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the review is not found', async (id, connection, user) => {
    const actual = await runMiddleware(
      _.review(id)({ getPrereview: () => TE.left({ status: Status.NotFound }), getUser: () => M.fromEither(user) }),
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
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.anything(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the review cannot be loaded', async (id, connection, error, user) => {
    const actual = await runMiddleware(
      _.review(id)({ getPrereview: () => TE.left(error), getUser: () => M.fromEither(user) }),
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

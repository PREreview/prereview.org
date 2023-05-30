import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/profile'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('profile', () => {
  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.string(),
    fc.nonEmptyArray(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the data can be loaded', async (connection, name, prereviews, user) => {
    const actual = await runMiddleware(
      _.profile({
        getName: () => TE.of(name),
        getPrereviews: () => TE.of(prereviews),
        getUser: () => M.fromEither(user),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.string(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when there are no PREreviews', async (connection, name, user) => {
    const actual = await runMiddleware(
      _.profile({
        getName: () => TE.of(name),
        getPrereviews: () => TE.left('not-found'),
        getUser: () => M.fromEither(user),
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
    fc.connection({ method: fc.requestMethod() }),
    fc.string(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])("when the PREreviews can't be loaded", async (connection, name, user) => {
    const actual = await runMiddleware(
      _.profile({
        getName: () => TE.of(name),
        getPrereviews: () => TE.left('unavailable'),
        getUser: () => M.fromEither(user),
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
  })

  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.nonEmptyArray(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])("when the name can't be found", async (connection, prereviews, user) => {
    const actual = await runMiddleware(
      _.profile({
        getName: () => TE.left('not-found'),
        getPrereviews: () => TE.of(prereviews),
        getUser: () => M.fromEither(user),
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
    fc.connection({ method: fc.requestMethod() }),
    fc.nonEmptyArray(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the name is unavailable', async (connection, prereviews, user) => {
    const actual = await runMiddleware(
      _.profile({
        getName: () => TE.left('unavailable'),
        getPrereviews: () => TE.of(prereviews),
        getUser: () => M.fromEither(user),
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
  })
})

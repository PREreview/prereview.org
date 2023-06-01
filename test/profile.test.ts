import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import * as _ from '../src/profile'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('profile', () => {
  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.orcid(),
    fc.string(),
    fc.array(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the data can be loaded', async (connection, orcid, name, prereviews, user) => {
    const getName: Mock<_.GetNameEnv['getName']> = jest.fn(_ => TE.of(name))
    const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.of(prereviews))

    const actual = await runMiddleware(
      _.profile(orcid)({
        getName,
        getPrereviews,
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
    expect(getName).toHaveBeenCalledWith(orcid)
    expect(getPrereviews).toHaveBeenCalledWith(orcid)
  })

  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.orcid(),
    fc.string(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])("when the PREreviews can't be loaded", async (connection, orcid, name, user) => {
    const actual = await runMiddleware(
      _.profile(orcid)({
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
    fc.orcid(),
    fc.array(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])("when the name can't be found", async (connection, orcid, prereviews, user) => {
    const actual = await runMiddleware(
      _.profile(orcid)({
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
    fc.orcid(),
    fc.array(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the name is unavailable', async (connection, orcid, prereviews, user) => {
    const actual = await runMiddleware(
      _.profile(orcid)({
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

describe('profilePseudonym', () => {
  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.pseudonym(),
    fc.array(
      fc.record({
        id: fc.integer(),
        reviewers: fc.nonEmptyArray(fc.string()),
        published: fc.plainDate(),
        preprint: fc.preprintTitle(),
      }),
    ),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the data can be loaded', async (connection, pseudonym, prereviews, user) => {
    const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.of(prereviews))

    const actual = await runMiddleware(
      _.profilePseudonym(pseudonym)({
        getPrereviews,
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
    expect(getPrereviews).toHaveBeenCalledWith(pseudonym)
  })

  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.pseudonym(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])("when the PREreviews can't be loaded", async (connection, pseudonym, user) => {
    const actual = await runMiddleware(
      _.profilePseudonym(pseudonym)({
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
})

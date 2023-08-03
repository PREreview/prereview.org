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
import { shouldNotBeCalled } from './should-not-be-called'

describe('profile', () => {
  describe('with an ORCID iD', () => {
    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.orcidProfileId(),
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
    ])('when the data can be loaded', async (connection, profile, name, prereviews, user) => {
      const getName: Mock<_.GetNameEnv['getName']> = jest.fn(_ => TE.of(name))
      const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.of(prereviews))

      const actual = await runMiddleware(
        _.profile(profile)({
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
      expect(getName).toHaveBeenCalledWith(profile.value)
      expect(getPrereviews).toHaveBeenCalledWith(profile)
    })

    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.orcidProfileId(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])("when the name can't be found", async (connection, profile, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
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
      fc.orcidProfileId(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the name is unavailable', async (connection, profile, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
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

  describe('with a pseudonym', () => {
    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.pseudonymProfileId(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the data can be loaded', async (connection, profile, prereviews, user) => {
      const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.of(prereviews))

      const actual = await runMiddleware(
        _.profile(profile)({
          getName: shouldNotBeCalled,
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
      expect(getPrereviews).toHaveBeenCalledWith(profile)
    })
  })

  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.profileId(),
    fc.string(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])("when the PREreviews can't be loaded", async (connection, profile, name, user) => {
    const actual = await runMiddleware(
      _.profile(profile)({
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
})

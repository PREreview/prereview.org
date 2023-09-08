import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import * as _ from '../src/profile'
import type { GetResearchInterestsEnv } from '../src/research-interests'
import type { GetSlackUserEnv } from '../src/slack-user'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('profile', () => {
  describe('with an ORCID iD', () => {
    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.orcidProfileId(),
      fc.url(),
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
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
    ])(
      'when the data can be loaded',
      async (connection, profile, avatar, name, prereviews, user, researchInterests, slackUser) => {
        const getAvatar: Mock<_.GetAvatarEnv['getAvatar']> = jest.fn(_ => TE.of(avatar))
        const getName: Mock<_.GetNameEnv['getName']> = jest.fn(_ => TE.of(name))
        const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.of(prereviews))
        const getResearchInterests: Mock<GetResearchInterestsEnv['getResearchInterests']> = jest.fn(_ =>
          TE.fromEither(researchInterests),
        )
        const getSlackUser: Mock<GetSlackUserEnv['getSlackUser']> = jest.fn(_ => TE.fromEither(slackUser))

        const actual = await runMiddleware(
          _.profile(profile)({
            getAvatar,
            getName,
            getPrereviews,
            getResearchInterests,
            getSlackUser,
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
        expect(getAvatar).toHaveBeenCalledWith(profile.value)
        expect(getName).toHaveBeenCalledWith(profile.value)
        expect(getPrereviews).toHaveBeenCalledWith(profile)
        expect(getResearchInterests).toHaveBeenCalledWith(profile.value)
        expect(getSlackUser).toHaveBeenCalledWith(profile.value)
      },
    )

    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.orcidProfileId(),
      fc.url(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])("when the name can't be found", async (connection, profile, avatar, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.of(avatar),
          getName: () => TE.left('not-found'),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
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
      fc.url(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the name is unavailable', async (connection, profile, avatar, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.of(avatar),
          getName: () => TE.left('unavailable'),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
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
    ])("when the avatar can't be found", async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
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
    ])('when the avatar is unavailable', async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('unavailable'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
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
    ])('when the research interests are unavailable', async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('unavailable'),
          getSlackUser: () => TE.left('not-found'),
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
    ])('when the Slack user is unavailable', async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('unavailable'),
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
          getAvatar: shouldNotBeCalled,
          getName: shouldNotBeCalled,
          getPrereviews,
          getResearchInterests: shouldNotBeCalled,
          getSlackUser: shouldNotBeCalled,
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
})

test.prop([
  fc.connection({ method: fc.requestMethod() }),
  fc.profileId(),
  fc.url(),
  fc.string(),
  fc.either(fc.constant('no-session' as const), fc.user()),
])("when the PREreviews can't be loaded", async (connection, profile, avatar, name, user) => {
  const actual = await runMiddleware(
    _.profile(profile)({
      getAvatar: () => TE.of(avatar),
      getName: () => TE.of(name),
      getPrereviews: () => TE.left('unavailable'),
      getResearchInterests: () => TE.left('not-found'),
      getSlackUser: () => TE.left('not-found'),
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

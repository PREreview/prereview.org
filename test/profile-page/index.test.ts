import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/profile-page'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('profile', () => {
  describe('with an ORCID iD', () => {
    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.orcidProfileId(),
      fc.url(),
      fc.nonEmptyString(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
    ])(
      'when the data can be loaded',
      async (
        connection,
        profile,
        avatar,
        name,
        prereviews,
        user,
        careerStage,
        researchInterests,
        location,
        languages,
        slackUser,
        openForRequests,
      ) => {
        const getAvatar = jest.fn<_.Env['getAvatar']>(_ => TE.of(avatar))
        const getName = jest.fn<_.Env['getName']>(_ => TE.of(name))
        const getPrereviews = jest.fn<_.Env['getPrereviews']>(_ => TE.of(prereviews))
        const getCareerStage = jest.fn<_.Env['getCareerStage']>(_ => TE.fromEither(careerStage))
        const getResearchInterests = jest.fn<_.Env['getResearchInterests']>(_ => TE.fromEither(researchInterests))
        const getLocation = jest.fn<_.Env['getLocation']>(_ => TE.fromEither(location))
        const getLanguages = jest.fn<_.Env['getLanguages']>(_ => TE.fromEither(languages))
        const getSlackUser = jest.fn<_.Env['getSlackUser']>(_ => TE.fromEither(slackUser))
        const isOpenForRequests = jest.fn<_.Env['isOpenForRequests']>(_ => TE.fromEither(openForRequests))

        const actual = await runMiddleware(
          _.profile(profile)({
            getAvatar,
            getCareerStage,
            getLanguages,
            getLocation,
            getName,
            getPrereviews,
            getResearchInterests,
            getSlackUser,
            getUser: () => M.fromEither(user),
            isOpenForRequests,
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
        expect(getCareerStage).toHaveBeenCalledWith(profile.value)
        expect(getLanguages).toHaveBeenCalledWith(profile.value)
        expect(getLocation).toHaveBeenCalledWith(profile.value)
        expect(getName).toHaveBeenCalledWith(profile.value)
        expect(getPrereviews).toHaveBeenCalledWith(profile)
        expect(getResearchInterests).toHaveBeenCalledWith(profile.value)
        expect(getSlackUser).toHaveBeenCalledWith(profile.value)
        expect(isOpenForRequests).toHaveBeenCalledWith(profile.value)
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
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.left('not-found'),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.left('unavailable'),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
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
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
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
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the career stage is unavailable', async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('not-found'),
          getCareerStage: () => TE.left('unavailable'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
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
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('unavailable'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the location is unavailable', async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('not-found'),
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('unavailable'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when languages are available', async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('not-found'),
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('unavailable'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
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
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('unavailable'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('not-found'),
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
      fc.nonEmptyString(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when being open for requests is unavailable', async (connection, profile, name, prereviews, user) => {
      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: () => TE.left('not-found'),
          getCareerStage: () => TE.left('not-found'),
          getLanguages: () => TE.left('not-found'),
          getLocation: () => TE.left('not-found'),
          getName: () => TE.of(name),
          getPrereviews: () => TE.of(prereviews),
          getResearchInterests: () => TE.left('not-found'),
          getSlackUser: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          isOpenForRequests: () => TE.left('unavailable'),
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
      const getPrereviews = jest.fn<_.Env['getPrereviews']>(_ => TE.of(prereviews))

      const actual = await runMiddleware(
        _.profile(profile)({
          getAvatar: shouldNotBeCalled,
          getCareerStage: shouldNotBeCalled,
          getLanguages: () => TE.left('not-found'),
          getLocation: shouldNotBeCalled,
          getName: shouldNotBeCalled,
          getPrereviews,
          getResearchInterests: shouldNotBeCalled,
          getSlackUser: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          isOpenForRequests: shouldNotBeCalled,
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
  fc.nonEmptyString(),
  fc.either(fc.constant('no-session' as const), fc.user()),
])("when the PREreviews can't be loaded", async (connection, profile, avatar, name, user) => {
  const actual = await runMiddleware(
    _.profile(profile)({
      getAvatar: () => TE.of(avatar),
      getCareerStage: () => TE.left('not-found'),
      getLanguages: () => TE.left('not-found'),
      getLocation: () => TE.left('not-found'),
      getName: () => TE.of(name),
      getPrereviews: () => TE.left('unavailable'),
      getResearchInterests: () => TE.left('not-found'),
      getSlackUser: () => TE.left('not-found'),
      getUser: () => M.fromEither(user),
      isOpenForRequests: () => TE.left('not-found'),
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

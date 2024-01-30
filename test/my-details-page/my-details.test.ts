import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/my-details'
import { myDetailsMatch } from '../../src/routes'
import type { SaveUserOnboardingEnv } from '../../src/user-onboarding'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('myDetails', () => {
  describe('when the user is logged in', () => {
    describe('when the details can be loaded', () => {
      test.prop([
        fc.user(),
        fc.userOnboarding({ seenMyDetailsPage: fc.constant(true) }),
        fc.either(fc.constant('not-found' as const), fc.orcidToken()),
        fc.either(fc.constant('not-found' as const), fc.slackUser()),
        fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
        fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
        fc.either(fc.constant('not-found' as const), fc.careerStage()),
        fc.either(fc.constant('not-found' as const), fc.researchInterests()),
        fc.either(fc.constant('not-found' as const), fc.location()),
        fc.either(fc.constant('not-found' as const), fc.languages()),
        fc.boolean(),
      ])(
        'when the user has visited before',
        async (
          user,
          userOnboarding,
          orcidToken,
          slackUser,
          contactEmailAddress,
          isOpenForRequests,
          careerStage,
          researchInterests,
          location,
          languages,
          canConnectOrcidProfile,
        ) => {
          const actual = await _.myDetails({ user })({
            canConnectOrcidProfile: () => canConnectOrcidProfile,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getOrcidToken: () => TE.fromEither(orcidToken),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            getUserOnboarding: () => TE.right(userOnboarding),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
            saveUserOnboarding: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(myDetailsMatch.formatter, {}),
            current: 'my-details',
            status: Status.OK,
            title: expect.stringContaining('My details'),
            main: expect.stringContaining('My details'),
            skipToLabel: 'main',
            js: [],
          })
        },
      )

      test.prop([
        fc.user(),
        fc.userOnboarding({ seenMyDetailsPage: fc.constant(false) }),
        fc.either(fc.constant('not-found' as const), fc.orcidToken()),
        fc.either(fc.constant('not-found' as const), fc.slackUser()),
        fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
        fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
        fc.either(fc.constant('not-found' as const), fc.careerStage()),
        fc.either(fc.constant('not-found' as const), fc.researchInterests()),
        fc.either(fc.constant('not-found' as const), fc.location()),
        fc.either(fc.constant('not-found' as const), fc.languages()),
        fc.boolean(),
      ])(
        "when the user hasn't visited before",
        async (
          user,
          userOnboarding,
          orcidToken,
          slackUser,
          contactEmailAddress,
          isOpenForRequests,
          careerStage,
          researchInterests,
          location,
          languages,
          canConnectOrcidProfile,
        ) => {
          const saveUserOnboarding = jest.fn<SaveUserOnboardingEnv['saveUserOnboarding']>(_ => TE.right(undefined))

          const actual = await _.myDetails({ user })({
            canConnectOrcidProfile: () => canConnectOrcidProfile,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getOrcidToken: () => TE.fromEither(orcidToken),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            getUserOnboarding: () => TE.right(userOnboarding),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
            saveUserOnboarding,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(myDetailsMatch.formatter, {}),
            current: 'my-details',
            status: Status.OK,
            title: expect.stringContaining('My details'),
            main: expect.stringContaining('My details'),
            skipToLabel: 'main',
            js: [],
          })
          expect(saveUserOnboarding).toHaveBeenCalledWith(user.orcid, { seenMyDetailsPage: true })
        },
      )

      test.prop([
        fc.user(),
        fc.userOnboarding({ seenMyDetailsPage: fc.constant(false) }),
        fc.either(fc.constant('not-found' as const), fc.orcidToken()),
        fc.either(fc.constant('not-found' as const), fc.slackUser()),
        fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
        fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
        fc.either(fc.constant('not-found' as const), fc.careerStage()),
        fc.either(fc.constant('not-found' as const), fc.researchInterests()),
        fc.either(fc.constant('not-found' as const), fc.location()),
        fc.either(fc.constant('not-found' as const), fc.languages()),
        fc.boolean(),
      ])(
        'when the user onboarding cannot be updated',
        async (
          user,
          userOnboarding,
          orcidToken,
          slackUser,
          contactEmailAddress,
          isOpenForRequests,
          careerStage,
          researchInterests,
          location,
          languages,
          canConnectOrcidProfile,
        ) => {
          const actual = await _.myDetails({ user })({
            canConnectOrcidProfile: () => canConnectOrcidProfile,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getOrcidToken: () => TE.fromEither(orcidToken),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            getUserOnboarding: () => TE.right(userOnboarding),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
            saveUserOnboarding: () => TE.left('unavailable'),
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: Status.ServiceUnavailable,
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('problems'),
            skipToLabel: 'main',
            js: [],
          })
        },
      )
    })

    test.prop([
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.boolean(),
    ])(
      'when the user onboarding cannot be loaded',
      async (
        user,
        orcidToken,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.fromEither(slackUser),
          getUserOnboarding: () => TE.left('unavailable'),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when the ORCID token cannot be loaded',
      async (
        user,
        userOnboarding,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => true,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.left('unavailable'),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.fromEither(slackUser),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.boolean(),
    ])(
      'when the Slack user cannot be loaded',
      async (
        user,
        userOnboarding,
        orcidToken,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.left('unavailable'),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.boolean(),
    ])(
      'when the contact email address cannot be loaded',
      async (
        user,
        userOnboarding,
        orcidToken,
        slackUser,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.left('unavailable'),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.fromEither(slackUser),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.slackUser(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.boolean(),
    ])(
      'when being open for requests is unavailable',
      async (
        user,
        userOnboarding,
        orcidToken,
        slackUser,
        contactEmailAddress,
        careerStage,
        researchInterests,
        location,
        languages,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.right(slackUser),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.left('unavailable'),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.boolean(),
    ])(
      'when the career stage cannot be loaded',
      async (
        user,
        userOnboarding,
        orcidToken,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        researchInterests,
        location,
        languages,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.left('unavailable'),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.fromEither(slackUser),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.boolean(),
    ])(
      'when the research interests cannot be loaded',
      async (
        user,
        userOnboarding,
        orcidToken,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        location,
        languages,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.left('unavailable'),
          getSlackUser: () => TE.fromEither(slackUser),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
      fc.boolean(),
    ])(
      'when the location cannot be loaded',
      async (
        user,
        userOnboarding,
        orcidToken,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        languages,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.fromEither(languages),
          getLocation: () => TE.left('unavailable'),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.fromEither(slackUser),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found' as const), fc.orcidToken()),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.boolean(),
    ])(
      'when the languages cannot be loaded',
      async (
        user,
        userOnboarding,
        orcidToken,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        canConnectOrcidProfile,
      ) => {
        const actual = await _.myDetails({ user })({
          canConnectOrcidProfile: () => canConnectOrcidProfile,
          getCareerStage: () => TE.fromEither(careerStage),
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getLanguages: () => TE.left('unavailable'),
          getLocation: () => TE.fromEither(location),
          getOrcidToken: () => TE.fromEither(orcidToken),
          getResearchInterests: () => TE.fromEither(researchInterests),
          getSlackUser: () => TE.fromEither(slackUser),
          getUserOnboarding: () => TE.right(userOnboarding),
          isOpenForRequests: () => TE.fromEither(isOpenForRequests),
          saveUserOnboarding: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test('when the user is not logged in', async () => {
    const actual = await _.myDetails({})({
      canConnectOrcidProfile: shouldNotBeCalled,
      getCareerStage: shouldNotBeCalled,
      getContactEmailAddress: shouldNotBeCalled,
      getLanguages: shouldNotBeCalled,
      getLocation: shouldNotBeCalled,
      getOrcidToken: shouldNotBeCalled,
      getResearchInterests: shouldNotBeCalled,
      getSlackUser: shouldNotBeCalled,
      getUserOnboarding: shouldNotBeCalled,
      isOpenForRequests: shouldNotBeCalled,
      saveUserOnboarding: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})

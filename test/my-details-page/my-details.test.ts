import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/my-details-page/my-details.ts'
import { myDetailsMatch } from '../../src/routes.ts'
import type { SaveUserOnboardingEnv } from '../../src/user-onboarding.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('myDetails', () => {
  describe('when the user is logged in', () => {
    describe('when the details can be loaded', () => {
      test.prop([
        fc.user(),
        fc.supportedLocale(),
        fc.userOnboarding({ seenMyDetailsPage: fc.constant(true) }),
        fc.either(fc.constant('not-found'), fc.orcidToken()),
        fc.either(fc.constant('not-found'), fc.url()),
        fc.either(fc.constant('not-found'), fc.slackUser()),
        fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
        fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
        fc.either(fc.constant('not-found'), fc.careerStage()),
        fc.either(fc.constant('not-found'), fc.researchInterests()),
        fc.either(fc.constant('not-found'), fc.location()),
        fc.either(fc.constant('not-found'), fc.languages()),
      ])(
        'when the user has visited before',
        async (
          user,
          locale,
          userOnboarding,
          orcidToken,
          avatar,
          slackUser,
          contactEmailAddress,
          isOpenForRequests,
          careerStage,
          researchInterests,
          location,
          languages,
        ) => {
          const actual = await _.myDetails({ locale, user })({
            getAvatar: () => TE.fromEither(avatar),
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
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        },
      )

      test.prop([
        fc.user(),
        fc.supportedLocale(),
        fc.userOnboarding({ seenMyDetailsPage: fc.constant(false) }),
        fc.either(fc.constant('not-found'), fc.orcidToken()),
        fc.either(fc.constant('not-found'), fc.url()),
        fc.either(fc.constant('not-found'), fc.slackUser()),
        fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
        fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
        fc.either(fc.constant('not-found'), fc.careerStage()),
        fc.either(fc.constant('not-found'), fc.researchInterests()),
        fc.either(fc.constant('not-found'), fc.location()),
        fc.either(fc.constant('not-found'), fc.languages()),
      ])(
        "when the user hasn't visited before",
        async (
          user,
          locale,
          userOnboarding,
          orcidToken,
          avatar,
          slackUser,
          contactEmailAddress,
          isOpenForRequests,
          careerStage,
          researchInterests,
          location,
          languages,
        ) => {
          const saveUserOnboarding = jest.fn<SaveUserOnboardingEnv['saveUserOnboarding']>(_ => TE.right(undefined))

          const actual = await _.myDetails({ locale, user })({
            getAvatar: () => TE.fromEither(avatar),
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
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(saveUserOnboarding).toHaveBeenCalledWith(user.orcid, { seenMyDetailsPage: true })
        },
      )

      test.prop([
        fc.user(),
        fc.supportedLocale(),
        fc.userOnboarding({ seenMyDetailsPage: fc.constant(false) }),
        fc.either(fc.constant('not-found'), fc.orcidToken()),
        fc.either(fc.constant('not-found'), fc.url()),
        fc.either(fc.constant('not-found'), fc.slackUser()),
        fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
        fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
        fc.either(fc.constant('not-found'), fc.careerStage()),
        fc.either(fc.constant('not-found'), fc.researchInterests()),
        fc.either(fc.constant('not-found'), fc.location()),
        fc.either(fc.constant('not-found'), fc.languages()),
      ])(
        'when the user onboarding cannot be updated',
        async (
          user,
          locale,
          userOnboarding,
          orcidToken,
          avatar,
          slackUser,
          contactEmailAddress,
          isOpenForRequests,
          careerStage,
          researchInterests,
          location,
          languages,
        ) => {
          const actual = await _.myDetails({ locale, user })({
            getAvatar: () => TE.fromEither(avatar),
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
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        },
      )
    })

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when the user onboarding cannot be loaded',
      async (
        user,
        locale,
        orcidToken,
        avatar,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when the ORCID token cannot be loaded',
      async (
        user,
        locale,
        userOnboarding,
        avatar,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when the Slack user cannot be loaded',
      async (
        user,
        locale,
        userOnboarding,
        orcidToken,
        avatar,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when the contact email address cannot be loaded',
      async (
        user,
        locale,
        userOnboarding,
        orcidToken,
        avatar,
        slackUser,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.slackUser(),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when being open for requests is unavailable',
      async (
        user,
        locale,
        userOnboarding,
        orcidToken,
        avatar,
        slackUser,
        contactEmailAddress,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when the career stage cannot be loaded',
      async (
        user,
        locale,
        userOnboarding,
        orcidToken,
        avatar,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.location()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when the research interests cannot be loaded',
      async (
        user,
        locale,
        userOnboarding,
        orcidToken,
        avatar,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        location,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.languages()),
    ])(
      'when the location cannot be loaded',
      async (
        user,
        locale,
        userOnboarding,
        orcidToken,
        avatar,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        languages,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.either(fc.constant('not-found'), fc.orcidToken()),
      fc.either(fc.constant('not-found'), fc.url()),
      fc.either(fc.constant('not-found'), fc.slackUser()),
      fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found'), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found'), fc.careerStage()),
      fc.either(fc.constant('not-found'), fc.researchInterests()),
      fc.either(fc.constant('not-found'), fc.location()),
    ])(
      'when the languages cannot be loaded',
      async (
        user,
        locale,
        userOnboarding,
        orcidToken,
        avatar,
        slackUser,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
      ) => {
        const actual = await _.myDetails({ locale, user })({
          getAvatar: () => TE.fromEither(avatar),
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
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.supportedLocale()])('when the user is not logged in', async locale => {
    const actual = await _.myDetails({ locale })({
      getAvatar: shouldNotBeCalled,
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

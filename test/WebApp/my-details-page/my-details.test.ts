import { describe, expect, it, vi } from '@effect/vitest'
import { SystemClock } from 'clock-ts'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as IO from 'fp-ts/lib/IO.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import type { SaveUserOnboardingEnv } from '../../../src/user-onboarding.ts'
import * as _ from '../../../src/WebApp/my-details-page/my-details.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('myDetails', () => {
  describe('when the user is logged in', () => {
    describe('when the details can be loaded', () => {
      it.effect.prop(
        'when the user has visited before',
        [
          fc.user(),
          fc.publicPersona(),
          fc.pseudonymPersona(),
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
        ],
        ([
          user,
          publicPersona,
          pseudonymPersona,
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
        ]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.myDetails({ locale, user })({
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
                getPublicPersona: () => TE.right(publicPersona),
                getPseudonymPersona: () => TE.right(pseudonymPersona),
                clock: SystemClock,
                logger: () => IO.of(undefined),
              }),
            )

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
          }),
      )

      it.effect.prop(
        "when the user hasn't visited before",
        [
          fc.user(),
          fc.publicPersona(),
          fc.pseudonymPersona(),
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
        ],
        ([
          user,
          publicPersona,
          pseudonymPersona,
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
        ]) =>
          Effect.gen(function* () {
            const saveUserOnboarding = vi.fn<SaveUserOnboardingEnv['saveUserOnboarding']>(_ => TE.right(undefined))

            const actual = yield* Effect.promise(
              _.myDetails({ locale, user })({
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
                getPublicPersona: () => TE.right(publicPersona),
                getPseudonymPersona: () => TE.right(pseudonymPersona),
                clock: SystemClock,
                logger: () => IO.of(undefined),
              }),
            )

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
            expect(saveUserOnboarding).toHaveBeenCalledWith(publicPersona.orcidId, { seenMyDetailsPage: true })
          }),
      )

      it.effect.prop(
        'when the user onboarding cannot be updated',
        [
          fc.user(),
          fc.publicPersona(),
          fc.pseudonymPersona(),
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
        ],
        ([
          user,
          publicPersona,
          pseudonymPersona,
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
        ]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.myDetails({ locale, user })({
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
                getPublicPersona: () => TE.right(publicPersona),
                getPseudonymPersona: () => TE.right(pseudonymPersona),
                clock: SystemClock,
                logger: () => IO.of(undefined),
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }),
      )
    })

    it.effect.prop(
      'when the user onboarding cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the ORCID token cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the Slack user cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the contact email address cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when being open for requests is unavailable',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the career stage cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the research interests cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the location cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )

    it.effect.prop(
      'when the languages cannot be loaded',
      [
        fc.user(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
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
      ],
      ([
        user,
        publicPersona,
        pseudonymPersona,
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
      ]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.myDetails({ locale, user })({
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
              getPublicPersona: () => TE.right(publicPersona),
              getPseudonymPersona: () => TE.right(pseudonymPersona),
              clock: SystemClock,
              logger: () => IO.of(undefined),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }),
    )
  })

  it.effect.prop('when the user is not logged in', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.myDetails({ locale })({
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
          getPublicPersona: shouldNotBeCalled,
          getPseudonymPersona: shouldNotBeCalled,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    }),
  )
})

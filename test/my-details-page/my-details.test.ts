import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/my-details-page/my-details'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('myDetails', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when the details can be loaded',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        slackUser,
        canChangeContactEmailAddress,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
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
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when the Slack user cannot be loaded',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        canChangeContactEmailAddress,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.left('unavailable'),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
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
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when the contact email address cannot be loaded',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        slackUser,
        canChangeContactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.left('unavailable'),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
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
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.slackUser(),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when being open for requests is unavailable',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        slackUser,
        canChangeContactEmailAddress,
        contactEmailAddress,
        careerStage,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.right(slackUser),
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
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when the career stage cannot be loaded',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        slackUser,
        canChangeContactEmailAddress,
        contactEmailAddress,
        isOpenForRequests,
        researchInterests,
        location,
        languages,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.left('unavailable'),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
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
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.location()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when the research interests cannot be loaded',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        slackUser,
        canChangeContactEmailAddress,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        location,
        languages,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.fromEither(location),
            getResearchInterests: () => TE.left('unavailable'),
            getSlackUser: () => TE.fromEither(slackUser),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
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
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.languages()),
    ])(
      'when the location cannot be loaded',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        slackUser,
        canChangeContactEmailAddress,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        languages,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.fromEither(languages),
            getLocation: () => TE.left('unavailable'),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
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
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.slackUser()),
      fc.boolean(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.researchInterests()),
      fc.either(fc.constant('not-found' as const), fc.location()),
    ])(
      'when the languages cannot be loaded',
      async (
        oauth,
        publicUrl,
        connection,
        user,
        slackUser,
        canChangeContactEmailAddress,
        contactEmailAddress,
        isOpenForRequests,
        careerStage,
        researchInterests,
        location,
      ) => {
        const actual = await runMiddleware(
          _.myDetails({
            canChangeContactEmailAddress: () => canChangeContactEmailAddress,
            getUser: () => M.right(user),
            oauth,
            publicUrl,
            getCareerStage: () => TE.fromEither(careerStage),
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getLanguages: () => TE.left('unavailable'),
            getLocation: () => TE.fromEither(location),
            getResearchInterests: () => TE.fromEither(researchInterests),
            getSlackUser: () => TE.fromEither(slackUser),
            isOpenForRequests: () => TE.fromEither(isOpenForRequests),
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
      },
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() }), fc.boolean()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection, canChangeContactEmailAddress) => {
      const actual = await runMiddleware(
        _.myDetails({
          canChangeContactEmailAddress: () => canChangeContactEmailAddress,
          getUser: () => M.left('no-session'),
          oauth,
          publicUrl,
          getCareerStage: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          getLanguages: shouldNotBeCalled,
          getLocation: shouldNotBeCalled,
          getResearchInterests: shouldNotBeCalled,
          getSlackUser: shouldNotBeCalled,
          isOpenForRequests: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: oauth.clientId,
                response_type: 'code',
                redirect_uri: oauth.redirectUri.href,
                scope: '/authenticate',
                state: new URL(format(myDetailsMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() }), fc.boolean(), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, canChangeContactEmailAddress, error) => {
      const actual = await runMiddleware(
        _.myDetails({
          canChangeContactEmailAddress: () => canChangeContactEmailAddress,
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          getCareerStage: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          getLanguages: shouldNotBeCalled,
          getLocation: shouldNotBeCalled,
          getResearchInterests: shouldNotBeCalled,
          getSlackUser: shouldNotBeCalled,
          isOpenForRequests: shouldNotBeCalled,
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
    },
  )
})

import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import * as _ from '../src/preprint'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('preprint', () => {
  describe('preprint', () => {
    test.prop([
      fc.connection(),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.preprint(),
      fc.array(
        fc.record({
          authors: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcid(),
              },
              { requiredKeys: ['name'] },
            ),
          ),
          id: fc.integer(),
          language: fc.option(fc.languageCode(), { nil: undefined }),
          text: fc.html(),
        }),
      ),
      fc.array(
        fc.record({
          author: fc.record(
            {
              name: fc.string(),
              orcid: fc.orcid(),
            },
            { requiredKeys: ['name'] },
          ),
          questions: fc.record({
            availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          }),
        }),
      ),
    ])('when the reviews can be loaded', async (connection, user, preprint, prereviews, rapidPrereviews) => {
      const getPreprint: Mock<_.GetPreprintEnv['getPreprint']> = jest.fn(_ => TE.right(preprint))
      const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.right(prereviews))
      const getRapidPrereviews: Mock<_.GetRapidPrereviewsEnv['getRapidPrereviews']> = jest.fn(_ =>
        TE.right(rapidPrereviews),
      )

      const actual = await runMiddleware(
        _.preprint(preprint.id.doi)({
          getPreprint,
          getPrereviews,
          getRapidPrereviews,
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
      expect(getPreprint).toHaveBeenCalledWith(preprint.id.doi)
      expect(getPrereviews).toHaveBeenCalledWith(preprint.id)
      expect(getRapidPrereviews).toHaveBeenCalledWith(preprint.id)
    })

    test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user()), fc.preprintDoi()])(
      'when the preprint is not found',
      async (connection, user, preprintDoi) => {
        const actual = await runMiddleware(
          _.preprint(preprintDoi)({
            getPreprint: () => TE.left('not-found'),
            getPrereviews: () => () => Promise.reject('should not be called'),
            getRapidPrereviews: () => () => Promise.reject('should not be called'),
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
      },
    )

    test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user()), fc.preprintDoi()])(
      'when the preprint is unavailable',
      async (connection, user, preprintDoi) => {
        const actual = await runMiddleware(
          _.preprint(preprintDoi)({
            getPreprint: () => TE.left('unavailable'),
            getPrereviews: () => () => Promise.reject('should not be called'),
            getRapidPrereviews: () => () => Promise.reject('should not be called'),
            getUser: () => M.fromEither(user),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.ServiceUnavailable },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )

    test.prop([
      fc.connection(),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.preprint(),
      fc.array(
        fc.record({
          author: fc.record(
            {
              name: fc.string(),
              orcid: fc.orcid(),
            },
            { requiredKeys: ['name'] },
          ),
          questions: fc.record({
            availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          }),
        }),
      ),
    ])('when the reviews cannot be loaded', async (connection, user, preprint, rapidPrereviews) => {
      const actual = await runMiddleware(
        _.preprint(preprint.id.doi)({
          getPreprint: () => TE.right(preprint),
          getPrereviews: () => TE.left('unavailable'),
          getRapidPrereviews: () => TE.right(rapidPrereviews),
          getUser: () => M.fromEither(user),
        }),
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

    test.prop([
      fc.connection(),

      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.preprint(),
      fc.array(
        fc.record({
          authors: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcid(),
              },
              { requiredKeys: ['name'] },
            ),
          ),
          id: fc.integer(),
          language: fc.option(fc.languageCode(), { nil: undefined }),
          text: fc.html(),
        }),
      ),
    ])('when the rapid PREreviews cannot be loaded', async (connection, user, preprint, prereviews) => {
      const actual = await runMiddleware(
        _.preprint(preprint.id.doi)({
          getPreprint: () => TE.right(preprint),
          getPrereviews: () => TE.right(prereviews),
          getRapidPrereviews: () => TE.left('unavailable'),
          getUser: () => M.fromEither(user),
        }),
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

  describe('redirectToPreprint', () => {
    test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user()), fc.uuid(), fc.preprintId()])(
      'when the DOI is found',
      async (connection, user, uuid, id) => {
        const getPreprintIdFromUuid: Mock<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']> = jest.fn(_ =>
          TE.right(id),
        )

        const actual = await runMiddleware(
          _.redirectToPreprint(uuid)({ getPreprintIdFromUuid, getUser: () => M.fromEither(user) }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.MovedPermanently },
            {
              type: 'setHeader',
              name: 'Location',
              value: `/preprints/doi-${encodeURIComponent(
                id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
              )}`,
            },
            { type: 'endResponse' },
          ]),
        )
        expect(getPreprintIdFromUuid).toHaveBeenCalledWith(uuid)
      },
    )

    test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user()), fc.uuid()])(
      'when the DOI is not found',
      async (connection, user, uuid) => {
        const actual = await runMiddleware(
          _.redirectToPreprint(uuid)({
            getPreprintIdFromUuid: () => TE.left('not-found'),
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
      },
    )

    test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user()), fc.uuid()])(
      'when the DOI is unavailable',
      async (connection, user, uuid) => {
        const actual = await runMiddleware(
          _.redirectToPreprint(uuid)({
            getPreprintIdFromUuid: () => TE.left('unavailable'),
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
      },
    )
  })
})

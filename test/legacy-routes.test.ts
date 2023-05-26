import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import { ExpressConnection } from 'hyper-ts/lib/express'
import type { Mock } from 'jest-mock'
import { createRequest, createResponse } from 'node-mocks-http'
import * as _ from '../src/legacy-routes'
import { preprintReviewsMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('legacyRoutes', () => {
  test.each([
    ['/10.1101/2020.08.27.270835', '/preprints/doi-10.1101-2020.08.27.270835'],
    ['/blog', 'https://content.prereview.org/'],
    ['/blog?articles_format=grid', 'https://content.prereview.org/'],
    ['/coc', '/code-of-conduct'],
    ['/docs/about', '/about'],
    ['/docs/code_of_conduct', '/code-of-conduct'],
    ['/docs/resources', 'https://content.prereview.org/resources/'],
    ['/login', '/log-in'],
    ['/logout', '/log-out'],
    ['/preprints/arxiv-2204.09673', '/preprints/doi-10.48550-arxiv.2204.09673'],
    ['/preprints/arxiv-1312.0906', '/preprints/doi-10.48550-arxiv.1312.0906'],
    ['/reviews', '/reviews?page=1'],
    ['/reviews/new', '/review-a-preprint'],
    [
      '/users/153686/articles/200859-preprint-info-doc',
      'https://www.authorea.com/users/153686/articles/200859-preprint-info-doc',
    ],
    [
      '/users/153686/articles/201763-where-can-you-find-preprints',
      'https://www.authorea.com/users/153686/articles/201763-where-can-you-find-preprints',
    ],
    [
      '/users/153686/articles/200859-preprint-info-doc/_show_article',
      'https://www.authorea.com/users/153686/articles/200859-preprint-info-doc',
    ],
    [
      '/users/153686/articles/201763-where-can-you-find-preprints/_show_article',
      'https://www.authorea.com/users/153686/articles/201763-where-can-you-find-preprints',
    ],
  ])('redirects %s', async (path, expected) => {
    const actual = await runMiddleware(
      _.legacyRoutes({
        getPreprintIdFromUuid: () => () => Promise.reject('should not be called'),
        getUser: () => () => () => Promise.reject('should not be called'),
      }),
      new ExpressConnection(createRequest({ path }), createResponse()),
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.MovedPermanently },
        { type: 'setHeader', name: 'Location', value: expected },
        { type: 'endResponse' },
      ]),
    )
  })

  describe("with a '/preprints/{uuid}' path", () => {
    test.prop([
      fc.uuid().chain(uuid => fc.tuple(fc.constant(uuid), fc.connection({ path: fc.constant(`/preprints/${uuid}`) }))),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, connection], user, id) => {
      const getPreprintIdFromUuid: Mock<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']> = jest.fn(_ =>
        TE.right(id),
      )

      const actual = await runMiddleware(
        _.legacyRoutes({ getPreprintIdFromUuid, getUser: () => M.fromEither(user) }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.MovedPermanently },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(preprintReviewsMatch.formatter, { id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintIdFromUuid).toHaveBeenCalledWith(uuid)
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/preprints/${uuid}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the ID is not found', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
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
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/preprints/${uuid}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the ID is unavailable', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
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
    })
  })

  describe("with a '/preprints/{uuid}/full-reviews/{uuid}' path", () => {
    test.prop([
      fc
        .tuple(fc.uuid(), fc.uuid())
        .chain(([uuid1, uuid2]) =>
          fc.tuple(
            fc.constant(uuid1),
            fc.connection({ path: fc.constant(`/preprints/${uuid1}/full-reviews/${uuid2}`) }),
          ),
        ),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, connection], user, id) => {
      const getPreprintIdFromUuid: Mock<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']> = jest.fn(_ =>
        TE.right(id),
      )

      const actual = await runMiddleware(
        _.legacyRoutes({ getPreprintIdFromUuid, getUser: () => M.fromEither(user) }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.MovedPermanently },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(preprintReviewsMatch.formatter, { id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintIdFromUuid).toHaveBeenCalledWith(uuid)
    })

    test.prop([
      fc
        .tuple(fc.uuid(), fc.uuid())
        .chain(([uuid1, uuid2]) => fc.connection({ path: fc.constant(`/preprints/${uuid1}/full-reviews/${uuid2}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the ID is not found', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
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
    })

    test.prop([
      fc
        .tuple(fc.uuid(), fc.uuid())
        .chain(([uuid1, uuid2]) => fc.connection({ path: fc.constant(`/preprints/${uuid1}/full-reviews/${uuid2}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the ID is unavailable', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
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
    })
  })

  describe("with a '/validate/{uuid}' path", () => {
    test.prop([
      fc.uuid().chain(uuid => fc.tuple(fc.constant(uuid), fc.connection({ path: fc.constant(`/validate/${uuid}`) }))),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, connection], user, id) => {
      const getPreprintIdFromUuid: Mock<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']> = jest.fn(_ =>
        TE.right(id),
      )

      const actual = await runMiddleware(
        _.legacyRoutes({ getPreprintIdFromUuid, getUser: () => M.fromEither(user) }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.MovedPermanently },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(preprintReviewsMatch.formatter, { id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintIdFromUuid).toHaveBeenCalledWith(uuid)
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/validate/${uuid}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the ID is not found', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
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
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/validate/${uuid}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the ID is unavailable', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
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
    })
  })

  test.each([
    ['/about/32e9ae30-8f83-4005-8f18-cce3c05c1061'],
    ['/about/9513ca8a-eafc-4291-84be-74e4181e8903'],
    ['/admin'],
    ['/api/docs'],
    ['/communities?page=1'],
    ['/communities?search=&page=2&limit=10&offset=0'],
    ['/communities/africarxiv'],
    ['/communities/africarxiv?page=2'],
    ['/communities/africarxiv?page=2&limit=10&offset=0&search='],
    ['/communities/africarxiv/new'],
    ['/communities/eLifeAmbassadors'],
    ['/communities/eLifeAmbassadors?page=2'],
    ['/communities/eLifeAmbassadors?page=2&limit=10&offset=0&search='],
    ['/communities/eLifeAmbassadors/new'],
    ['/community-settings/6abac91b-1bd6-4178-8c72-38695c2e9680'],
    ['/community-settings/c36edcca-ba95-475d-a851-ad0f277ac99d'],
    ['/prereviewers'],
    ['/prereviewers?page=1'],
    [
      '/prereviewers?badges=Reviewer+Trainee%2CPREreview+V1&sort=dateJoined&page=2&limit=10&offset=10&communities=Photosynthesis',
    ],
    ['/settings/api'],
    ['/settings/drafts'],
  ])('removed page for %s', async path => {
    const actual = await runMiddleware(
      _.legacyRoutes({
        getPreprintIdFromUuid: () => () => Promise.reject('should not be called'),
        getUser: () => M.left('no-session'),
      }),
      new ExpressConnection(createRequest({ path }), createResponse()),
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.each([
    ['/dashboard'],
    ['/dashboard?page=2'],
    ['/dashboard?search=covid-19&page=2&limit=10&offset=0'],
    ['/dashboard/new'],
    ['/dashboard/new?page=2'],
    ['/dashboard/new?search=covid-19&page=2&limit=10&offset=0'],
  ])('removed page for %s', async path => {
    const actual = await runMiddleware(
      _.legacyRoutes({
        getPreprintIdFromUuid: () => () => Promise.reject('should not be called'),
        getUser: () => M.left('no-session'),
      }),
      new ExpressConnection(createRequest({ path }), createResponse()),
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.Gone },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})

import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import { ExpressConnection } from 'hyper-ts/express'
import { createRequest, createResponse } from 'node-mocks-http'
import * as _ from '../src/legacy-routes'
import { preprintReviewsMatch, profileMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('legacyRoutes', () => {
  test.each([
    ['/10.1101/2020.08.27.270835', '/preprints/doi-10.1101-2020.08.27.270835'],
    ['/10.5281/zenodo.3733767', '/preprints/doi-10.5281-zenodo.3733767'],
    ['/blog', 'https://content.prereview.org/'],
    ['/blog?articles_format=grid', 'https://content.prereview.org/'],
    ['/coc', '/code-of-conduct'],
    ['/communities', '/clubs'],
    ['/communities?page=1', '/clubs'],
    ['/communities?search=&page=2&limit=10&offset=0', '/clubs'],
    ['/docs/about', '/about'],
    ['/docs/codeofconduct', '/code-of-conduct'],
    ['/docs/code_of_conduct', '/code-of-conduct'],
    ['/docs/resources', 'https://content.prereview.org/resources/'],
    ['/inst/7204/', 'https://www.authorea.com/inst/7204'],
    ['/inst/15119?articles_format=grid&current_inst_tab=statistics', 'https://www.authorea.com/inst/15119'],
    ['/login', '/log-in'],
    ['/login?next=/10.1101/2020.03.24.004655', '/log-in'],
    ['/logout', '/log-out'],
    ['/preprint-journal-clubs', '/live-reviews'],
    [
      '/preprints/doi-10.1101-2022.02.14.480364/write-a-prereview/already-written',
      '/preprints/doi-10.1101-2022.02.14.480364/write-a-prereview/review-type',
    ],
    [
      '/preprints/doi-10.1590-a+b-c/write-a-prereview/already-written',
      '/preprints/doi-10.1590-a%2Bb-c/write-a-prereview/review-type',
    ],
    [
      '/preprints/philsci-22206/write-a-prereview/already-written',
      '/preprints/philsci-22206/write-a-prereview/review-type',
    ],
    ['/preprints/arxiv-1312.0906', '/preprints/doi-10.48550-arxiv.1312.0906'],
    ['/preprints/arXiv-2106.14108', '/preprints/doi-10.48550-arxiv.2106.14108'],
    ['/prereview.org', '/'],
    ['/PREreview.org', '/'],
    ['/reviews', '/reviews?page=1'],
    ['/reviews/new', '/review-a-preprint'],
    ['/users/61782', 'https://www.authorea.com/users/61782'],
    ['/users/161073', 'https://www.authorea.com/users/161073'],
    ['/users/173578?articles_format=list&direction=desc&sort=created_at', 'https://www.authorea.com/users/173578'],
    [
      '/users/153686/articles/200859-preprint-info-doc',
      'https://www.authorea.com/users/153686/articles/200859-preprint-info-doc',
    ],
    [
      '/users/153686/articles/201763-where-can-you-find-preprints',
      'https://www.authorea.com/users/153686/articles/201763-where-can-you-find-preprints',
    ],
    [
      '/users/174325/articles/208401-基于网络参数的生物标记可以自动找到棘波',
      'https://www.authorea.com/users/174325/articles/208401-%E5%9F%BA%E4%BA%8E%E7%BD%91%E7%BB%9C%E5%8F%82%E6%95%B0%E7%9A%84%E7%94%9F%E7%89%A9%E6%A0%87%E8%AE%B0%E5%8F%AF%E4%BB%A5%E8%87%AA%E5%8A%A8%E6%89%BE%E5%88%B0%E6%A3%98%E6%B3%A2',
    ],
    [
      '/users/153686/articles/200859-preprint-info-doc/_show_article',
      'https://www.authorea.com/users/153686/articles/200859-preprint-info-doc',
    ],
    [
      '/users/153686/articles/201763-where-can-you-find-preprints/_show_article',
      'https://www.authorea.com/users/153686/articles/201763-where-can-you-find-preprints',
    ],
    [
      '/users/174325/articles/208401-基于网络参数的生物标记可以自动找到棘波/_show_article',
      'https://www.authorea.com/users/174325/articles/208401-%E5%9F%BA%E4%BA%8E%E7%BD%91%E7%BB%9C%E5%8F%82%E6%95%B0%E7%9A%84%E7%94%9F%E7%89%A9%E6%A0%87%E8%AE%B0%E5%8F%AF%E4%BB%A5%E8%87%AA%E5%8A%A8%E6%89%BE%E5%88%B0%E6%A3%98%E6%B3%A2',
    ],
  ])('redirects %s', async (path, expected) => {
    const actual = await runMiddleware(
      _.legacyRoutes({
        getPreprintIdFromUuid: shouldNotBeCalled,
        getProfileIdFromUuid: shouldNotBeCalled,
        getUser: shouldNotBeCalled,
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

  describe("with an '/about/{uuid}' path", () => {
    test.prop([
      fc.uuid().chain(uuid => fc.tuple(fc.constant(uuid), fc.connection({ path: fc.constant(`/about/${uuid}`) }))),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.profileId(),
    ])('when the profile ID is found', async ([uuid, connection], user, profile) => {
      const getProfileIdFromUuid = jest.fn<_.GetProfileIdFromUuidEnv['getProfileIdFromUuid']>(_ => TE.right(profile))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid,
          getUser: () => M.fromEither(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.MovedPermanently },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(profileMatch.formatter, { profile }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getProfileIdFromUuid).toHaveBeenCalledWith(uuid)
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/about/${uuid}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the profile ID is not found', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid: () => TE.left('not-found'),
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
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/about/${uuid}`) })),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when the profile ID is unavailable', async (connection, user) => {
      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid: () => TE.left('unavailable'),
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

  describe("with a '/preprints/{uuid}' path", () => {
    test.prop([
      fc.uuid().chain(uuid => fc.tuple(fc.constant(uuid), fc.connection({ path: fc.constant(`/preprints/${uuid}`) }))),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, connection], user, id) => {
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid,
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
        }),
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
          getProfileIdFromUuid: shouldNotBeCalled,
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
          getProfileIdFromUuid: shouldNotBeCalled,
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
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid,
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
        }),
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
          getProfileIdFromUuid: shouldNotBeCalled,
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
          getProfileIdFromUuid: shouldNotBeCalled,
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
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid,
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
        }),
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
          getProfileIdFromUuid: shouldNotBeCalled,
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
          getProfileIdFromUuid: shouldNotBeCalled,
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
    ['/admin'],
    ['/api/docs'],
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
    ['/events/434b46a1-0c52-4a09-9802-bddc16873b88'],
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
        getPreprintIdFromUuid: shouldNotBeCalled,
        getProfileIdFromUuid: shouldNotBeCalled,
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
        getPreprintIdFromUuid: shouldNotBeCalled,
        getProfileIdFromUuid: shouldNotBeCalled,
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

import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import { ExpressConnection } from 'hyper-ts/lib/express.js'
import { createRequest, createResponse } from 'node-mocks-http'
import { rawHtml } from '../../src/html.js'
import * as _ from '../../src/legacy-routes/index.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { preprintReviewsMatch, profileMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('legacyRoutes', () => {
  test.each([
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
  ])('redirects %s', async (path, expected) => {
    const actual = await runMiddleware(
      _.legacyRoutes({
        getPreprintIdFromUuid: shouldNotBeCalled,
        getProfileIdFromUuid: shouldNotBeCalled,
        getUser: shouldNotBeCalled,
        getUserOnboarding: shouldNotBeCalled,
        locale: DefaultLocale,
        publicUrl: new URL('http://example.com'),
        templatePage: shouldNotBeCalled,
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
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.profileId(),
    ])('when the profile ID is found', async ([uuid, connection], locale, user, profile) => {
      const getProfileIdFromUuid = jest.fn<_.GetProfileIdFromUuidEnv['getProfileIdFromUuid']>(_ => TE.right(profile))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
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
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the profile ID is not found', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/about/${uuid}`) })),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the profile ID is unavailable', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: shouldNotBeCalled,
          getProfileIdFromUuid: () => TE.left('unavailable'),
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
    })
  })

  describe("with a '/preprints/{uuid}' path", () => {
    test.prop([
      fc.uuid().chain(uuid => fc.tuple(fc.constant(uuid), fc.connection({ path: fc.constant(`/preprints/${uuid}`) }))),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, connection], locale, user, id) => {
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid,
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
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
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the ID is not found', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: () => TE.left('not-found'),
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/preprints/${uuid}`) })),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the ID is unavailable', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: () => TE.left('unavailable'),
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
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
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, connection], locale, user, id) => {
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid,
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
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
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the ID is not found', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: () => TE.left('not-found'),
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
    })

    test.prop([
      fc
        .tuple(fc.uuid(), fc.uuid())
        .chain(([uuid1, uuid2]) => fc.connection({ path: fc.constant(`/preprints/${uuid1}/full-reviews/${uuid2}`) })),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the ID is unavailable', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: () => TE.left('unavailable'),
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
    })
  })

  describe("with a '/validate/{uuid}' path", () => {
    test.prop([
      fc.uuid().chain(uuid => fc.tuple(fc.constant(uuid), fc.connection({ path: fc.constant(`/validate/${uuid}`) }))),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.indeterminatePreprintId(),
    ])('when the ID is found', async ([uuid, connection], locale, user, id) => {
      const getPreprintIdFromUuid = jest.fn<_.GetPreprintIdFromUuidEnv['getPreprintIdFromUuid']>(_ => TE.right(id))

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid,
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
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
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the ID is not found', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: () => TE.left('not-found'),
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
    })

    test.prop([
      fc.uuid().chain(uuid => fc.connection({ path: fc.constant(`/validate/${uuid}`) })),
      fc.supportedLocale(),
      fc.either(fc.constant('no-session'), fc.user()),
      fc.html(),
    ])('when the ID is unavailable', async (connection, locale, user, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.legacyRoutes({
          getPreprintIdFromUuid: () => TE.left('unavailable'),
          getProfileIdFromUuid: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user: E.isRight(user) ? user.right : undefined,
      })
    })
  })

  test.each([
    ['/admin'],
    ['/api'],
    ['/api/docs'],
    ['/api/openapi.json'],
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
        getUserOnboarding: shouldNotBeCalled,
        locale: DefaultLocale,
        publicUrl: new URL('http://example.com'),
        templatePage: () => rawHtml('page-content'),
      }),
      new ExpressConnection(createRequest({ path }), createResponse()),
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, public' },
        { type: 'setHeader', name: 'Vary', value: 'Cookie' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: 'page-content' },
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
    ['/extension'],
  ])('removed page for %s', async path => {
    const actual = await runMiddleware(
      _.legacyRoutes({
        getPreprintIdFromUuid: shouldNotBeCalled,
        getProfileIdFromUuid: shouldNotBeCalled,
        getUser: () => M.left('no-session'),
        getUserOnboarding: shouldNotBeCalled,
        locale: DefaultLocale,
        publicUrl: new URL('http://example.com'),
        templatePage: () => rawHtml('page-content'),
      }),
      new ExpressConnection(createRequest({ path }), createResponse()),
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.Gone },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, public' },
        { type: 'setHeader', name: 'Vary', value: 'Cookie' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: 'page-content' },
      ]),
    )
  })
})

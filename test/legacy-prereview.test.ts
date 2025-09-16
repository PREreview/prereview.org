import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import { Option } from 'effect'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as StatusCodes from '../src/StatusCodes.js'
import { rawHtml } from '../src/html.js'
import * as _ from '../src/legacy-prereview.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('getPreprintDoiFromLegacyPreviewUuid', () => {
  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.preprintDoi()])(
    'when the DOI can be decoded',
    async (uuid, app, key, url, update, doi) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: `${url}api/v2/preprints/${encodeURIComponent(uuid)}`,
          headers: { 'X-Api-App': app, 'X-Api-Key': key },
        },
        {
          body: { data: [{ handle: `doi:${doi}` }] },
        },
      )

      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.right(expect.objectContaining({ value: doi })))
    },
  )

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.nonPreprintDoi()])(
    'when the DOI is not a preprint DOI',
    async (uuid, app, key, url, update, doi) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: `${url}api/v2/preprints/${encodeURIComponent(uuid)}`,
          headers: { 'X-Api-App': app, 'X-Api-Key': key },
        },
        {
          body: { data: [{ handle: `doi:${doi}` }] },
        },
      )

      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])('when the response cannot be decoded', async (uuid, app, key, url, update, response) => {
    const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/preprints/${encodeURIComponent(uuid)}`, response)

    const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.boolean()])(
    'when the response has a 404 status code',
    async (uuid, app, key, url, update) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(`${url}api/v2/preprints/${encodeURIComponent(uuid)}`, StatusCodes.NotFound)

      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK && status !== StatusCodes.NotFound),
  ])('when the response has a non-200/404 status code', async (uuid, app, key, url, update, status) => {
    const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/preprints/${encodeURIComponent(uuid)}`, status)

    const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.error()])(
    'when fetch throws an error',
    async (uuid, app, key, url, update, error) => {
      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getProfileIdFromLegacyPreviewUuid', () => {
  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.oneof(
      fc.orcidProfileId().map(profile => [
        {
          isAnonymous: false,
          orcid: profile.orcid,
        },
        profile,
      ]),
      fc.pseudonymProfileId().map(profile => [
        {
          isAnonymous: true,
          name: profile.pseudonym,
        },
        profile,
      ]),
    ),
  ])('when the response can be decoded', async (uuid, app, key, url, update, [data, profile]) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: `${url}api/v2/personas/${encodeURIComponent(uuid)}`,
        headers: { 'X-Api-App': app, 'X-Api-Key': key },
      },
      {
        body: { data: [data] },
      },
    )

    const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.right(profile))
  })

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])('when the response cannot be decoded', async (uuid, app, key, url, update, response) => {
    const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/personas/${encodeURIComponent(uuid)}`, response)

    const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.boolean()])(
    'when the response has a 404 status code',
    async (uuid, app, key, url, update) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(`${url}api/v2/personas/${encodeURIComponent(uuid)}`, StatusCodes.NotFound)

      const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK && status !== StatusCodes.NotFound),
  ])('when the response has a non-200/404 status code', async (uuid, app, key, url, update, status) => {
    const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/personas/${encodeURIComponent(uuid)}`, status)

    const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.error()])(
    'when fetch throws an error',
    async (uuid, app, key, url, update, error) => {
      const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('createUserOnLegacyPrereview', () => {
  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.pseudonym()])(
    'when the user can be created',
    async (orcid, name, app, key, url, update, pseudonym) => {
      const fetch = fetchMock.sandbox().postOnce(
        {
          url: `${url}api/v2/users`,
          headers: { 'X-Api-App': app, 'X-Api-Key': key },
          body: { orcid, name },
        },
        { status: StatusCodes.Created, body: pseudonym },
      )

      const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.right(pseudonym))
    },
  )

  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.fetchResponse({ status: fc.constant(StatusCodes.Created) }),
  ])('when the user cannot be decoded', async (orcid, name, app, key, url, update, response) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: `${url}api/v2/users`,
        headers: { 'X-Api-App': app, 'X-Api-Key': key },
        body: { orcid, name },
      },
      response,
    )

    const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.Created),
  ])('when the response has a non-201 status code', async (orcid, name, app, key, url, update, status) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: `${url}api/v2/users`,
        headers: { 'X-Api-App': app, 'X-Api-Key': key },
        body: { orcid, name },
      },
      { status },
    )

    const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.error()])(
    'when fetch throws an error',
    async (orcid, name, app, key, url, update, error) => {
      const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getPseudonymFromLegacyPrereview', () => {
  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.tuple(fc.pseudonym(), fc.string()).chain(([pseudonym, realName]) =>
      fc.tuple(
        fc.constant(pseudonym),
        fc.oneof(
          fc.constant([
            { isAnonymous: false, name: realName },
            { isAnonymous: true, name: pseudonym },
          ]),
          fc.constant([
            { isAnonymous: true, name: pseudonym },
            { isAnonymous: false, name: realName },
          ]),
        ),
      ),
    ),
  ])('when the user can be decoded', async (orcid, app, key, url, update, [pseudonym, personas]) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        functionMatcher: (_, req) => req.cache === 'force-cache',
        url: `${url}api/v2/users/${encodeURIComponent(orcid)}`,
        headers: { 'X-Api-App': app, 'X-Api-Key': key },
      },
      { body: { data: { personas } } },
    )

    const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.right(pseudonym))
  })

  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])('when the user cannot be decoded', async (orcid, app, key, url, update, response) => {
    const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, response)

    const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.origin(), fc.boolean()])(
    'when the response has a 404 status code',
    async (orcid, app, key, url, update) => {
      const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, StatusCodes.NotFound)

      const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK && status !== StatusCodes.NotFound),
  ])('when the response has a non-200/404 status code', async (orcid, app, key, url, update, status) => {
    const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, status)

    const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
      fetch,
      legacyPrereviewApi: { app, key, url, update },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.error()])(
    'when fetch throws an error',
    async (orcid, app, key, url, update, error) => {
      const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getRapidPreviewsFromLegacyPrereview', () => {
  test.prop([fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.preprintIdWithDoi()])(
    'when the Rapid PREreviews can be loaded',
    async (app, key, url, update, preprintId) => {
      const actual = await _.getRapidPreviewsFromLegacyPrereview(preprintId)({
        fetch: fetchMock
          .sandbox()
          .getOnce(
            `${url}api/v2/preprints/doi-${encodeURIComponent(
              preprintId.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/rapid-reviews`,
            {
              body: {
                data: [
                  {
                    author: { name: 'Author 1', orcid: '0000-0002-1825-0097' },
                    ynNovel: 'yes',
                    ynFuture: 'yes',
                    ynReproducibility: 'unsure',
                    ynMethods: 'unsure',
                    ynCoherent: 'yes',
                    ynLimitations: 'unsure',
                    ynEthics: 'yes',
                    ynNewData: 'yes',
                    ynRecommend: 'yes',
                    ynPeerReview: 'yes',
                    ynAvailableCode: 'no',
                    ynAvailableData: 'no',
                  },
                  {
                    author: { name: 'Author 2' },
                    ynNovel: 'unsure',
                    ynFuture: 'yes',
                    ynReproducibility: 'unsure',
                    ynMethods: 'yes',
                    ynCoherent: 'yes',
                    ynLimitations: 'no',
                    ynEthics: 'N/A',
                    ynNewData: 'yes',
                    ynRecommend: 'yes',
                    ynPeerReview: 'yes',
                    ynAvailableCode: 'no',
                    ynAvailableData: 'yes',
                  },
                ],
              },
            },
          ),
        legacyPrereviewApi: {
          app,
          key,
          url,
          update,
        },
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            author: { name: 'Author 1', orcid: '0000-0002-1825-0097' },
            questions: {
              novel: 'yes',
              future: 'yes',
              reproducibility: 'unsure',
              methods: 'unsure',
              coherent: 'yes',
              limitations: 'unsure',
              ethics: 'yes',
              newData: 'yes',
              recommend: 'yes',
              peerReview: 'yes',
              availableCode: 'no',
              availableData: 'no',
            },
          },
          {
            author: { name: 'Author 2', orcid: undefined },
            questions: {
              novel: 'unsure',
              future: 'yes',
              reproducibility: 'unsure',
              methods: 'yes',
              coherent: 'yes',
              limitations: 'no',
              ethics: 'na',
              newData: 'yes',
              recommend: 'yes',
              peerReview: 'yes',
              availableCode: 'no',
              availableData: 'yes',
            },
          },
        ]),
      )
    },
  )

  test.prop([fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.preprintIdWithDoi()])(
    'when the Rapid PREreviews cannot be found',
    async (app, key, url, update, preprintId) => {
      const actual = await _.getRapidPreviewsFromLegacyPrereview(preprintId)({
        fetch: fetchMock
          .sandbox()
          .getOnce(
            `${url}api/v2/preprints/doi-${encodeURIComponent(
              preprintId.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/rapid-reviews`,
            { status: StatusCodes.NotFound },
          ),
        legacyPrereviewApi: {
          app,
          key,
          url,
          update,
        },
      })()

      expect(actual).toStrictEqual(E.right([]))
    },
  )

  test.prop([
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.boolean(),
    fc.preprintIdWithDoi(),
    fc.integer({ min: 400, max: 599 }).filter(status => status !== StatusCodes.NotFound),
  ])('when the Rapid PREreviews cannot be loaded', async (app, key, url, update, preprintId, status) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(
        `${url}api/v2/preprints/doi-${encodeURIComponent(
          preprintId.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
        )}/rapid-reviews`,
        { status },
      )

    const actual = await _.getRapidPreviewsFromLegacyPrereview(preprintId)({
      fetch,
      legacyPrereviewApi: {
        app,
        key,
        url,
        update,
      },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })
})

describe('createPrereviewOnLegacyPrereview', () => {
  describe('when the legacy PREreview should be updated', () => {
    test.prop([
      fc.string(),
      fc.string(),
      fc.origin(),
      fc.user(),
      fc.preprintIdWithDoi(),
      fc.boolean(),
      fc.uuid(),
      fc.doi(),
      fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
      fc.constant('CC-BY-4.0'),
      fc.supportedLocale(),
    ])(
      'when the review can be posted',
      async (app, key, url, user, preprintId, structured, preprintUuid, reviewDoi, otherAuthors, license, locale) => {
        const fetch = fetchMock
          .sandbox()
          .getOnce(`${url}api/v2/resolve?identifier=${preprintId.value}`, { body: { uuid: preprintUuid } })
          .postOnce(
            {
              url: `${url}api/v2/full-reviews`,
              headers: { 'X-Api-App': app, 'X-Api-Key': key },
              body: {
                preprint: preprintUuid,
                doi: reviewDoi,
                authors: [{ orcid: user.orcid, public: true }],
                isPublished: true,
                contents: '<p>hello</p>',
              },
            },
            { status: StatusCodes.Created },
          )

        const actual = await _.createPrereviewOnLegacyPrereview({
          conduct: 'yes',
          otherAuthors,
          persona: 'public',
          preprint: {
            id: preprintId,
            language: 'en',
            title: rawHtml('foo'),
          },
          review: rawHtml('<p>hello</p>'),
          language: Option.none(),
          license,
          locale,
          structured,
          user,
        })(reviewDoi)({
          clock: SystemClock,
          fetch,
          legacyPrereviewApi: { app, key, url, update: true },
          logger: () => IO.of(undefined),
        })()

        expect(actual).toStrictEqual(E.right(undefined))
      },
    )

    test.prop([
      fc.string(),
      fc.string(),
      fc.origin(),
      fc.user(),
      fc.preprintIdWithDoi(),
      fc.boolean(),
      fc.uuid(),
      fc.doi(),
      fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
      fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
      fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
      fc.supportedLocale(),
    ])(
      'when the review cannot be posted',
      async (
        app,
        key,
        url,
        user,
        preprintId,
        structured,
        preprintUuid,
        reviewDoi,
        otherAuthors,
        response,
        license,
        locale,
      ) => {
        const fetch = fetchMock
          .sandbox()
          .getOnce(`${url}api/v2/resolve?identifier=${preprintId.value}`, { body: { uuid: preprintUuid } })
          .postOnce(
            {
              url: `${url}api/v2/full-reviews`,
              headers: { 'X-Api-App': app, 'X-Api-Key': key },
              body: {
                preprint: preprintUuid,
                doi: reviewDoi,
                authors: [{ orcid: user.orcid, public: true }],
                isPublished: true,
                contents: '<p>hello</p>',
              },
            },
            response,
          )

        const actual = await _.createPrereviewOnLegacyPrereview({
          conduct: 'yes',
          otherAuthors,
          persona: 'public',
          preprint: {
            id: preprintId,
            language: 'en',
            title: rawHtml('foo'),
          },
          review: rawHtml('<p>hello</p>'),
          language: Option.none(),
          license,
          locale,
          structured,
          user,
        })(reviewDoi)({
          clock: SystemClock,
          fetch,
          legacyPrereviewApi: { app, key, url, update: true },
          logger: () => IO.of(undefined),
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
      },
    )

    test.prop([
      fc.string(),
      fc.string(),
      fc.origin(),
      fc.user(),
      fc.preprintIdWithDoi(),
      fc.boolean(),
      fc.uuid(),
      fc.doi(),
      fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
      fc.record({ status: fc.integer(), body: fc.string() }),
      fc.constant('CC-BY-4.0'),
      fc.supportedLocale(),
    ])(
      'when the preprint cannot be resolved',
      async (
        app,
        key,
        url,
        user,
        preprintId,
        structured,
        preprintUuid,
        reviewDoi,
        otherAuthors,
        response,
        license,
        locale,
      ) => {
        const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/resolve?identifier=${preprintId.value}`, response)

        const actual = await _.createPrereviewOnLegacyPrereview({
          conduct: 'yes',
          otherAuthors,
          persona: 'public',
          preprint: {
            id: preprintId,
            language: 'en',
            title: rawHtml('foo'),
          },
          review: rawHtml('<p>hello</p>'),
          language: Option.none(),
          license,
          locale,
          structured,
          user,
        })(reviewDoi)({
          clock: SystemClock,
          fetch,
          legacyPrereviewApi: { app, key, url, update: true },
          logger: () => IO.of(undefined),
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([
      fc.user(),
      fc.string(),
      fc.string(),
      fc.origin(),
      fc.preprintIdWithDoi(),
      fc.boolean(),
      fc.doi(),
      fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
      fc.error(),
      fc.constant('CC-BY-4.0'),
      fc.supportedLocale(),
    ])(
      'when fetch throws an error',
      async (user, app, key, url, preprintId, structured, reviewDoi, otherAuthors, error, license, locale) => {
        const actual = await _.createPrereviewOnLegacyPrereview({
          conduct: 'yes',
          otherAuthors,
          persona: 'public',
          preprint: {
            id: preprintId,
            language: 'en',
            title: rawHtml('foo'),
          },
          review: rawHtml('<p>hello</p>'),
          language: Option.none(),
          license,
          locale,
          structured,
          user,
        })(reviewDoi)({
          clock: SystemClock,
          fetch: () => Promise.reject(error),
          legacyPrereviewApi: { app, key, url, update: true },
          logger: () => IO.of(undefined),
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
      },
    )
  })

  test.prop([
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.user(),
    fc.preprintIdWithDoi(),
    fc.boolean(),
    fc.uuid(),
    fc.doi(),
    fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
    fc.constant('CC-BY-4.0'),
    fc.supportedLocale(),
  ])(
    'when the legacy PREreview should not be updated',
    async (app, key, url, user, preprintId, structured, preprintUuid, reviewDoi, otherAuthors, license, locale) => {
      const actual = await _.createPrereviewOnLegacyPrereview({
        conduct: 'yes',
        otherAuthors,
        persona: 'public',
        preprint: {
          id: preprintId,
          language: 'en',
          title: rawHtml('foo'),
        },
        review: rawHtml('<p>hello</p>'),
        language: Option.none(),
        license,
        locale,
        structured,
        user,
      })(reviewDoi)({
        clock: SystemClock,
        fetch: shouldNotBeCalled,
        legacyPrereviewApi: { app, key, url, update: false },
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
    },
  )
})

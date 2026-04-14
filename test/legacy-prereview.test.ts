import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as StatusCodes from '../src/StatusCodes.ts'
import * as _ from '../src/legacy-prereview.ts'
import * as fc from './fc.ts'

describe('getPreprintDoiFromLegacyPreviewUuid', () => {
  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.preprintDoi()])(
    'when the DOI can be decoded',
    async (uuid, app, key, url, doi) => {
      const fetch = fetchMock.createInstance().getOnce({
        url: `${url}api/v2/preprints/${encodeURIComponent(uuid)}`,
        headers: { 'X-Api-App': app, 'X-Api-Key': key },
        response: {
          body: { data: [{ handle: `doi:${doi}` }] },
        },
      })

      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch: (...args) => fetch.fetchHandler(...args),
        legacyPrereviewApi: { app, key, url },
      })()

      expect(actual).toStrictEqual(E.right(expect.objectContaining({ value: doi })))
    },
  )

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.nonPreprintDoi()])(
    'when the DOI is not a preprint DOI',
    async (uuid, app, key, url, doi) => {
      const fetch = fetchMock.createInstance().getOnce({
        url: `${url}api/v2/preprints/${encodeURIComponent(uuid)}`,
        headers: { 'X-Api-App': app, 'X-Api-Key': key },
        response: {
          body: { data: [{ handle: `doi:${doi}` }] },
        },
      })

      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch: (...args) => fetch.fetchHandler(...args),
        legacyPrereviewApi: { app, key, url },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])('when the response cannot be decoded', async (uuid, app, key, url, response) => {
    const fetch = fetchMock.createInstance().getOnce(`${url}api/v2/preprints/${encodeURIComponent(uuid)}`, response)

    const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.boolean()])(
    'when the response has a 404 status code',
    async (uuid, app, key, url) => {
      const fetch = fetchMock
        .createInstance()
        .getOnce(`${url}api/v2/preprints/${encodeURIComponent(uuid)}`, StatusCodes.NotFound)

      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch: (...args) => fetch.fetchHandler(...args),
        legacyPrereviewApi: { app, key, url },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK && status !== StatusCodes.NotFound),
  ])('when the response has a non-200/404 status code', async (uuid, app, key, url, status) => {
    const fetch = fetchMock.createInstance().getOnce(`${url}api/v2/preprints/${encodeURIComponent(uuid)}`, status)

    const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.error()])(
    'when fetch throws an error',
    async (uuid, app, key, url, error) => {
      const actual = await _.getPreprintIdFromLegacyPreviewUuid(uuid)({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url },
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
  ])('when the response can be decoded', async (uuid, app, key, url, [data, profile]) => {
    const fetch = fetchMock.createInstance().getOnce({
      url: `${url}api/v2/personas/${encodeURIComponent(uuid)}`,
      headers: { 'X-Api-App': app, 'X-Api-Key': key },
      response: {
        body: { data: [data] },
      },
    })

    const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.right(profile))
  })

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])('when the response cannot be decoded', async (uuid, app, key, url, response) => {
    const fetch = fetchMock.createInstance().getOnce(`${url}api/v2/personas/${encodeURIComponent(uuid)}`, response)

    const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin()])(
    'when the response has a 404 status code',
    async (uuid, app, key, url) => {
      const fetch = fetchMock
        .createInstance()
        .getOnce(`${url}api/v2/personas/${encodeURIComponent(uuid)}`, StatusCodes.NotFound)

      const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
        fetch: (...args) => fetch.fetchHandler(...args),
        legacyPrereviewApi: { app, key, url },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.uuid(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK && status !== StatusCodes.NotFound),
  ])('when the response has a non-200/404 status code', async (uuid, app, key, url, status) => {
    const fetch = fetchMock.createInstance().getOnce(`${url}api/v2/personas/${encodeURIComponent(uuid)}`, status)

    const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([fc.uuid(), fc.string(), fc.string(), fc.origin(), fc.error()])(
    'when fetch throws an error',
    async (uuid, app, key, url, error) => {
      const actual = await _.getProfileIdFromLegacyPreviewUuid(uuid)({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url },
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('createUserOnLegacyPrereview', () => {
  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.string(), fc.origin(), fc.pseudonym()])(
    'when the user can be created',
    async (orcid, name, app, key, url, pseudonym) => {
      const fetch = fetchMock.createInstance().postOnce({
        url: `${url}api/v2/users`,
        headers: { 'X-Api-App': app, 'X-Api-Key': key },
        body: { orcid, name },
        response: { status: StatusCodes.Created, body: pseudonym },
      })

      const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
        fetch: (...args) => fetch.fetchHandler(...args),
        legacyPrereviewApi: { app, key, url },
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
    fc.fetchResponse({ status: fc.constant(StatusCodes.Created) }),
  ])('when the user cannot be decoded', async (orcid, name, app, key, url, response) => {
    const fetch = fetchMock.createInstance().postOnce({
      url: `${url}api/v2/users`,
      headers: { 'X-Api-App': app, 'X-Api-Key': key },
      body: { orcid, name },
      response,
    })

    const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.Created),
  ])('when the response has a non-201 status code', async (orcid, name, app, key, url, status) => {
    const fetch = fetchMock.createInstance().postOnce({
      url: `${url}api/v2/users`,
      headers: { 'X-Api-App': app, 'X-Api-Key': key },
      body: { orcid, name },
      response: status,
    })

    const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.string(), fc.origin(), fc.error()])(
    'when fetch throws an error',
    async (orcid, name, app, key, url, error) => {
      const actual = await _.createUserOnLegacyPrereview({ orcid, name })({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url },
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
  ])('when the user can be decoded', async (orcid, app, key, url, [pseudonym, personas]) => {
    const fetch = fetchMock.createInstance().getOnce({
      matcherFunction: ({ options }) => options.cache === 'force-cache',
      url: `${url}api/v2/users/${encodeURIComponent(orcid)}`,
      headers: { 'X-Api-App': app, 'X-Api-Key': key },
      response: { body: { data: { personas } } },
    })

    const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.right(pseudonym))
  })

  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])('when the user cannot be decoded', async (orcid, app, key, url, response) => {
    const fetch = fetchMock.createInstance().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, response)

    const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.origin()])(
    'when the response has a 404 status code',
    async (orcid, app, key, url) => {
      const fetch = fetchMock
        .createInstance()
        .getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, StatusCodes.NotFound)

      const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
        fetch: (...args) => fetch.fetchHandler(...args),
        legacyPrereviewApi: { app, key, url },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.orcidId(),
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK && status !== StatusCodes.NotFound),
  ])('when the response has a non-200/404 status code', async (orcid, app, key, url, status) => {
    const fetch = fetchMock.createInstance().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, status)

    const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: { app, key, url },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })

  test.prop([fc.orcidId(), fc.string(), fc.string(), fc.origin(), fc.error()])(
    'when fetch throws an error',
    async (orcid, app, key, url, error) => {
      const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
        fetch: () => Promise.reject(error),
        legacyPrereviewApi: { app, key, url },
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getRapidPreviewsFromLegacyPrereview', () => {
  test.prop([fc.string(), fc.string(), fc.origin(), fc.preprintIdWithDoi()])(
    'when the Rapid PREreviews can be loaded',
    async (app, key, url, preprintId) => {
      const actual = await _.getRapidPreviewsFromLegacyPrereview(preprintId)({
        fetch: (...args) =>
          fetchMock
            .createInstance()
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
            )
            .fetchHandler(...args),
        legacyPrereviewApi: {
          app,
          key,
          url,
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

  test.prop([fc.string(), fc.string(), fc.origin(), fc.preprintIdWithDoi()])(
    'when the Rapid PREreviews cannot be found',
    async (app, key, url, preprintId) => {
      const actual = await _.getRapidPreviewsFromLegacyPrereview(preprintId)({
        fetch: (...args) =>
          fetchMock
            .createInstance()
            .getOnce(
              `${url}api/v2/preprints/doi-${encodeURIComponent(
                preprintId.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
              )}/rapid-reviews`,
              { status: StatusCodes.NotFound },
            )
            .fetchHandler(...args),
        legacyPrereviewApi: {
          app,
          key,
          url,
        },
      })()

      expect(actual).toStrictEqual(E.right([]))
    },
  )

  test.prop([
    fc.string(),
    fc.string(),
    fc.origin(),
    fc.preprintIdWithDoi(),
    fc.integer({ min: 400, max: 599 }).filter(status => status !== StatusCodes.NotFound),
  ])('when the Rapid PREreviews cannot be loaded', async (app, key, url, preprintId, status) => {
    const fetch = fetchMock
      .createInstance()
      .getOnce(
        `${url}api/v2/preprints/doi-${encodeURIComponent(
          preprintId.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
        )}/rapid-reviews`,
        { status },
      )

    const actual = await _.getRapidPreviewsFromLegacyPrereview(preprintId)({
      fetch: (...args) => fetch.fetchHandler(...args),
      legacyPrereviewApi: {
        app,
        key,
        url,
      },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.callHistory.done()).toBeTruthy()
  })
})

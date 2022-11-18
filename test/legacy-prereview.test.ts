import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/legacy-prereview'
import * as fc from './fc'

describe('legacy-prereview', () => {
  describe('getPseudonymFromLegacyPrereview', () => {
    fc.test(
      'when the user can be decoded',
      [fc.orcid(), fc.string(), fc.string(), fc.origin(), fc.string()],
      async (orcid, app, key, url, pseudonym) => {
        const fetch = fetchMock.sandbox().getOnce(
          {
            url: `${url}api/v2/users/${encodeURIComponent(orcid)}`,
            headers: { 'X-Api-App': app, 'X-Api-Key': key },
          },
          {
            body: {
              data: {
                personas: [
                  {
                    isAnonymous: true,
                    name: pseudonym,
                  },
                ],
              },
            },
          },
        )

        const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
          fetch,
          legacyPrereviewApi: { app, key, url },
        })()

        expect(actual).toStrictEqual(E.right(pseudonym))
      },
    )

    fc.test(
      'when the work cannot be decoded',
      [fc.orcid(), fc.string(), fc.string(), fc.origin(), fc.fetchResponse({ status: fc.constant(Status.OK) })],
      async (orcid, app, key, url, response) => {
        const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, response)

        const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
          fetch,
          legacyPrereviewApi: { app, key, url },
        })()

        expect(actual).toStrictEqual(E.left(expect.anything()))
      },
    )

    fc.test(
      'when the response has a 404 status code',
      [fc.orcid(), fc.string(), fc.string(), fc.origin()],
      async (orcid, app, key, url) => {
        const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, Status.NotFound)

        const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
          fetch,
          legacyPrereviewApi: { app, key, url },
        })()

        expect(actual).toStrictEqual(E.left('no-pseudonym'))
      },
    )

    fc.test(
      'when the response has a non-200/404 status code',
      [
        fc.orcid(),
        fc.string(),
        fc.string(),
        fc.origin(),
        fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
      ],
      async (orcid, app, key, url, status) => {
        const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, status)

        const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
          fetch,
          legacyPrereviewApi: { app, key, url },
        })()

        expect(actual).toStrictEqual(E.left(expect.objectContaining({ status })))
      },
    )

    fc.test(
      'when fetch throws an error',
      [fc.orcid(), fc.string(), fc.string(), fc.origin(), fc.error()],
      async (orcid, app, key, url, error) => {
        const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
          fetch: () => Promise.reject(error),
          legacyPrereviewApi: { app, key, url },
        })()

        expect(actual).toStrictEqual(E.left(error))
      },
    )
  })
})

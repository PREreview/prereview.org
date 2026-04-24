import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as StatusCodes from '../src/StatusCodes.ts'
import * as _ from '../src/legacy-prereview.ts'
import * as fc from './fc.ts'

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

import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { rawHtml } from '../src/html'
import * as _ from '../src/legacy-prereview'
import * as fc from './fc'

describe('legacy-prereview', () => {
  describe('getPseudonymFromLegacyPrereview', () => {
    test.prop([fc.orcid(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.string()])(
      'when the user can be decoded',
      async (orcid, app, key, url, update, pseudonym) => {
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
          legacyPrereviewApi: { app, key, url, update },
        })()

        expect(actual).toStrictEqual(E.right(pseudonym))
      },
    )

    test.prop([
      fc.orcid(),
      fc.string(),
      fc.string(),
      fc.origin(),
      fc.boolean(),
      fc.fetchResponse({ status: fc.constant(Status.OK) }),
    ])('when the work cannot be decoded', async (orcid, app, key, url, update, response) => {
      const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, response)

      const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })

    test.prop([fc.orcid(), fc.string(), fc.string(), fc.origin(), fc.boolean()])(
      'when the response has a 404 status code',
      async (orcid, app, key, url, update) => {
        const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, Status.NotFound)

        const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
          fetch,
          legacyPrereviewApi: { app, key, url, update },
        })()

        expect(actual).toStrictEqual(E.left('no-pseudonym'))
      },
    )

    test.prop([
      fc.orcid(),
      fc.string(),
      fc.string(),
      fc.origin(),
      fc.boolean(),
      fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
    ])('when the response has a non-200/404 status code', async (orcid, app, key, url, update, status) => {
      const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/users/${encodeURIComponent(orcid)}`, status)

      const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
        fetch,
        legacyPrereviewApi: { app, key, url, update },
      })()

      expect(actual).toStrictEqual(E.left(expect.objectContaining({ status })))
    })

    test.prop([fc.orcid(), fc.string(), fc.string(), fc.origin(), fc.boolean(), fc.error()])(
      'when fetch throws an error',
      async (orcid, app, key, url, update, error) => {
        const actual = await _.getPseudonymFromLegacyPrereview(orcid)({
          fetch: () => Promise.reject(error),
          legacyPrereviewApi: { app, key, url, update },
        })()

        expect(actual).toStrictEqual(E.left(error))
      },
    )
  })

  describe('createPrereviewOnLegacyPrereview', () => {
    describe('when the legacy PREreview should be updated', () => {
      test.prop([fc.string(), fc.string(), fc.origin(), fc.orcid(), fc.preprintDoi(), fc.uuid(), fc.doi()])(
        'when the review can be posted',
        async (app, key, url, orcid, preprintDoi, preprintId, reviewDoi) => {
          const fetch = fetchMock
            .sandbox()
            .getOnce(`${url}api/v2/resolve?identifier=${preprintDoi}`, { body: { uuid: preprintId } })
            .postOnce(
              {
                url: `${url}api/v2/full-reviews`,
                headers: { 'X-Api-App': app, 'X-Api-Key': key },
                body: {
                  preprint: preprintId,
                  doi: reviewDoi,
                  authors: [{ orcid, public: true }],
                  isPublished: true,
                  contents: '<p>hello</p>',
                },
              },
              { status: Status.Created },
            )

          const actual = await _.createPrereviewOnLegacyPrereview({
            conduct: 'yes',
            persona: 'public',
            preprint: {
              doi: preprintDoi,
              language: 'en',
              title: rawHtml('foo'),
            },
            review: rawHtml('<p>hello</p>'),
            user: { name: 'foo', orcid, pseudonym: 'pseudonym' },
          })(reviewDoi)({
            fetch,
            legacyPrereviewApi: { app, key, url, update: true },
          })()

          expect(actual).toStrictEqual(E.right(undefined))
        },
      )

      test.prop([
        fc.string(),
        fc.string(),
        fc.origin(),
        fc.orcid(),
        fc.preprintDoi(),
        fc.uuid(),
        fc.doi(),
        fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
      ])(
        'when the review cannot be posted',
        async (app, key, url, orcid, preprintDoi, preprintId, reviewDoi, response) => {
          const fetch = fetchMock
            .sandbox()
            .getOnce(`${url}api/v2/resolve?identifier=${preprintDoi}`, { body: { uuid: preprintId } })
            .postOnce(
              {
                url: `${url}api/v2/full-reviews`,
                headers: { 'X-Api-App': app, 'X-Api-Key': key },
                body: {
                  preprint: preprintId,
                  doi: reviewDoi,
                  authors: [{ orcid, public: true }],
                  isPublished: true,
                  contents: '<p>hello</p>',
                },
              },
              response,
            )

          const actual = await _.createPrereviewOnLegacyPrereview({
            conduct: 'yes',
            persona: 'public',
            preprint: {
              doi: preprintDoi,
              language: 'en',
              title: rawHtml('foo'),
            },
            review: rawHtml('<p>hello</p>'),
            user: { name: 'foo', orcid, pseudonym: 'pseudonym' },
          })(reviewDoi)({
            fetch,
            legacyPrereviewApi: { app, key, url, update: true },
          })()

          expect(actual).toStrictEqual(E.left(expect.objectContaining(response)))
        },
      )

      test.prop([
        fc.string(),
        fc.string(),
        fc.origin(),
        fc.orcid(),
        fc.preprintDoi(),
        fc.uuid(),
        fc.doi(),
        fc.record({ status: fc.integer(), body: fc.string() }),
      ])(
        'when the preprint cannot be resolved',
        async (app, key, url, orcid, preprintDoi, preprintId, reviewDoi, response) => {
          const fetch = fetchMock.sandbox().getOnce(`${url}api/v2/resolve?identifier=${preprintDoi}`, response)

          const actual = await _.createPrereviewOnLegacyPrereview({
            conduct: 'yes',
            persona: 'public',
            preprint: {
              doi: preprintDoi,
              language: 'en',
              title: rawHtml('foo'),
            },
            review: rawHtml('<p>hello</p>'),
            user: { name: 'foo', orcid, pseudonym: 'pseudonym' },
          })(reviewDoi)({
            fetch,
            legacyPrereviewApi: { app, key, url, update: true },
          })()

          expect(actual).toStrictEqual(E.left(expect.anything()))
        },
      )

      test.prop([fc.orcid(), fc.string(), fc.string(), fc.origin(), fc.preprintDoi(), fc.doi(), fc.error()])(
        'when fetch throws an error',
        async (orcid, app, key, url, preprintDoi, reviewDoi, error) => {
          const actual = await _.createPrereviewOnLegacyPrereview({
            conduct: 'yes',
            persona: 'public',
            preprint: {
              doi: preprintDoi,
              language: 'en',
              title: rawHtml('foo'),
            },
            review: rawHtml('<p>hello</p>'),
            user: { name: 'foo', orcid, pseudonym: 'pseudonym' },
          })(reviewDoi)({
            fetch: () => Promise.reject(error),
            legacyPrereviewApi: { app, key, url, update: true },
          })()

          expect(actual).toStrictEqual(E.left(error))
        },
      )
    })

    test.prop([fc.string(), fc.string(), fc.origin(), fc.orcid(), fc.preprintDoi(), fc.uuid(), fc.doi()])(
      'when the legacy PREreview should not be updated',
      async (app, key, url, orcid, preprintDoi, preprintId, reviewDoi) => {
        const actual = await _.createPrereviewOnLegacyPrereview({
          conduct: 'yes',
          persona: 'public',
          preprint: {
            doi: preprintDoi,
            language: 'en',
            title: rawHtml('foo'),
          },
          review: rawHtml('<p>hello</p>'),
          user: { name: 'foo', orcid, pseudonym: 'pseudonym' },
        })(reviewDoi)({
          fetch: () => Promise.reject('should not be called'),
          legacyPrereviewApi: { app, key, url, update: false },
        })()

        expect(actual).toStrictEqual(E.right(undefined))
      },
    )
  })
})

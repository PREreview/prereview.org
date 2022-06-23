import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { SubmittedDeposition, SubmittedDepositionC, UnsubmittedDeposition, UnsubmittedDepositionC } from 'zenodo-ts'
import * as _ from '../src/infrastructure'
import { isNonEmptyString } from '../src/string'
import { NewPrereview } from '../src/write-review'
import * as fc from './fc'

describe('infrastructure', () => {
  describe('createRecordOnZenodo', () => {
    test('as a public persona', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<NewPrereview>({
            conduct: fc.constant('yes'),
            persona: fc.constant('public'),
            review: fc.lorem().filter(isNonEmptyString),
            user: fc.user(),
          }),
          fc.string(),
          async (newPrereview, zenodoApiKey) => {
            const unsubmittedDeposition: UnsubmittedDeposition = {
              id: 1,
              links: {
                bucket: new URL('http://example.com/bucket'),
                publish: new URL('http://example.com/publish'),
              },
              metadata: {
                creators: [newPrereview.user],
                description: 'Description',
                prereserve_doi: {
                  doi: '10.5072/zenodo.1055806' as Doi,
                },
                title: 'Title',
                upload_type: 'publication',
                publication_type: 'article',
              },
              state: 'unsubmitted',
              submitted: false,
            }
            const submittedDeposition: SubmittedDeposition = {
              id: 1,
              metadata: {
                creators: [newPrereview.user],
                description: 'Description',
                doi: '10.5072/zenodo.1055806' as Doi,
                title: 'Title',
                upload_type: 'publication',
                publication_type: 'article',
              },
              state: 'done',
              submitted: true,
            }
            const actual = await _.createRecordOnZenodo(newPrereview)({
              fetch: fetchMock
                .sandbox()
                .postOnce(
                  {
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'article',
                        title:
                          'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
                        creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
                        communities: [{ identifier: 'prereview-reviews' }],
                        description: `<p>${newPrereview.review}</p>\n`,
                        related_identifiers: [
                          {
                            scheme: 'doi',
                            identifier: '10.1101/2022.01.13.476201',
                            relation: 'reviews',
                            resource_type: 'publication-preprint',
                          },
                        ],
                      },
                    },
                  },
                  {
                    body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                    status: Status.Created,
                  },
                )
                .putOnce(
                  {
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'text/html' },
                    functionMatcher: (_, req) => req.body === `<p>${newPrereview.review}</p>\n`,
                  },
                  {
                    status: Status.Created,
                  },
                )
                .postOnce('http://example.com/publish', {
                  body: SubmittedDepositionC.encode(submittedDeposition),
                  status: Status.Accepted,
                }),
              zenodoApiKey,
            })()

            expect(actual).toStrictEqual(E.right(submittedDeposition))
          },
        ),
      )
    })

    test('as an anonymous persona', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<NewPrereview>({
            conduct: fc.constant('yes'),
            persona: fc.constant('anonymous'),
            review: fc.lorem().filter(isNonEmptyString),
            user: fc.user(),
          }),
          fc.string(),
          async (newPrereview, zenodoApiKey) => {
            const unsubmittedDeposition: UnsubmittedDeposition = {
              id: 1,
              links: {
                bucket: new URL('http://example.com/bucket'),
                publish: new URL('http://example.com/publish'),
              },
              metadata: {
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                prereserve_doi: {
                  doi: '10.5072/zenodo.1055806' as Doi,
                },
                title: 'Title',
                upload_type: 'publication',
                publication_type: 'article',
              },
              state: 'unsubmitted',
              submitted: false,
            }
            const submittedDeposition: SubmittedDeposition = {
              id: 1,
              metadata: {
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5072/zenodo.1055806' as Doi,
                title: 'Title',
                upload_type: 'publication',
                publication_type: 'article',
              },
              state: 'done',
              submitted: true,
            }
            const actual = await _.createRecordOnZenodo(newPrereview)({
              fetch: fetchMock
                .sandbox()
                .postOnce(
                  {
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'article',
                        title:
                          'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
                        creators: [{ name: 'PREreviewer' }],
                        communities: [{ identifier: 'prereview-reviews' }],
                        description: `<p>${newPrereview.review}</p>\n`,
                        related_identifiers: [
                          {
                            scheme: 'doi',
                            identifier: '10.1101/2022.01.13.476201',
                            relation: 'reviews',
                            resource_type: 'publication-preprint',
                          },
                        ],
                      },
                    },
                  },
                  {
                    body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                    status: Status.Created,
                  },
                )
                .putOnce(
                  {
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'text/html' },
                    functionMatcher: (_, req) => req.body === `<p>${newPrereview.review}</p>\n`,
                  },
                  {
                    status: Status.Created,
                  },
                )
                .postOnce('http://example.com/publish', {
                  body: SubmittedDepositionC.encode(submittedDeposition),
                  status: Status.Accepted,
                }),
              zenodoApiKey,
            })()

            expect(actual).toStrictEqual(E.right(submittedDeposition))
          },
        ),
      )
    })

    test('Zenodo is unavailable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<NewPrereview>({
            conduct: fc.constant('yes'),
            persona: fc.constantFrom('public', 'anonymous'),
            review: fc.lorem().filter(isNonEmptyString),
            user: fc.user(),
          }),
          fc.string(),
          fc.oneof(
            fc.fetchResponse({ status: fc.integer({ min: 400 }) }).map(response => Promise.resolve(response)),
            fc.error().map(error => Promise.reject(error)),
          ),
          async (newPrereview, zenodoApiKey, response) => {
            const actual = await _.createRecordOnZenodo(newPrereview)({
              fetch: () => response,
              zenodoApiKey,
            })()

            expect(actual).toStrictEqual(E.left(expect.anything()))
          },
        ),
      )
    })
  })
})

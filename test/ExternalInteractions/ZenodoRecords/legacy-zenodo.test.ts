import { SystemClock } from 'clock-ts'
import { Array, Effect, Option, String } from 'effect'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as T from 'fp-ts/lib/Task.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { match } from 'ts-pattern'
import {
  type EmptyDeposition,
  EmptyDepositionC,
  type InProgressDeposition,
  InProgressDepositionC,
  type SubmittedDeposition,
  SubmittedDepositionC,
  type UnsubmittedDeposition,
  UnsubmittedDepositionC,
} from 'zenodo-ts'
import type { ClubName } from '../../../src/Domain/Clubs/index.ts'
import type { NewPrereview } from '../../../src/Domain/PreprintReviews/index.ts'
import type * as Prereviewers from '../../../src/Domain/Prereviewers/index.ts'
import * as _ from '../../../src/ExternalInteractions/ZenodoRecords/legacy-zenodo.ts'
import { plainText } from '../../../src/html.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as fc from '../../fc.ts'
import { describe, expect, it, vi } from '../../vitest.ts'

describe('addAuthorToRecordOnZenodo', () => {
  describe('when the deposition is submitted', () => {
    it.effect.prop(
      'with a public name',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const inProgressDeposition: InProgressDeposition = {
            id: 1,
            links: {
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [creator],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              prereserve_doi: { doi },
              publication_type: 'peerreview',
            },
            state: 'inprogress',
            submitted: true,
          }

          const fetch = fetchMock
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [creator, { name: persona.displayName, orcid: persona.orcidId }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'with a pseudonym',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.pseudonymPersona(),
        fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const inProgressDeposition: InProgressDeposition = {
            id: 1,
            links: {
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [{ name: creator.name, orcid: creator.orcid }],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              prereserve_doi: { doi },
              publication_type: 'peerreview',
            },
            state: 'inprogress',
            submitted: true,
          }

          const fetch = fetchMock
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [creator, { name: persona.pseudonym }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when there are multiple other authors',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
        fc.integer({ min: 3 }),
      ],
      ([zenodoApiKey, id, persona, creator, doi, otherAuthors]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator, { name: `${otherAuthors} other authors` }],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const inProgressDeposition: InProgressDeposition = {
            id: 1,
            links: {
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [creator, { name: `${otherAuthors} other authors` }],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              prereserve_doi: { doi },
              publication_type: 'peerreview',
            },
            state: 'inprogress',
            submitted: true,
          }

          const fetch = fetchMock
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [
                    creator,
                    { name: persona.displayName, orcid: persona.orcidId },
                    { name: `${otherAuthors - 1} other authors` },
                  ],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when there are 2 other authors',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator, { name: '2 other authors' }],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const inProgressDeposition: InProgressDeposition = {
            id: 1,
            links: {
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [creator, { name: '2 other authors' }],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              prereserve_doi: { doi },
              publication_type: 'peerreview',
            },
            state: 'inprogress',
            submitted: true,
          }

          const fetch = fetchMock
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [
                    creator,
                    { name: persona.displayName, orcid: persona.orcidId },
                    { name: '1 other author' },
                  ],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when there is 1 other author',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator, { name: '1 other authors' }],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const inProgressDeposition: InProgressDeposition = {
            id: 1,
            links: {
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [creator, { name: '1 other authors' }],
              description: 'Description',
              doi,
              title: 'Title',
              upload_type: 'publication',
              prereserve_doi: { doi },
              publication_type: 'peerreview',
            },
            state: 'inprogress',
            submitted: true,
          }

          const fetch = fetchMock
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [creator, { name: persona.displayName, orcid: persona.orcidId }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )
  })

  it.effect.prop(
    'when the deposition is not submitted',
    [
      fc.string(),
      fc.integer({ min: 1 }),
      fc.persona(),
      fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
      fc.doi(),
    ],
    ([zenodoApiKey, id, persona, creator, doi]) =>
      Effect.gen(function* () {
        const inProgressDeposition: InProgressDeposition = {
          id: 1,
          links: {
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            creators: [creator],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            prereserve_doi: { doi },
            publication_type: 'peerreview',
          },
          state: 'inprogress',
          submitted: true,
        }

        const fetch = fetchMock.createInstance().getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
          body: InProgressDepositionC.encode(inProgressDeposition),
        })

        const actual = yield* Effect.promise(
          _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'Zenodo is unavailable',
    [
      fc.string(),
      fc.integer({ min: 1 }),
      fc.persona(),
      fc.oneof(
        fc
          .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
          .map(response => Promise.resolve(response)),
        fc.error().map(error => Promise.reject(error)),
      ),
    ],
    ([zenodoApiKey, id, persona, response]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.addAuthorToRecordOnZenodo(
            id,
            persona,
          )({
            fetch: () => response,
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('createRecordOnZenodo', () => {
  describe('as a public persona', () => {
    it.effect.prop(
      'with a PREreview',
      [
        fc.record<Omit<NewPrereview, 'club'> & { club: Option.Option<ClubName> }>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.name(), emailAddress: fc.emailAddress() })),
          persona: fc.publicPersona(),
          club: fc.maybe(fc.clubName()),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(false),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.name() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
          const getPreprintSubjects = vi.fn<_.GetPreprintSubjectsEnv['getPreprintSubjects']>(() => T.of(subjects))
          const isReviewRequested = vi.fn<_.IsReviewRequestedEnv['isReviewRequested']>(() => TE.right(requested))

          const emptyDeposition: EmptyDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              prereserve_doi: {
                doi: reviewDoi,
              },
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const unsubmittedDeposition: UnsubmittedDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [
                {
                  name: (newPrereview.persona as Prereviewers.PublicPersona).displayName,
                  orcid: (newPrereview.persona as Prereviewers.PublicPersona).orcidId,
                },
              ],
              description: 'Description',
              prereserve_doi: {
                doi: reviewDoi,
              },
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [
                {
                  name: (newPrereview.persona as Prereviewers.PublicPersona).displayName,
                  orcid: (newPrereview.persona as Prereviewers.PublicPersona).orcidId,
                },
              ],
              description: 'Description',
              doi: reviewDoi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const reviewUrl = `${publicUrl.href.slice(0, -1)}${Routes.Review.href({ id: 1 })}`

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          {
                            name: (newPrereview.persona as Prereviewers.PublicPersona).displayName,
                            orcid: (newPrereview.persona as Prereviewers.PublicPersona).orcidId,
                          },
                          ...match(newPrereview.otherAuthors.length)
                            .with(0, () => [])
                            .with(1, () => [{ name: '1 other author' }])
                            .otherwise(number => [{ name: `${number} other authors` }]),
                        ],
                        ...Option.match(newPrereview.club, {
                          onSome: club => ({ contributors: [{ name: club.name, type: 'ResearchGroup' }] }),
                          onNone: () => ({}),
                        }),
                        license: match(newPrereview.license)
                          .with('CC-BY-4.0', () => 'cc-by-4.0')
                          .with('CC0-1.0', () => 'cc-zero')
                          .exhaustive(),
                        communities: [{ identifier: 'prereview-reviews' }],
                        description: `<p><strong>This Zenodo record is a permanently preserved version of a PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                        ...(requested ? { keywords: ['Requested PREreview'] } : {}),
                        ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                        ...(Array.isArrayNonEmpty(subjects)
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
                          : {}),
                        related_identifiers: [
                          {
                            ..._.toExternalIdentifier(newPrereview.preprint.id),
                            relation: 'reviews',
                            resource_type: 'publication-preprint',
                          },
                          {
                            identifier: reviewUrl,
                            relation: 'isIdenticalTo',
                            resource_type: 'publication-peerreview',
                            scheme: 'url',
                          },
                        ],
                      },
                    },
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects,
              isReviewRequested,
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
          expect(getPreprintSubjects).toHaveBeenCalledWith(newPrereview.preprint.id)
          expect(isReviewRequested).toHaveBeenCalledWith(newPrereview.preprint.id)
        }),
    )

    it.effect.prop(
      'with a Structured PREreview',
      [
        fc.record<Omit<NewPrereview, 'club'> & { club: Option.Option<ClubName> }>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.name(), emailAddress: fc.emailAddress() })),
          persona: fc.publicPersona(),
          club: fc.maybe(fc.clubName()),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(true),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.name() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
          const getPreprintSubjects = vi.fn<_.GetPreprintSubjectsEnv['getPreprintSubjects']>(() => T.of(subjects))
          const isReviewRequested = vi.fn<_.IsReviewRequestedEnv['isReviewRequested']>(() => TE.right(requested))

          const emptyDeposition: EmptyDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              prereserve_doi: {
                doi: reviewDoi,
              },
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const unsubmittedDeposition: UnsubmittedDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [
                {
                  name: (newPrereview.persona as Prereviewers.PublicPersona).displayName,
                  orcid: (newPrereview.persona as Prereviewers.PublicPersona).orcidId,
                },
              ],
              description: 'Description',
              prereserve_doi: {
                doi: reviewDoi,
              },
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [
                {
                  name: (newPrereview.persona as Prereviewers.PublicPersona).displayName,
                  orcid: (newPrereview.persona as Prereviewers.PublicPersona).orcidId,
                },
              ],
              description: 'Description',
              doi: reviewDoi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const reviewUrl = `${publicUrl.href.slice(0, -1)}${Routes.Review.href({ id: 1 })}`

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`Structured PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          {
                            name: (newPrereview.persona as Prereviewers.PublicPersona).displayName,
                            orcid: (newPrereview.persona as Prereviewers.PublicPersona).orcidId,
                          },
                          ...match(newPrereview.otherAuthors.length)
                            .with(0, () => [])
                            .with(1, () => [{ name: '1 other author' }])
                            .otherwise(number => [{ name: `${number} other authors` }]),
                        ],
                        ...Option.match(newPrereview.club, {
                          onSome: club => ({ contributors: [{ name: club.name, type: 'ResearchGroup' }] }),
                          onNone: () => ({}),
                        }),
                        license: match(newPrereview.license)
                          .with('CC-BY-4.0', () => 'cc-by-4.0')
                          .with('CC0-1.0', () => 'cc-zero')
                          .exhaustive(),
                        communities: [{ identifier: 'prereview-reviews' }],
                        description: `<p><strong>This Zenodo record is a permanently preserved version of a Structured PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                        keywords: [requested ? 'Requested PREreview' : undefined, 'Structured PREreview'].filter(
                          String.isString,
                        ),
                        ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                        ...(Array.isArrayNonEmpty(subjects)
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
                          : {}),
                        related_identifiers: [
                          {
                            ..._.toExternalIdentifier(newPrereview.preprint.id),
                            relation: 'reviews',
                            resource_type: 'publication-preprint',
                          },
                          {
                            identifier: reviewUrl,
                            relation: 'isIdenticalTo',
                            resource_type: 'publication-peerreview',
                            scheme: 'url',
                          },
                        ],
                      },
                    },
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects,
              isReviewRequested,
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
          expect(getPreprintSubjects).toHaveBeenCalledWith(newPrereview.preprint.id)
          expect(isReviewRequested).toHaveBeenCalledWith(newPrereview.preprint.id)
        }),
    )
  })

  describe('as an pseudonym persona', () => {
    it.effect.prop(
      'with a PREreview',
      [
        fc.record<Omit<NewPrereview, 'club'> & { club: Option.Option<ClubName> }>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.name(), emailAddress: fc.emailAddress() })),
          persona: fc.pseudonymPersona(),
          club: fc.maybe(fc.clubName()),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(false),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.name() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
          const emptyDeposition: EmptyDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              prereserve_doi: {
                doi: reviewDoi,
              },
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const unsubmittedDeposition: UnsubmittedDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              prereserve_doi: {
                doi: reviewDoi,
              },
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              doi: reviewDoi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const reviewUrl = `${publicUrl.href.slice(0, -1)}${Routes.Review.href({ id: 1 })}`

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          { name: (newPrereview.persona as Prereviewers.PseudonymPersona).pseudonym },
                          ...match(newPrereview.otherAuthors.length)
                            .with(0, () => [])
                            .with(1, () => [{ name: '1 other author' }])
                            .otherwise(number => [{ name: `${number} other authors` }]),
                        ],
                        ...Option.match(newPrereview.club, {
                          onSome: club => ({ contributors: [{ name: club.name, type: 'ResearchGroup' }] }),
                          onNone: () => ({}),
                        }),
                        license: match(newPrereview.license)
                          .with('CC-BY-4.0', () => 'cc-by-4.0')
                          .with('CC0-1.0', () => 'cc-zero')
                          .exhaustive(),
                        communities: [{ identifier: 'prereview-reviews' }],
                        description: `<p><strong>This Zenodo record is a permanently preserved version of a PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                        ...(requested ? { keywords: ['Requested PREreview'] } : {}),
                        ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                        ...(Array.isArrayNonEmpty(subjects)
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
                          : {}),
                        related_identifiers: [
                          {
                            ..._.toExternalIdentifier(newPrereview.preprint.id),
                            relation: 'reviews',
                            resource_type: 'publication-preprint',
                          },
                          {
                            identifier: reviewUrl,
                            relation: 'isIdenticalTo',
                            resource_type: 'publication-peerreview',
                            scheme: 'url',
                          },
                        ],
                      },
                    },
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects: () => T.of(subjects),
              isReviewRequested: () => TE.right(requested),
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
        }),
    )

    it.effect.prop(
      'with a Structured PREreview',
      [
        fc.record<Omit<NewPrereview, 'club'> & { club: Option.Option<ClubName> }>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.name(), emailAddress: fc.emailAddress() })),
          persona: fc.pseudonymPersona(),
          club: fc.maybe(fc.clubName()),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(true),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.name() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
          const emptyDeposition: EmptyDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              prereserve_doi: {
                doi: reviewDoi,
              },
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const unsubmittedDeposition: UnsubmittedDeposition = {
            id: 1,
            links: {
              bucket: new URL('http://example.com/bucket'),
              publish: new URL('http://example.com/publish'),
              self: new URL('http://example.com/self'),
            },
            metadata: {
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              prereserve_doi: {
                doi: reviewDoi,
              },
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'unsubmitted',
            submitted: false,
          }
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              doi: reviewDoi,
              title: 'Title',
              upload_type: 'publication',
              publication_type: 'peerreview',
            },
            state: 'done',
            submitted: true,
          }
          const reviewUrl = `${publicUrl.href.slice(0, -1)}${Routes.Review.href({ id: 1 })}`

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`Structured PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          { name: (newPrereview.persona as Prereviewers.PseudonymPersona).pseudonym },
                          ...match(newPrereview.otherAuthors.length)
                            .with(0, () => [])
                            .with(1, () => [{ name: '1 other author' }])
                            .otherwise(number => [{ name: `${number} other authors` }]),
                        ],
                        ...Option.match(newPrereview.club, {
                          onSome: club => ({ contributors: [{ name: club.name, type: 'ResearchGroup' }] }),
                          onNone: () => ({}),
                        }),
                        license: match(newPrereview.license)
                          .with('CC-BY-4.0', () => 'cc-by-4.0')
                          .with('CC0-1.0', () => 'cc-zero')
                          .exhaustive(),
                        communities: [{ identifier: 'prereview-reviews' }],
                        description: `<p><strong>This Zenodo record is a permanently preserved version of a Structured PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                        keywords: [requested ? 'Requested PREreview' : undefined, 'Structured PREreview'].filter(
                          String.isString,
                        ),
                        ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                        ...(Array.isArrayNonEmpty(subjects)
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
                          : {}),
                        related_identifiers: [
                          {
                            ..._.toExternalIdentifier(newPrereview.preprint.id),
                            relation: 'reviews',
                            resource_type: 'publication-preprint',
                          },
                          {
                            identifier: reviewUrl,
                            relation: 'isIdenticalTo',
                            resource_type: 'publication-peerreview',
                            scheme: 'url',
                          },
                        ],
                      },
                    },
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects: () => T.of(subjects),
              isReviewRequested: () => TE.right(requested),
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
        }),
    )
  })

  it.effect.prop(
    'Zenodo is unavailable',
    [
      fc.record<Omit<NewPrereview, 'club'> & { club: Option.Option<ClubName> }>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.name(), emailAddress: fc.emailAddress() })),
        persona: fc.persona(),
        club: fc.maybe(fc.clubName()),
        preprint: fc.preprintTitle(),
        review: fc.html(),
        language: fc.maybe(fc.languageCode()),
        license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
        locale: fc.supportedLocale(),
        structured: fc.boolean(),
        user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
      }),
      fc.array(fc.record({ id: fc.url(), name: fc.name() })),
      fc.boolean(),
      fc.string(),
      fc.origin(),
      fc.oneof(
        fc
          .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
          .map(response => Promise.resolve(response)),
        fc.error().map(error => Promise.reject(error)),
      ),
    ],
    ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, response]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.createRecordOnZenodo(newPrereview)({
            clock: SystemClock,
            fetch: () => response,
            getPreprintSubjects: () => T.of(subjects),
            isReviewRequested: () => TE.right(requested),
            logger: () => IO.of(undefined),
            publicUrl,
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('toExternalIdentifier', () => {
  it.prop('with a DOI preprint ID', [fc.preprintIdWithDoi()], ([preprintId]) => {
    expect(_.toExternalIdentifier(preprintId)).toStrictEqual({
      scheme: 'doi',
      identifier: preprintId.value,
    })
  })

  it.prop('with a PhilSci preprint ID', [fc.philsciPreprintId()], ([preprintId]) => {
    expect(_.toExternalIdentifier(preprintId)).toStrictEqual({
      scheme: 'url',
      identifier: `https://philsci-archive.pitt.edu/${preprintId.value}/`,
    })
  })
})

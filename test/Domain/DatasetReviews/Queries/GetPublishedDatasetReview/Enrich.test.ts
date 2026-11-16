import { expect, it } from '../../../../vitest.ts'
import { Effect, Layer, Option, Struct } from 'effect'
import { ClubNotFound, Clubs } from '../../../../../src/Domain/Clubs/index.ts'
import * as _ from '../../../../../src/Domain/DatasetReviews/Queries/GetPublishedDatasetReview/Enrich.ts'
import { PublishedDatasetReview } from '../../../../../src/Domain/DatasetReviews/Queries/GetPublishedDatasetReview/Types.ts'
import { DatasetIsNotFound, DatasetIsUnavailable, Datasets } from '../../../../../src/Domain/Datasets/index.ts'
import { Prereviewers, UnableToGetPersona } from '../../../../../src/Domain/Prereviewers/index.ts'
import { OrcidId, Uuid } from '../../../../../src/types/index.ts'
import * as fc from '../../../../fc.ts'

const publicAuthor = fc.constant({ orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' as const })

const notInAClub = fc
  .publishedDatasetReview({ author: publicAuthor })
  .map(review => ({ ...review, clubId: Option.none() }))

it.effect.prop(
  'with a public author',
  [notInAClub, fc.publicPersona(), fc.dataset()],
  ([publishedReview, persona, dataset]) =>
    Effect.gen(function* () {
      const actual = yield* _.Enrich(publishedReview)

      expect(actual).toStrictEqual(
        new PublishedDatasetReview({
          ...Struct.omit(publishedReview, ['clubId']),
          author: persona,
          otherAuthors: [],
          anonymousAuthors: 0,
          club: Option.none(),
          dataset,
        }),
      )
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, {}),
        Layer.mock(Datasets, { getDataset: () => Effect.succeed(dataset) }),
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

it.effect.prop(
  'with other authors',
  [notInAClub, fc.publicPersona(), fc.dataset(), fc.integer({ min: 1, max: 5 })],
  ([publishedReview, persona, dataset, anonymousAuthors]) =>
    Effect.gen(function* () {
      const actual = yield* _.Enrich({
        ...publishedReview,
        otherAuthors: [{ orcidId: OrcidId.OrcidId('0000-0002-6109-0367'), persona: 'public' }],
        anonymousAuthors,
      })

      expect(actual.otherAuthors).toStrictEqual([persona])
      expect(actual.anonymousAuthors).toStrictEqual(anonymousAuthors)
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, {}),
        Layer.mock(Datasets, { getDataset: () => Effect.succeed(dataset) }),
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

it.effect.prop(
  'with a pseudonym author',
  [
    fc.publishedDatasetReview({
      author: fc.constant({ orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'pseudonym' }),
    }),
    fc.pseudonymPersona(),
    fc.dataset(),
  ],
  ([publishedReview, persona, dataset]) =>
    Effect.gen(function* () {
      const actual = yield* _.Enrich({ ...publishedReview, clubId: Option.none() })

      expect(actual.author).toStrictEqual(persona)
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, {}),
        Layer.mock(Datasets, { getDataset: () => Effect.succeed(dataset) }),
        Layer.mock(Prereviewers, { getPseudonymPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

it.effect.prop(
  'in a club',
  [notInAClub, fc.publicPersona(), fc.dataset(), fc.clubName()],
  ([publishedReview, persona, dataset, clubName]) =>
    Effect.gen(function* () {
      const actual = yield* _.Enrich({
        ...publishedReview,
        clubId: Option.some(Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')),
      })

      expect(actual.club).toStrictEqual(Option.some(clubName))
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, { getClubName: () => Effect.succeed(clubName) }),
        Layer.mock(Datasets, { getDataset: () => Effect.succeed(dataset) }),
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

it.effect.prop(
  "when the dataset can't be found",
  [
    notInAClub,
    fc.publicPersona(),
    fc
      .datasetId()
      .chain(datasetId =>
        fc.constantFrom(new DatasetIsNotFound({ datasetId }), new DatasetIsUnavailable({ datasetId })),
      ),
  ],
  ([publishedReview, persona, error]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(_.Enrich(publishedReview))

      expect(actual).toStrictEqual(error)
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, {}),
        Layer.mock(Datasets, { getDataset: () => error }),
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

it.effect.prop("when an author's persona can't be found", [notInAClub, fc.dataset()], ([publishedReview, dataset]) =>
  Effect.gen(function* () {
    const actual = yield* Effect.flip(_.Enrich(publishedReview))

    expect(actual).toStrictEqual(new UnableToGetPersona({}))
  }).pipe(
    Effect.provide([
      Layer.mock(Clubs, {}),
      Layer.mock(Datasets, { getDataset: () => Effect.succeed(dataset) }),
      Layer.mock(Prereviewers, { getPublicPersona: () => new UnableToGetPersona({}) }),
    ]),
  ),
)

it.effect.prop(
  "when the club can't be found",
  [notInAClub, fc.publicPersona(), fc.dataset()],
  ([publishedReview, persona, dataset]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.flip(
        _.Enrich({ ...publishedReview, clubId: Option.some(Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')) }),
      )

      expect(actual).toStrictEqual(new ClubNotFound())
    }).pipe(
      Effect.provide([
        Layer.mock(Clubs, { getClubName: () => new ClubNotFound() }),
        Layer.mock(Datasets, { getDataset: () => Effect.succeed(dataset) }),
        Layer.mock(Prereviewers, { getPublicPersona: () => Effect.succeed(persona) }),
      ]),
    ),
)

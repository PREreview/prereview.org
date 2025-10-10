import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfUserCanRateTheQuality.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const authorId2 = OrcidId.OrcidId('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const rated1 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'poor',
  detail: Option.none(),
  datasetReviewId,
})
const rated2 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'excellent',
  detail: NonEmptyString.fromString('some detail'),
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('query', () => {
  test.prop(
    [
      fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted')))),
      fc.uuid(),
      fc.orcidId(),
    ],
    {
      examples: [
        [[], datasetReviewId, authorId], // no events
        [[rated1, datasetReviewWasPublished], datasetReviewId, authorId], // with events
        [[started], datasetReviewId2, authorId], // with events for other dataset review
        [[started, datasetReviewWasPublished], datasetReviewId2, authorId], // with multiple events for other dataset review
      ],
    },
  )('not started', (events, datasetReviewId, userId) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.orcidId())
        .map(([event, userId]) =>
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Uuid.Uuid, OrcidId.OrcidId]>(
            Array.make(event),
            event.datasetReviewId,
            userId,
          ),
        ),
    ],
    {
      examples: [
        [[[started], datasetReviewId, authorId2]], // no events
        [[[started, rated1, datasetReviewWasPublished], datasetReviewId, authorId2]], // with events
      ],
    },
  )('started by another user', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewWasStartedByAnotherUser()))
  })

  test.prop(
    [fc.datasetReviewWasStarted().map(event => Tuple.make(Array.make(event), event.datasetReviewId, event.authorId))],
    {
      examples: [
        [[[started], datasetReviewId, authorId]], // was started
      ],
    },
  )('not rated', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.right(Option.none()))
  })

  test.prop(
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.ratedTheQualityOfTheDataset({ datasetReviewId: fc.constant(datasetReviewId) }),
          ),
        )
        .map(([started, rated]) =>
          Tuple.make(Array.make(started, rated), started.datasetReviewId, started.authorId, rated.rating, rated.detail),
        ),
    ],
    {
      examples: [
        [[[started, rated1], datasetReviewId, authorId, rated1.rating, rated1.detail]], // one rating
        [[[started, rated1, rated2], datasetReviewId, authorId, rated2.rating, rated2.detail]], // two ratings
      ],
    },
  )('has been rated', ([events, datasetReviewId, userId, expectedRating, expectedDetail]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.right(Option.some({ rating: expectedRating, detail: expectedDetail })))
  })

  test.prop(
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.publicationOfDatasetReviewWasRequested({ datasetReviewId: fc.constant(datasetReviewId) }),
          ),
        )
        .map(events =>
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Uuid.Uuid, OrcidId.OrcidId]>(
            events,
            events[0].datasetReviewId,
            events[0].authorId,
          ),
        ),
    ],
    {
      examples: [
        [[[started, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // was requested
        [[[started, rated1, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // also rated
        [[[publicationOfDatasetReviewWasRequested, started, rated1], datasetReviewId, authorId]], // different order
      ],
    },
  )('is being published', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
  })

  test.prop(
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.datasetReviewWasPublished({ datasetReviewId: fc.constant(datasetReviewId) }),
          ),
        )
        .map(events =>
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Uuid.Uuid, OrcidId.OrcidId]>(
            events,
            events[0].datasetReviewId,
            events[0].authorId,
          ),
        ),
    ],
    {
      examples: [
        [[[started, rated1, datasetReviewWasPublished], datasetReviewId, authorId]], // was published
        [
          [
            [started, rated1, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished],
            datasetReviewId,
            authorId,
          ],
        ], // also requested
        [[[started, datasetReviewWasPublished, rated1], datasetReviewId, authorId]], // different order
      ],
    },
  )('has been published', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

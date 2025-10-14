import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfUserCanDeclareFollowingCodeOfConduct.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const authorId2 = OrcidId.OrcidId('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const declaredThatTheCodeOfConductWasFollowedForADatasetReview1 =
  new DatasetReviews.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
    timestamp: Temporal.Now.instant().subtract({ minutes: 1 }),
    datasetReviewId,
  })
const declaredThatTheCodeOfConductWasFollowedForADatasetReview2 =
  new DatasetReviews.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
    timestamp: Temporal.Now.instant(),
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
        [
          [declaredThatTheCodeOfConductWasFollowedForADatasetReview1, datasetReviewWasPublished],
          datasetReviewId,
          authorId,
        ], // with events
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
        [
          [
            [started, declaredThatTheCodeOfConductWasFollowedForADatasetReview1, datasetReviewWasPublished],
            datasetReviewId,
            authorId2,
          ],
        ], // with events
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
  )('not declared', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.right(false))
  })

  test.prop(
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.declaredThatTheCodeOfConductWasFollowedForADatasetReview({
              datasetReviewId: fc.constant(datasetReviewId),
            }),
          ),
        )
        .map(([started, declared]) =>
          Tuple.make(Array.make(started, declared), started.datasetReviewId, started.authorId),
        ),
    ],
    {
      examples: [
        [[[started, declaredThatTheCodeOfConductWasFollowedForADatasetReview1], datasetReviewId, authorId]], // declared once
        [
          [
            [
              started,
              declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
              declaredThatTheCodeOfConductWasFollowedForADatasetReview2,
            ],
            datasetReviewId,
            authorId,
          ],
        ], // declared twice
      ],
    },
  )('has been declared', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.right(true))
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
        [
          [
            [
              started,
              declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
              publicationOfDatasetReviewWasRequested,
            ],
            datasetReviewId,
            authorId,
          ],
        ], // also declared
        [
          [
            [
              publicationOfDatasetReviewWasRequested,
              started,
              declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
            ],
            datasetReviewId,
            authorId,
          ],
        ], // different order
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
        [
          [
            [started, declaredThatTheCodeOfConductWasFollowedForADatasetReview1, datasetReviewWasPublished],
            datasetReviewId,
            authorId,
          ],
        ], // was published
        [
          [
            [
              started,
              declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
              publicationOfDatasetReviewWasRequested,
              datasetReviewWasPublished,
            ],
            datasetReviewId,
            authorId,
          ],
        ], // also requested
        [
          [
            [started, datasetReviewWasPublished, declaredThatTheCodeOfConductWasFollowedForADatasetReview1],
            datasetReviewId,
            authorId,
          ],
        ], // different order
      ],
    },
  )('has been published', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

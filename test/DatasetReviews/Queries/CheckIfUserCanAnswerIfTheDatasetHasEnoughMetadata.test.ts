import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const authorId2 = Orcid.Orcid('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered1 = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({ answer: 'no', datasetReviewId })
const answered2 = new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({ answer: 'yes', datasetReviewId })
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
      fc.orcid(),
    ],
    {
      examples: [
        [[], datasetReviewId, authorId], // no events
        [[answered1, datasetReviewWasPublished], datasetReviewId, authorId], // with events
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
        .tuple(fc.datasetReviewWasStarted(), fc.orcid())
        .map(([event, userId]) =>
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Uuid.Uuid, Orcid.Orcid]>(
            Array.make(event),
            event.datasetReviewId,
            userId,
          ),
        ),
    ],
    {
      examples: [
        [[[started], datasetReviewId, authorId2]], // no events
        [[[started, answered1, datasetReviewWasPublished], datasetReviewId, authorId2]], // with events
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
  )('not answered', ([events, datasetReviewId, userId]) => {
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
            fc.datasetReviewAnsweredIfTheDatasetHasEnoughMetadata({
              datasetReviewId: fc.constant(datasetReviewId),
            }),
          ),
        )
        .map(([started, answered]) =>
          Tuple.make(Array.make(started, answered), started.datasetReviewId, started.authorId, answered.answer),
        ),
    ],
    {
      examples: [
        [[[started, answered1], datasetReviewId, authorId, answered1.answer]], // one answer
        [[[started, answered1, answered2], datasetReviewId, authorId, answered2.answer]], // two answers
      ],
    },
  )('has been answered', ([events, datasetReviewId, userId, expectedAnswer]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.right(Option.some(expectedAnswer)))
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
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Uuid.Uuid, Orcid.Orcid]>(
            events,
            events[0].datasetReviewId,
            events[0].authorId,
          ),
        ),
    ],
    {
      examples: [
        [[[started, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // was requested
        [[[started, answered1, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // also answered
        [[[publicationOfDatasetReviewWasRequested, started, answered1], datasetReviewId, authorId]], // different order
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
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Uuid.Uuid, Orcid.Orcid]>(
            events,
            events[0].datasetReviewId,
            events[0].authorId,
          ),
        ),
    ],
    {
      examples: [
        [[[started, answered1, datasetReviewWasPublished], datasetReviewId, authorId]], // was published
        [
          [
            [started, answered1, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished],
            datasetReviewId,
            authorId,
          ],
        ], // also requested
        [[[started, datasetReviewWasPublished, answered1], datasetReviewId, authorId]], // different order
      ],
    },
  )('has been published', ([events, datasetReviewId, userId]) => {
    const actual = _.query(events, { datasetReviewId, userId })

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

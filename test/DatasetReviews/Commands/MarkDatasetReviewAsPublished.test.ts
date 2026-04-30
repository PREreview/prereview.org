import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/MarkDatasetReviewAsPublished.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered = new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasAssignedADoi = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.1101/12345'),
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('foldState', () => {
  it.prop(
    'not started',
    [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.NotStarted())
    },
    {
      fastCheck: {
        examples: [
          [[]], // no events
          [[answered, datasetReviewWasPublished]], // with events
        ],
      },
    },
  )

  it.prop(
    'publication has not been requested',
    [fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.NotRequested())
    },
    {
      fastCheck: {
        examples: [
          [[started]], // was started
          [[started, answered]], // answered
        ],
      },
    },
  )

  it.prop(
    'not ready',
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.NotReady({ missing: ['DatasetReviewWasAssignedADoi'] }))
    },
    {
      fastCheck: {
        examples: [
          [[started, publicationOfDatasetReviewWasRequested]], // was requested
          [[started, answered, publicationOfDatasetReviewWasRequested]], // also answered
          [[started, publicationOfDatasetReviewWasRequested, answered]], // different order
        ],
      },
    },
  )

  it.prop(
    'is ready',
    [
      fc
        .tuple(
          fc.datasetReviewWasStarted(),
          fc.publicationOfDatasetReviewWasRequested(),
          fc.datasetReviewWasAssignedADoi(),
        )
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.IsReady())
    },
    {
      fastCheck: {
        examples: [
          [[started, publicationOfDatasetReviewWasRequested, datasetReviewWasAssignedADoi]],
          [[started, answered, publicationOfDatasetReviewWasRequested, datasetReviewWasAssignedADoi]], // other events
          [[started, datasetReviewWasAssignedADoi, publicationOfDatasetReviewWasRequested]], // different order
        ],
      },
    },
  )

  it.prop(
    'already marked as published',
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.AlreadyMarkedAsPublished())
    },
    {
      fastCheck: {
        examples: [
          [[started, answered, datasetReviewWasPublished]], // was published
          [
            [
              started,
              answered,
              publicationOfDatasetReviewWasRequested,
              datasetReviewWasAssignedADoi,
              datasetReviewWasPublished,
            ],
          ], // other events
          [[started, datasetReviewWasPublished]], // different order
        ],
      },
    },
  )
})

describe('decide', () => {
  it.prop('has not been started', [fc.plainDate()], ([publicationDate]) => {
    const result = _.decide(new _.NotStarted(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  it.prop('has not been requested', [fc.plainDate()], ([publicationDate]) => {
    const result = _.decide(new _.NotRequested(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.PublicationOfDatasetReviewWasNotRequested()))
  })

  it.prop(
    'is not ready',
    [fc.plainDate(), fc.nonEmptyArray(fc.constant('DatasetReviewWasAssignedADoi'))],
    ([publicationDate, missing]) => {
      const result = _.decide(new _.NotReady({ missing }), { datasetReviewId, publicationDate })

      expect(result).toStrictEqual(
        Either.left(new DatasetReviews.DatasetReviewNotReadyToBeMarkedAsPublished({ missing })),
      )
    },
  )

  it.prop('is ready', [fc.plainDate()], ([publicationDate]) => {
    const result = _.decide(new _.IsReady(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewWasPublished({ datasetReviewId, publicationDate }))),
    )
  })

  it.prop('already marked as published', [fc.plainDate()], ([publicationDate]) => {
    const result = _.decide(new _.AlreadyMarkedAsPublished(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})

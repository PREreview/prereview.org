import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/PublishDatasetReview.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('foldState', () => {
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
    ],
  })('not started', () => {
    const state = _.foldState([])

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.prop(
    [
      fc
        .datasetReviewWasStarted()
        .map(event =>
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.NotReady['missing']]>(
            Array.of(event),
            ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
          ),
        ),
    ],
    {
      examples: [
        [[[started], ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples']]], // was started
      ],
    },
  )('not ready', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotReady({ missing: expected }))
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // answered
        [[answeredIfTheDatasetFollowsFairAndCarePrinciples, started]], // different order
      ],
    },
  )('is ready', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.IsReady())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, publicationOfDatasetReviewWasRequested]], // was requested
        [[started, answeredIfTheDatasetFollowsFairAndCarePrinciples, publicationOfDatasetReviewWasRequested]], // also answered
        [[started, publicationOfDatasetReviewWasRequested, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
      ],
    },
  )('is being published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.IsBeingPublished())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // was published
        [
          [
            started,
            answeredIfTheDatasetFollowsFairAndCarePrinciples,
            publicationOfDatasetReviewWasRequested,
            datasetReviewWasPublished,
          ],
        ], // also requested
        [[started, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
      ],
    },
  )('has been published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasBeenPublished())
  })
})

describe('decide', () => {
  test('has not been started', () => {
    const result = _.decide(new _.NotStarted(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.prop([fc.nonEmptyArray(fc.constant('AnsweredIfTheDatasetFollowsFairAndCarePrinciples'))])(
    'is not ready',
    missing => {
      const result = _.decide(new _.NotReady({ missing }), { datasetReviewId })

      expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewNotReadyToBePublished({ missing })))
    },
  )

  test('is ready', () => {
    const result = _.decide(new _.IsReady(), { datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.PublicationOfDatasetReviewWasRequested({ datasetReviewId }))),
    )
  })

  test('is being published', () => {
    const result = _.decide(new _.IsBeingPublished(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
  })

  test('has been published', () => {
    const result = _.decide(new _.HasBeenPublished(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

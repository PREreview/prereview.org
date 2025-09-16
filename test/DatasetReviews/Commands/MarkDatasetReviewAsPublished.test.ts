import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/MarkDatasetReviewAsPublished.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered = new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
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
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[answered, datasetReviewWasPublished]], // with events
    ],
  })('not started', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
    examples: [
      [[started]], // was started
      [[started, answered]], // answered
    ],
  })('publication has not been requested', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotRequested())
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
        [[started, answered, publicationOfDatasetReviewWasRequested]], // also answered
        [[started, publicationOfDatasetReviewWasRequested, answered]], // different order
      ],
    },
  )('not ready', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotReady({ missing: ['DatasetReviewWasAssignedADoi'] }))
  })

  test.prop(
    [
      fc
        .tuple(
          fc.datasetReviewWasStarted(),
          fc.publicationOfDatasetReviewWasRequested(),
          fc.datasetReviewWasAssignedADoi(),
        )
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, publicationOfDatasetReviewWasRequested, datasetReviewWasAssignedADoi]],
        [[started, answered, publicationOfDatasetReviewWasRequested, datasetReviewWasAssignedADoi]], // other events
        [[started, datasetReviewWasAssignedADoi, publicationOfDatasetReviewWasRequested]], // different order
      ],
    },
  )('is ready', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.IsReady())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
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
  )('already marked as published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.AlreadyMarkedAsPublished())
  })
})

describe('decide', () => {
  test.prop([fc.plainDate()])('has not been started', publicationDate => {
    const result = _.decide(new _.NotStarted(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.prop([fc.plainDate()])('has not been requested', publicationDate => {
    const result = _.decide(new _.NotRequested(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.PublicationOfDatasetReviewWasNotRequested()))
  })

  test.prop([fc.plainDate(), fc.nonEmptyArray(fc.constant('DatasetReviewWasAssignedADoi'))])(
    'is not ready',
    (publicationDate, missing) => {
      const result = _.decide(new _.NotReady({ missing }), { datasetReviewId, publicationDate })

      expect(result).toStrictEqual(
        Either.left(new DatasetReviews.DatasetReviewNotReadyToBeMarkedAsPublished({ missing })),
      )
    },
  )

  test.prop([fc.plainDate()])('is ready', publicationDate => {
    const result = _.decide(new _.IsReady(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewWasPublished({ datasetReviewId, publicationDate }))),
    )
  })

  test.prop([fc.plainDate()])('already marked as published', publicationDate => {
    const result = _.decide(new _.AlreadyMarkedAsPublished(), { datasetReviewId, publicationDate })

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})

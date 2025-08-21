import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/AnswerIfTheDatasetHasEnoughMetadata.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
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

describe('foldState', () => {
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[answered1, datasetReviewWasPublished]], // with events
    ],
  })('not started', () => {
    const state = _.foldState([])

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
    examples: [
      [[started]], // was started
    ],
  })('not answered', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotAnswered())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewAnsweredIfTheDatasetHasEnoughMetadata())
        .map(([started, answered]) => Tuple.make([started, answered], answered.answer)),
    ],
    {
      examples: [
        [[[started, answered1], answered1.answer]], // one answer
        [[[started, answered1, answered2], answered2.answer]], // two answers
      ],
    },
  )('has been answered', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasBeenAnswered({ answer: expected }))
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
        [[started, answered1, publicationOfDatasetReviewWasRequested]], // also answered
        [[started, publicationOfDatasetReviewWasRequested, answered1]], // different order
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
        [[started, answered1, datasetReviewWasPublished]], // was published
        [[started, answered1, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // also requested
        [[started, datasetReviewWasPublished, answered1]], // different order
      ],
    },
  )('has been published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasBeenPublished())
  })
})

describe('decide', () => {
  test.failing.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('has not been started', answer => {
    const result = _.decide(new _.NotStarted(), { answer, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.failing.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('has not been answered', answer => {
    const result = _.decide(new _.NotAnswered(), { answer, datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({ answer, datasetReviewId }))),
    )
  })

  describe('has been answered', () => {
    test.failing.prop([
      fc
        .tuple(fc.constantFrom('yes', 'partly', 'no', 'unsure'), fc.constantFrom('yes', 'partly', 'no', 'unsure'))
        .filter(([answer1, answer2]) => !Equal.equals(answer1, answer2)),
    ])('with a different answer', ([answer1, answer2]) => {
      const result = _.decide(new _.HasBeenAnswered({ answer: answer1 }), { answer: answer2, datasetReviewId })

      expect(result).toStrictEqual(
        Either.right(
          Option.some(new DatasetReviews.AnsweredIfTheDatasetHasEnoughMetadata({ answer: answer2, datasetReviewId })),
        ),
      )
    })

    test.failing.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('with the same answer', answer => {
      const result = _.decide(new _.HasBeenAnswered({ answer }), { answer, datasetReviewId })

      expect(result).toStrictEqual(Either.right(Option.none()))
    })
  })

  test.failing.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('is being published', answer => {
    const result = _.decide(new _.IsBeingPublished(), { answer, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
  })

  test.failing.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('has been published', answer => {
    const result = _.decide(new _.HasBeenPublished(), { answer, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

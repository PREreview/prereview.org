import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Either, Equal, identity, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/AnswerIfTheDatasetFollowsFairAndCarePrinciples.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId })
const answered1 = new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no' })
const answered2 = new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'yes' })
const publicationWasRequested = new DatasetReviews.PublicationWasRequested()
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished()

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
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples())
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
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewPublicationWasRequested())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, publicationWasRequested]], // was requested
        [[started, answered1, publicationWasRequested]], // also answered
        [[started, publicationWasRequested, answered1]], // different order
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
        [[started, answered1, publicationWasRequested, datasetReviewWasPublished]], // also requested
        [[started, datasetReviewWasPublished, answered1]], // different order
      ],
    },
  )('has been published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasBeenPublished())
  })
})

describe('decide', () => {
  test.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('has not been started', answer => {
    const result = _.decide(new _.NotStarted(), { answer })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('has not been answered', answer => {
    const result = _.decide(new _.NotAnswered(), { answer })

    expect(result).toStrictEqual(
      Either.right(Array.of(new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer }))),
    )
  })

  describe('has been answered', () => {
    test.prop([
      fc
        .tuple(fc.constantFrom('yes', 'partly', 'no', 'unsure'), fc.constantFrom('yes', 'partly', 'no', 'unsure'))
        .filter(([answer1, answer2]) => !Equal.equals(answer1, answer2)),
    ])('with a different answer', ([answer1, answer2]) => {
      const result = _.decide(new _.HasBeenAnswered({ answer: answer1 }), { answer: answer2 })

      expect(result).toStrictEqual(
        Either.right(
          Array.of(new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: answer2 })),
        ),
      )
    })

    test.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('with the same answer', answer => {
      const result = _.decide(new _.HasBeenAnswered({ answer }), { answer })

      expect(result).toStrictEqual(Either.right(Array.empty()))
    })
  })

  test.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('is being published', answer => {
    const result = _.decide(new _.IsBeingPublished(), { answer })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
  })

  test.prop([fc.constantFrom('yes', 'partly', 'no', 'unsure')])('has been published', answer => {
    const result = _.decide(new _.HasBeenPublished(), { answer })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

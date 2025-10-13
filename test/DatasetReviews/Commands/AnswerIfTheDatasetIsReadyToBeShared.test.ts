import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/AnswerIfTheDatasetIsReadyToBeShared.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered1 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answered2 = new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
  answer: 'yes',
  detail: NonEmptyString.fromString('Some detail about yes'),
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    answer: fc.constantFrom('yes', 'no', 'unsure'),
    datasetReviewId: fc.uuid(),
    userId: fc.orcidId(),
  })

describe('foldState', () => {
  test.prop(
    [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted')))), fc.uuid()],
    {
      examples: [
        [[], datasetReviewId], // no events
        [[answered1, datasetReviewWasPublished], datasetReviewId], // with events
        [[started], datasetReviewId2], // with events for other dataset review
        [[started, datasetReviewWasPublished], datasetReviewId2], // with multiple events for other dataset review
      ],
    },
  )('not started', (events, datasetReviewId) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.prop(
    [fc.datasetReviewWasStarted().map(event => Tuple.make(Array.make(event), event.datasetReviewId, event.authorId))],
    {
      examples: [
        [[[started], datasetReviewId, authorId]], // was started
      ],
    },
  )('not answered', ([events, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.NotAnswered({ authorId: expectedAuthorId }))
  })

  test.prop(
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.answeredIfTheDatasetIsReadyToBeShared({
              datasetReviewId: fc.constant(datasetReviewId),
            }),
          ),
        )
        .map(([started, answered]) =>
          Tuple.make(Array.make(started, answered), answered.answer, started.datasetReviewId, started.authorId),
        ),
    ],
    {
      examples: [
        [[[started, answered1], answered1.answer, datasetReviewId, authorId]], // one answer
        [[[started, answered1, answered2], answered2.answer, datasetReviewId, authorId]], // two answers
      ],
    },
  )('has been answered', ([events, expectedAnswer, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.HasBeenAnswered({ answer: expectedAnswer, authorId: expectedAuthorId }))
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
        [[[started, answered1, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // also answered
        [[[publicationOfDatasetReviewWasRequested, started, answered1], datasetReviewId, authorId]], // different order
      ],
    },
  )('is being published', ([events, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.IsBeingPublished({ authorId: expectedAuthorId }))
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
  )('has been published', ([events, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.HasBeenPublished({ authorId: expectedAuthorId }))
  })
})

describe('authorize', () => {
  test.prop([command()])('has not been started', command => {
    const result = _.authorize(new _.NotStarted(), command)

    expect(result).toBeTruthy()
  })

  describe('has not been answered', () => {
    test.prop([command()])('with the same user', command => {
      const result = _.authorize(new _.NotAnswered({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    test.prop([command(), fc.orcidId()])('with a different user', (command, authorId) => {
      const result = _.authorize(new _.NotAnswered({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('has been answered', () => {
    test.prop([command(), fc.constantFrom('yes', 'no', 'unsure')])('with the same user', (command, answer) => {
      const result = _.authorize(new _.HasBeenAnswered({ answer, authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    test.prop([command(), fc.orcidId(), fc.constantFrom('yes', 'no', 'unsure')])(
      'with a different user',
      (command, authorId, answer) => {
        const result = _.authorize(new _.HasBeenAnswered({ answer, authorId }), command)

        expect(result).toBeFalsy()
      },
    )
  })

  describe('is being published', () => {
    test.prop([command()])('with the same user', command => {
      const result = _.authorize(new _.IsBeingPublished({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    test.prop([command(), fc.orcidId()])('with a different user', (command, authorId) => {
      const result = _.authorize(new _.IsBeingPublished({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('is being published', () => {
    test.prop([command()])('with the same user', command => {
      const result = _.authorize(new _.HasBeenPublished({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    test.prop([command(), fc.orcidId()])('with a different user', (command, authorId) => {
      const result = _.authorize(new _.HasBeenPublished({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })
})

describe('decide', () => {
  test.prop([command()])('has not been started', command => {
    const result = _.decide(new _.NotStarted(), command)

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.prop([fc.orcidId(), command()])('has not been answered', (authorId, command) => {
    const result = _.decide(new _.NotAnswered({ authorId }), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
            answer: command.answer,
            detail: Option.none(),
            datasetReviewId: command.datasetReviewId,
          }),
        ),
      ),
    )
  })

  describe('has been answered', () => {
    test.prop([
      fc.orcidId(),
      fc
        .tuple(command(), fc.constantFrom('yes', 'no', 'unsure'))
        .filter(([command, answer]) => command.answer !== answer),
    ])('with a different answer', (authorId, [command, answer]) => {
      const result = _.decide(new _.HasBeenAnswered({ answer, authorId }), command)

      expect(result).toStrictEqual(
        Either.right(
          Option.some(
            new DatasetReviews.AnsweredIfTheDatasetIsReadyToBeShared({
              answer: command.answer,
              detail: Option.none(),
              datasetReviewId: command.datasetReviewId,
            }),
          ),
        ),
      )
    })

    test.prop([fc.orcidId(), command()])('with the same answer', (authorId, command) => {
      const result = _.decide(new _.HasBeenAnswered({ answer: command.answer, authorId }), command)

      expect(result).toStrictEqual(Either.right(Option.none()))
    })
  })

  test.prop([fc.orcidId(), command()])('is being published', (authorId, command) => {
    const result = _.decide(new _.IsBeingPublished({ authorId }), command)

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
  })

  test.prop([fc.orcidId(), command()])('has been published', (authorId, command) => {
    const result = _.decide(new _.HasBeenPublished({ authorId }), command)

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

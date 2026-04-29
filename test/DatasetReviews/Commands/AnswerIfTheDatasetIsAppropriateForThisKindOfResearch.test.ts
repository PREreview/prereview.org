import { it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Predicate, Tuple } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../src/DatasetReviews/Commands/AnswerIfTheDatasetIsAppropriateForThisKindOfResearch.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered1 = new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const answered2 = new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
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
    answer: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
    detail: fc.maybe(fc.nonEmptyString()),
    datasetReviewId: fc.uuid(),
    userId: fc.orcidId(),
  })

describe('foldState', () => {
  it.prop(
    'not started',
    [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted')))), fc.uuid()],
    ([events, datasetReviewId]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(new _.NotStarted())
    },
    {
      fastCheck: {
        examples: [
          [[], datasetReviewId], // no events
          [[answered1, datasetReviewWasPublished], datasetReviewId], // with events
          [[started], datasetReviewId2], // with events for other dataset review
          [[started, datasetReviewWasPublished], datasetReviewId2], // with multiple events for other dataset review
        ],
      },
    },
  )

  it.prop(
    'not answered',
    [fc.datasetReviewWasStarted().map(event => Tuple.make(Array.make(event), event.datasetReviewId, event.authorId))],
    ([[events, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(new _.NotAnswered({ authorId: expectedAuthorId }))
    },
    {
      fastCheck: {
        examples: [
          [[[started], datasetReviewId, authorId]], // was started
        ],
      },
    },
  )

  it.prop(
    'has been answered',
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.answeredIfTheDatasetIsAppropriateForThisKindOfResearch({
              datasetReviewId: fc.constant(datasetReviewId),
            }),
          ),
        )
        .map(([started, answered]) =>
          Tuple.make(
            Array.make(started, answered),
            answered.answer,
            answered.detail,
            started.datasetReviewId,
            started.authorId,
          ),
        ),
    ],
    ([[events, expectedAnswer, expectedDetail, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(
        new _.HasBeenAnswered({ answer: expectedAnswer, detail: expectedDetail, authorId: expectedAuthorId }),
      )
    },
    {
      fastCheck: {
        examples: [
          [[[started, answered1], answered1.answer, answered1.detail, datasetReviewId, authorId]], // one answer
          [[[started, answered1, answered2], answered2.answer, answered2.detail, datasetReviewId, authorId]], // two answers
        ],
      },
    },
  )

  it.prop(
    'is being published',
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
    ([[events, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(new _.IsBeingPublished({ authorId: expectedAuthorId }))
    },
    {
      fastCheck: {
        examples: [
          [[[started, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // was requested
          [[[started, answered1, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // also answered
          [[[publicationOfDatasetReviewWasRequested, started, answered1], datasetReviewId, authorId]], // different order
        ],
      },
    },
  )

  it.prop(
    'has been published',
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
    ([[events, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(new _.HasBeenPublished({ authorId: expectedAuthorId }))
    },
    {
      fastCheck: {
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
    },
  )
})

describe('authorize', () => {
  it.prop('has not been started', [command()], ([command]) => {
    const result = _.authorize(new _.NotStarted(), command)

    expect(result).toBeTruthy()
  })

  describe('has not been answered', () => {
    it.prop('with the same user', [command()], ([command]) => {
      const result = _.authorize(new _.NotAnswered({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    it.prop('with a different user', [command(), fc.orcidId()], ([command, authorId]) => {
      const result = _.authorize(new _.NotAnswered({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('has been answered', () => {
    it.prop(
      'with the same user',
      [command(), fc.constantFrom('yes', 'partly', 'no', 'unsure'), fc.maybe(fc.nonEmptyString())],
      ([command, answer, detail]) => {
        const result = _.authorize(new _.HasBeenAnswered({ answer, detail, authorId: command.userId }), command)

        expect(result).toBeTruthy()
      },
    )

    it.prop(
      'with a different user',
      [command(), fc.orcidId(), fc.constantFrom('yes', 'partly', 'no', 'unsure'), fc.maybe(fc.nonEmptyString())],
      ([command, authorId, answer, detail]) => {
        const result = _.authorize(new _.HasBeenAnswered({ answer, detail, authorId }), command)

        expect(result).toBeFalsy()
      },
    )
  })

  describe('is being published', () => {
    it.prop('with the same user', [command()], ([command]) => {
      const result = _.authorize(new _.IsBeingPublished({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    it.prop('with a different user', [command(), fc.orcidId()], ([command, authorId]) => {
      const result = _.authorize(new _.IsBeingPublished({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('is being published', () => {
    it.prop('with the same user', [command()], ([command]) => {
      const result = _.authorize(new _.HasBeenPublished({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    it.prop('with a different user', [command(), fc.orcidId()], ([command, authorId]) => {
      const result = _.authorize(new _.HasBeenPublished({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })
})

describe('decide', () => {
  it.prop('has not been started', [command()], ([command]) => {
    const result = _.decide(new _.NotStarted(), command)

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  it.prop('has not been answered', [fc.orcidId(), command()], ([authorId, command]) => {
    const result = _.decide(new _.NotAnswered({ authorId }), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
            answer: command.answer,
            detail: command.detail,
            datasetReviewId: command.datasetReviewId,
          }),
        ),
      ),
    )
  })

  describe('has been answered', () => {
    it.prop(
      'with a different answer',
      [
        fc.orcidId(),
        fc
          .tuple(command(), fc.constantFrom('yes', 'partly', 'no', 'unsure'))
          .filter(([command, answer]) => command.answer !== answer),
      ],
      ([authorId, [command, answer]]) => {
        const result = _.decide(new _.HasBeenAnswered({ answer, detail: command.detail, authorId }), command)

        expect(result).toStrictEqual(
          Either.right(
            Option.some(
              new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
                answer: command.answer,
                detail: command.detail,
                datasetReviewId: command.datasetReviewId,
              }),
            ),
          ),
        )
      },
    )

    it.prop(
      'with different detail',
      [
        fc.orcidId(),
        fc
          .tuple(command(), fc.maybe(fc.nonEmptyString()))
          .filter(([command, detail]) => !Equal.equals(command.detail, detail)),
      ],
      ([authorId, [command, detail]]) => {
        const result = _.decide(new _.HasBeenAnswered({ answer: command.answer, detail, authorId }), command)

        expect(result).toStrictEqual(
          Either.right(
            Option.some(
              new DatasetReviews.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch({
                answer: command.answer,
                detail: command.detail,
                datasetReviewId: command.datasetReviewId,
              }),
            ),
          ),
        )
      },
    )

    it.prop('with the same answer', [fc.orcidId(), command()], ([authorId, command]) => {
      const result = _.decide(
        new _.HasBeenAnswered({ answer: command.answer, detail: command.detail, authorId }),
        command,
      )

      expect(result).toStrictEqual(Either.right(Option.none()))
    })
  })

  it.prop('is being published', [fc.orcidId(), command()], ([authorId, command]) => {
    const result = _.decide(new _.IsBeingPublished({ authorId }), command)

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
  })

  it.prop('has been published', [fc.orcidId(), command()], ([authorId, command]) => {
    const result = _.decide(new _.HasBeenPublished({ authorId }), command)

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
  })
})

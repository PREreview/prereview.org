import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/RateTheQuality.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const rated1 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'poor',
  detail: Option.none(),
  datasetReviewId,
})
const rated2 = new DatasetReviews.RatedTheQualityOfTheDataset({
  rating: 'excellent',
  detail: Option.some(NonEmptyString.NonEmptyString('Some detail')),
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
    rating: fc.constantFrom('excellent', 'fair', 'poor', 'unsure'),
    datasetReviewId: fc.uuid(),
    userId: fc.orcidId(),
  })

describe('foldState', () => {
  test.prop(
    [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted')))), fc.uuid()],
    {
      examples: [
        [[], datasetReviewId], // no events
        [[rated1, datasetReviewWasPublished], datasetReviewId], // with events
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
  )('not rated', ([events, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.NotRated({ authorId: expectedAuthorId }))
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
          Tuple.make(Array.make(started, rated), rated.rating, started.datasetReviewId, started.authorId),
        ),
    ],
    {
      examples: [
        [[[started, rated1], rated1.rating, datasetReviewId, authorId]], // one rating
        [[[started, rated1, rated2], rated2.rating, datasetReviewId, authorId]], // two ratings
      ],
    },
  )('has been rated', ([events, expectedRating, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.HasBeenRated({ rating: expectedRating, authorId: expectedAuthorId }))
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

  describe('has not been rated', () => {
    test.prop([command()])('with the same user', command => {
      const result = _.authorize(new _.NotRated({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    test.prop([command(), fc.orcidId()])('with a different user', (command, authorId) => {
      const result = _.authorize(new _.NotRated({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('has been rated', () => {
    test.prop([command(), fc.constantFrom('excellent', 'fair', 'poor', 'unsure')])(
      'with the same user',
      (command, rating) => {
        const result = _.authorize(new _.HasBeenRated({ rating, authorId: command.userId }), command)

        expect(result).toBeTruthy()
      },
    )

    test.prop([command(), fc.orcidId(), fc.constantFrom('excellent', 'fair', 'poor', 'unsure')])(
      'with a different user',
      (command, authorId, rating) => {
        const result = _.authorize(new _.HasBeenRated({ rating, authorId }), command)

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

  test.prop([fc.orcidId(), command()])('has not been rated', (authorId, command) => {
    const result = _.decide(new _.NotRated({ authorId }), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new DatasetReviews.RatedTheQualityOfTheDataset({
            rating: command.rating,
            detail: Option.none(),
            datasetReviewId: command.datasetReviewId,
          }),
        ),
      ),
    )
  })

  describe('has been rated', () => {
    test.prop([
      fc.orcidId(),
      fc
        .tuple(command(), fc.constantFrom('excellent', 'fair', 'poor', 'unsure'))
        .filter(([command, rating]) => command.rating !== rating),
    ])('with a different rating', (authorId, [command, rating]) => {
      const result = _.decide(new _.HasBeenRated({ rating, authorId }), command)

      expect(result).toStrictEqual(
        Either.right(
          Option.some(
            new DatasetReviews.RatedTheQualityOfTheDataset({
              rating: command.rating,
              detail: Option.none(),
              datasetReviewId: command.datasetReviewId,
            }),
          ),
        ),
      )
    })

    test.prop([fc.orcidId(), command()])('with the same rating', (authorId, command) => {
      const result = _.decide(new _.HasBeenRated({ rating: command.rating, authorId }), command)

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

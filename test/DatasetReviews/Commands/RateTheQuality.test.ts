import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Predicate, Tuple } from 'effect'
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
  detail: NonEmptyString.fromString('Some detail'),
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
          [[rated1, datasetReviewWasPublished], datasetReviewId], // with events
          [[started], datasetReviewId2], // with events for other dataset review
          [[started, datasetReviewWasPublished], datasetReviewId2], // with multiple events for other dataset review
        ],
      },
    },
  )

  it.prop(
    'not rated',
    [fc.datasetReviewWasStarted().map(event => Tuple.make(Array.make(event), event.datasetReviewId, event.authorId))],
    ([[events, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(new _.NotRated({ authorId: expectedAuthorId }))
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
    'has been rated',
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
          Tuple.make(Array.make(started, rated), rated.rating, rated.detail, started.datasetReviewId, started.authorId),
        ),
    ],
    ([[events, expectedRating, expectedDetail, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(
        new _.HasBeenRated({ rating: expectedRating, detail: expectedDetail, authorId: expectedAuthorId }),
      )
    },
    {
      fastCheck: {
        examples: [
          [[[started, rated1], rated1.rating, rated1.detail, datasetReviewId, authorId]], // one rating
          [[[started, rated1, rated2], rated2.rating, rated2.detail, datasetReviewId, authorId]], // two ratings
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
          [[[started, rated1, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // also rated
          [[[publicationOfDatasetReviewWasRequested, started, rated1], datasetReviewId, authorId]], // different order
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
    },
  )
})

describe('authorize', () => {
  it.prop('has not been started', [command()], ([command]) => {
    const result = _.authorize(new _.NotStarted(), command)

    expect(result).toBeTruthy()
  })

  describe('has not been rated', () => {
    it.prop('with the same user', [command()], ([command]) => {
      const result = _.authorize(new _.NotRated({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    it.prop('with a different user', [command(), fc.orcidId()], ([command, authorId]) => {
      const result = _.authorize(new _.NotRated({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('has been rated', () => {
    it.prop(
      'with the same user',
      [command(), fc.constantFrom('excellent', 'fair', 'poor', 'unsure'), fc.maybe(fc.nonEmptyString())],
      ([command, rating, detail]) => {
        const result = _.authorize(new _.HasBeenRated({ rating, detail, authorId: command.userId }), command)

        expect(result).toBeTruthy()
      },
    )

    it.prop(
      'with a different user',
      [command(), fc.orcidId(), fc.constantFrom('excellent', 'fair', 'poor', 'unsure'), fc.maybe(fc.nonEmptyString())],
      ([command, authorId, rating, detail]) => {
        const result = _.authorize(new _.HasBeenRated({ rating, detail, authorId }), command)

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

  it.prop('has not been rated', [fc.orcidId(), command()], ([authorId, command]) => {
    const result = _.decide(new _.NotRated({ authorId }), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new DatasetReviews.RatedTheQualityOfTheDataset({
            rating: command.rating,
            detail: command.detail,
            datasetReviewId: command.datasetReviewId,
          }),
        ),
      ),
    )
  })

  describe('has been rated', () => {
    it.prop(
      'with a different rating',
      [
        fc.orcidId(),
        fc
          .tuple(command(), fc.constantFrom('excellent', 'fair', 'poor', 'unsure'))
          .filter(([command, rating]) => command.rating !== rating),
      ],
      ([authorId, [command, rating]]) => {
        const result = _.decide(new _.HasBeenRated({ rating, detail: command.detail, authorId }), command)

        expect(result).toStrictEqual(
          Either.right(
            Option.some(
              new DatasetReviews.RatedTheQualityOfTheDataset({
                rating: command.rating,
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
        const result = _.decide(new _.HasBeenRated({ rating: command.rating, detail, authorId }), command)

        expect(result).toStrictEqual(
          Either.right(
            Option.some(
              new DatasetReviews.RatedTheQualityOfTheDataset({
                rating: command.rating,
                detail: command.detail,
                datasetReviewId: command.datasetReviewId,
              }),
            ),
          ),
        )
      },
    )

    it.prop('with the same rating', [fc.orcidId(), command()], ([authorId, command]) => {
      const result = _.decide(new _.HasBeenRated({ rating: command.rating, detail: command.detail, authorId }), command)

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

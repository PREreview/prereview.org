import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/DeclareFollowingCodeOfConduct.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const declaredThatTheCodeOfConductWasFollowedForADatasetReview1 =
  new DatasetReviews.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
    timestamp: Temporal.Now.instant().subtract({ minutes: 1 }),
    datasetReviewId,
  })
const declaredThatTheCodeOfConductWasFollowedForADatasetReview2 =
  new DatasetReviews.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
    timestamp: Temporal.Now.instant(),
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
    timestamp: fc.instant(),
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
          [[declaredThatTheCodeOfConductWasFollowedForADatasetReview1, datasetReviewWasPublished], datasetReviewId], // with events
          [[started], datasetReviewId2], // with events for other dataset review
          [[started, datasetReviewWasPublished], datasetReviewId2], // with multiple events for other dataset review
        ],
      },
    },
  )

  it.prop(
    'not declared',
    [fc.datasetReviewWasStarted().map(event => Tuple.make(Array.make(event), event.datasetReviewId, event.authorId))],
    ([[events, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(new _.NotDeclared({ authorId: expectedAuthorId }))
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
    'has been declared',
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.declaredThatTheCodeOfConductWasFollowedForADatasetReview({
              datasetReviewId: fc.constant(datasetReviewId),
            }),
          ),
        )
        .map(([started, declared]) =>
          Tuple.make(Array.make(started, declared), started.datasetReviewId, started.authorId),
        ),
    ],
    ([[events, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(new _.HasBeenDeclared({ authorId: expectedAuthorId }))
    },
    {
      fastCheck: {
        examples: [
          [[[started, declaredThatTheCodeOfConductWasFollowedForADatasetReview1], datasetReviewId, authorId]], // declared once
          [
            [
              [
                started,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview2,
              ],
              datasetReviewId,
              authorId,
            ],
          ], // declared twice
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
          [
            [
              [
                started,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
                publicationOfDatasetReviewWasRequested,
              ],
              datasetReviewId,
              authorId,
            ],
          ], // also declared
          [
            [
              [
                publicationOfDatasetReviewWasRequested,
                started,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
              ],
              datasetReviewId,
              authorId,
            ],
          ], // different order
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
          [
            [
              [started, declaredThatTheCodeOfConductWasFollowedForADatasetReview1, datasetReviewWasPublished],
              datasetReviewId,
              authorId,
            ],
          ], // was published
          [
            [
              [
                started,
                declaredThatTheCodeOfConductWasFollowedForADatasetReview1,
                publicationOfDatasetReviewWasRequested,
                datasetReviewWasPublished,
              ],
              datasetReviewId,
              authorId,
            ],
          ], // also requested
          [
            [
              [started, datasetReviewWasPublished, declaredThatTheCodeOfConductWasFollowedForADatasetReview1],
              datasetReviewId,
              authorId,
            ],
          ], // different order
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

  describe('has not been declared', () => {
    it.prop('with the same user', [command()], ([command]) => {
      const result = _.authorize(new _.NotDeclared({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    it.prop('with a different user', [command(), fc.orcidId()], ([command, authorId]) => {
      const result = _.authorize(new _.NotDeclared({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('has been declared', () => {
    it.prop('with the same user', [command()], ([command]) => {
      const result = _.authorize(new _.HasBeenDeclared({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    it.prop('with a different user', [command(), fc.orcidId()], ([command, authorId]) => {
      const result = _.authorize(new _.HasBeenDeclared({ authorId }), command)

      expect(result).toBeFalsy()
    })
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

  it.prop('has not been declared', [fc.orcidId(), command()], ([authorId, command]) => {
    const result = _.decide(new _.NotDeclared({ authorId }), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new DatasetReviews.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
            timestamp: command.timestamp,
            datasetReviewId: command.datasetReviewId,
          }),
        ),
      ),
    )
  })

  it.prop('has been declared', [fc.orcidId(), command()], ([authorId, command]) => {
    const result = _.decide(new _.HasBeenDeclared({ authorId }), command)

    expect(result).toStrictEqual(Either.right(Option.none()))
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

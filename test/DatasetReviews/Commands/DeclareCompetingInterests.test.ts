import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/DeclareCompetingInterests.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const competingInterestsForADatasetReviewWereDeclared1 =
  new DatasetReviews.CompetingInterestsForADatasetReviewWereDeclared({
    competingInterests: Option.none(),
    datasetReviewId,
  })
const competingInterestsForADatasetReviewWereDeclared2 =
  new DatasetReviews.CompetingInterestsForADatasetReviewWereDeclared({
    competingInterests: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    datasetReviewId,
  })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

const competingInterests = (): fc.Arbitrary<_.Command['competingInterests']> => fc.maybe(fc.nonEmptyString())

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    competingInterests: competingInterests(),
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
          [[competingInterestsForADatasetReviewWereDeclared1, datasetReviewWasPublished], datasetReviewId], // with events
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
            fc.competingInterestsForADatasetReviewWereDeclared({
              datasetReviewId: fc.constant(datasetReviewId),
            }),
          ),
        )
        .map(([started, declared]) =>
          Tuple.make(
            Array.make(started, declared),
            declared.competingInterests,
            started.datasetReviewId,
            started.authorId,
          ),
        ),
    ],
    ([[events, expectedCompetingInterests, datasetReviewId, expectedAuthorId]]) => {
      const state = _.foldState(events, datasetReviewId)

      expect(state).toStrictEqual(
        new _.HasBeenDeclared({ competingInterests: expectedCompetingInterests, authorId: expectedAuthorId }),
      )
    },
    {
      fastCheck: {
        examples: [
          [
            [
              [started, competingInterestsForADatasetReviewWereDeclared1],
              competingInterestsForADatasetReviewWereDeclared1.competingInterests,
              datasetReviewId,
              authorId,
            ],
          ], // declared once
          [
            [
              [
                started,
                competingInterestsForADatasetReviewWereDeclared1,
                competingInterestsForADatasetReviewWereDeclared2,
              ],
              competingInterestsForADatasetReviewWereDeclared2.competingInterests,
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
              [started, competingInterestsForADatasetReviewWereDeclared1, publicationOfDatasetReviewWasRequested],
              datasetReviewId,
              authorId,
            ],
          ], // also declared
          [
            [
              [publicationOfDatasetReviewWasRequested, started, competingInterestsForADatasetReviewWereDeclared1],
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
              [started, competingInterestsForADatasetReviewWereDeclared1, datasetReviewWasPublished],
              datasetReviewId,
              authorId,
            ],
          ], // was published
          [
            [
              [
                started,
                competingInterestsForADatasetReviewWereDeclared1,
                publicationOfDatasetReviewWasRequested,
                datasetReviewWasPublished,
              ],
              datasetReviewId,
              authorId,
            ],
          ], // also requested
          [
            [
              [started, datasetReviewWasPublished, competingInterestsForADatasetReviewWereDeclared1],
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
    it.prop('with the same user', [command(), competingInterests()], ([command, competingInterests]) => {
      const result = _.authorize(new _.HasBeenDeclared({ competingInterests, authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    it.prop(
      'with a different user',
      [command(), fc.orcidId(), competingInterests()],
      ([command, authorId, competingInterests]) => {
        const result = _.authorize(new _.HasBeenDeclared({ competingInterests, authorId }), command)

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

  it.prop('has not been declared', [fc.orcidId(), command()], ([authorId, command]) => {
    const result = _.decide(new _.NotDeclared({ authorId }), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new DatasetReviews.CompetingInterestsForADatasetReviewWereDeclared({
            competingInterests: command.competingInterests,
            datasetReviewId: command.datasetReviewId,
          }),
        ),
      ),
    )
  })

  describe('has been declared', () => {
    it.prop(
      'with a different competing interests',
      [
        fc.orcidId(),
        fc
          .tuple(command(), competingInterests())
          .filter(([command, competingInterests]) => !Equal.equals(command.competingInterests, competingInterests)),
      ],
      ([authorId, [command, competingInterests]]) => {
        const result = _.decide(new _.HasBeenDeclared({ competingInterests, authorId }), command)

        expect(result).toStrictEqual(
          Either.right(
            Option.some(
              new DatasetReviews.CompetingInterestsForADatasetReviewWereDeclared({
                competingInterests: command.competingInterests,
                datasetReviewId: command.datasetReviewId,
              }),
            ),
          ),
        )
      },
    )

    it.prop('with the same competing interests', [fc.orcidId(), command()], ([authorId, command]) => {
      const result = _.decide(
        new _.HasBeenDeclared({ competingInterests: command.competingInterests, authorId }),
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

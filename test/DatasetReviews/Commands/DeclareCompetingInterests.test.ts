import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
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
    competingInterests: Option.some(
      NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    ),
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
  test.prop(
    [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted')))), fc.uuid()],
    {
      examples: [
        [[], datasetReviewId], // no events
        [[competingInterestsForADatasetReviewWereDeclared1, datasetReviewWasPublished], datasetReviewId], // with events
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
  )('not declared', ([events, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(new _.NotDeclared({ authorId: expectedAuthorId }))
  })

  test.prop(
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
    {
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
  )('has been declared', ([events, expectedCompetingInterests, datasetReviewId, expectedAuthorId]) => {
    const state = _.foldState(events, datasetReviewId)

    expect(state).toStrictEqual(
      new _.HasBeenDeclared({ competingInterests: expectedCompetingInterests, authorId: expectedAuthorId }),
    )
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

  describe('has not been declared', () => {
    test.prop([command()])('with the same user', command => {
      const result = _.authorize(new _.NotDeclared({ authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    test.prop([command(), fc.orcidId()])('with a different user', (command, authorId) => {
      const result = _.authorize(new _.NotDeclared({ authorId }), command)

      expect(result).toBeFalsy()
    })
  })

  describe('has been declared', () => {
    test.prop([command(), competingInterests()])('with the same user', (command, competingInterests) => {
      const result = _.authorize(new _.HasBeenDeclared({ competingInterests, authorId: command.userId }), command)

      expect(result).toBeTruthy()
    })

    test.prop([command(), fc.orcidId(), competingInterests()])(
      'with a different user',
      (command, authorId, competingInterests) => {
        const result = _.authorize(new _.HasBeenDeclared({ competingInterests, authorId }), command)

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

  test.prop([fc.orcidId(), command()])('has not been declared', (authorId, command) => {
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
    test.prop([
      fc.orcidId(),
      fc
        .tuple(command(), competingInterests())
        .filter(([command, competingInterests]) => !Equal.equals(command.competingInterests, competingInterests)),
    ])('with a different competing interests', (authorId, [command, competingInterests]) => {
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
    })

    test.prop([fc.orcidId(), command()])('with the same competing interests', (authorId, command) => {
      const result = _.decide(
        new _.HasBeenDeclared({ competingInterests: command.competingInterests, authorId }),
        command,
      )

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

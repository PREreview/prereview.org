import { it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfUserCanChoosePersona.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const authorId2 = OrcidId.OrcidId('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const personaForDatasetReviewWasChosen1 = new DatasetReviews.PersonaForDatasetReviewWasChosen({
  persona: 'public',
  datasetReviewId,
})
const personaForDatasetReviewWasChosen2 = new DatasetReviews.PersonaForDatasetReviewWasChosen({
  persona: 'pseudonym',
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('query', () => {
  it.prop(
    'not started',
    [
      fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted')))),
      fc.uuid(),
      fc.orcidId(),
    ],
    ([events, datasetReviewId, userId]) => {
      const actual = _.query(events, { datasetReviewId, userId })

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
    },
    {
      fastCheck: {
        examples: [
          [[], datasetReviewId, authorId], // no events
          [[personaForDatasetReviewWasChosen1, datasetReviewWasPublished], datasetReviewId, authorId], // with events
          [[started], datasetReviewId2, authorId], // with events for other dataset review
          [[started, datasetReviewWasPublished], datasetReviewId2, authorId], // with multiple events for other dataset review
        ],
      },
    },
  )

  it.prop(
    'started by another user',
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.orcidId())
        .map(([event, userId]) =>
          Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, Uuid.Uuid, OrcidId.OrcidId]>(
            Array.make(event),
            event.datasetReviewId,
            userId,
          ),
        ),
    ],
    ([[events, datasetReviewId, userId]]) => {
      const actual = _.query(events, { datasetReviewId, userId })

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewWasStartedByAnotherUser()))
    },
    {
      fastCheck: {
        examples: [
          [[[started], datasetReviewId, authorId2]], // no events
          [[[started, personaForDatasetReviewWasChosen1, datasetReviewWasPublished], datasetReviewId, authorId2]], // with events
        ],
      },
    },
  )

  it.prop(
    'not chosen',
    [fc.datasetReviewWasStarted().map(event => Tuple.make(Array.make(event), event.datasetReviewId, event.authorId))],
    ([[events, datasetReviewId, userId]]) => {
      const actual = _.query(events, { datasetReviewId, userId })

      expect(actual).toStrictEqual(Either.right(Option.none()))
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
    'has been chosen',
    [
      fc
        .uuid()
        .chain(datasetReviewId =>
          fc.tuple(
            fc.datasetReviewWasStarted({ datasetReviewId: fc.constant(datasetReviewId) }),
            fc.personaForDatasetReviewWasChosen({ datasetReviewId: fc.constant(datasetReviewId) }),
          ),
        )
        .map(([started, chosen]) =>
          Tuple.make(Array.make(started, chosen), started.datasetReviewId, started.authorId, chosen.persona),
        ),
    ],
    ([[events, datasetReviewId, userId, expectedPersona]]) => {
      const actual = _.query(events, { datasetReviewId, userId })

      expect(actual).toStrictEqual(Either.right(Option.some(expectedPersona)))
    },
    {
      fastCheck: {
        examples: [
          [
            [
              [started, personaForDatasetReviewWasChosen1],
              datasetReviewId,
              authorId,
              personaForDatasetReviewWasChosen1.persona,
            ],
          ], // chosen once
          [
            [
              [started, personaForDatasetReviewWasChosen1, personaForDatasetReviewWasChosen2],
              datasetReviewId,
              authorId,
              personaForDatasetReviewWasChosen2.persona,
            ],
          ], // chosen twice
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
    ([[events, datasetReviewId, userId]]) => {
      const actual = _.query(events, { datasetReviewId, userId })

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
    },
    {
      fastCheck: {
        examples: [
          [[[started, publicationOfDatasetReviewWasRequested], datasetReviewId, authorId]], // was requested
          [
            [
              [started, personaForDatasetReviewWasChosen1, publicationOfDatasetReviewWasRequested],
              datasetReviewId,
              authorId,
            ],
          ], // also chosen
          [
            [
              [publicationOfDatasetReviewWasRequested, started, personaForDatasetReviewWasChosen1],
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
    ([[events, datasetReviewId, userId]]) => {
      const actual = _.query(events, { datasetReviewId, userId })

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()))
    },
    {
      fastCheck: {
        examples: [
          [[[started, personaForDatasetReviewWasChosen1, datasetReviewWasPublished], datasetReviewId, authorId]], // was published
          [
            [
              [
                started,
                personaForDatasetReviewWasChosen1,
                publicationOfDatasetReviewWasRequested,
                datasetReviewWasPublished,
              ],
              datasetReviewId,
              authorId,
            ],
          ], // also requested
          [[[started, datasetReviewWasPublished, personaForDatasetReviewWasChosen1], datasetReviewId, authorId]], // different order
        ],
      },
    },
  )
})

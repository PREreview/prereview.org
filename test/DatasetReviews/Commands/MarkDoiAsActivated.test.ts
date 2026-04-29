import { it, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../src/DatasetReviews/Commands/MarkDoiAsActivated.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered = new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
  answer: 'no',
  detail: Option.none(),
  datasetReviewId,
})
const recordCreated = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId: 123, datasetReviewId })
const doiWasAssigned1 = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.5072/zenodo.112360'),
  datasetReviewId,
})
const doiWasAssigned2 = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.5072/zenodo.287560'),
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})
const datasetReviewDoiWasActivated = new DatasetReviews.DatasetReviewDoiWasActivated({ datasetReviewId })

describe('foldState', () => {
  it.prop(
    'not started',
    [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.NotStarted())
    },
    {
      fastCheck: {
        examples: [
          [[]], // no events
          [[recordCreated, doiWasAssigned1, datasetReviewWasPublished]], // with events
        ],
      },
    },
  )

  it.prop(
    'not published',
    [fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.NotPublished())
    },
    {
      fastCheck: {
        examples: [
          [[started]], // was started
          [[started, answered]], // answered
          [[started, publicationOfDatasetReviewWasRequested]], // was requested
          [[started, answered, publicationOfDatasetReviewWasRequested]], // also answered
          [[started, publicationOfDatasetReviewWasRequested, answered]], // different order
        ],
      },
    },
  )

  it.prop(
    'does not have a DOI',
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.HasNotBeenAssignedADoi())
    },
    {
      fastCheck: {
        examples: [
          [[started, answered, publicationOfDatasetReviewWasRequested, recordCreated, datasetReviewWasPublished]], // was published with a DOI
        ],
      },
    },
  )

  it.prop(
    'has an inactive DOI',
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasAssignedADoi(), fc.datasetReviewWasPublished())
        .map(([started, assigned, published]) => Tuple.make([started, assigned, published], assigned.doi)),
    ],
    ([[events, expected]]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.HasAnInactiveDoi({ doi: expected }))
    },
    {
      fastCheck: {
        examples: [
          [[[started, doiWasAssigned1, datasetReviewWasPublished], doiWasAssigned1.doi]], // assigned once
          [[[started, doiWasAssigned1, doiWasAssigned2, datasetReviewWasPublished], doiWasAssigned2.doi]], // assigned twice
        ],
      },
    },
  )

  it.prop(
    'has an active DOI',
    [
      fc
        .tuple(
          fc.datasetReviewWasStarted(),
          fc.datasetReviewWasAssignedADoi(),
          fc.datasetReviewWasPublished(),
          fc.datasetReviewDoiWasActivated(),
        )
        .map(([started, assigned, published, activated]) =>
          Tuple.make([started, assigned, published, activated], assigned.doi),
        ),
    ],
    ([[events, expected]]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.HasAnActiveDoi({ doi: expected }))
    },
    {
      fastCheck: {
        examples: [
          [[[started, doiWasAssigned1, datasetReviewWasPublished, datasetReviewDoiWasActivated], doiWasAssigned1.doi]], // assigned once
          [
            [
              [started, doiWasAssigned1, doiWasAssigned2, datasetReviewWasPublished, datasetReviewDoiWasActivated],
              doiWasAssigned2.doi,
            ],
          ], // assigned twice
          [[[started, datasetReviewWasPublished, datasetReviewDoiWasActivated, doiWasAssigned1], doiWasAssigned1.doi]], // different order
        ],
      },
    },
  )
})

describe('decide', () => {
  test('has not been started', () => {
    const result = _.decide(new _.NotStarted(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test('has not been published', () => {
    const result = _.decide(new _.NotPublished(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenPublished({})))
  })

  test('has not been assigned a DOI', () => {
    const result = _.decide(new _.HasNotBeenAssignedADoi(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenAssignedADoi({})))
  })

  it.prop('has a inactive DOI', [fc.doi()], ([doi]) => {
    const result = _.decide(new _.HasAnInactiveDoi({ doi }), { datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewDoiWasActivated({ datasetReviewId }))),
    )
  })

  it.prop('with a different DOI', [fc.doi()], ([doi]) => {
    const result = _.decide(new _.HasAnActiveDoi({ doi }), { datasetReviewId })

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})

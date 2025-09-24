import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/MarkRecordAsPublishedOnZenodo.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered = new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
const recordCreated1 = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId: 123, datasetReviewId })
const recordCreated2 = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId: 456, datasetReviewId })
const doiWasAssigned = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.5072/zenodo.112360'),
  datasetReviewId,
})
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})
const recordWasPublished = new DatasetReviews.ZenodoRecordForDatasetReviewWasPublished({ datasetReviewId })

describe('foldState', () => {
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[recordCreated1, doiWasAssigned, datasetReviewWasPublished]], // with events
    ],
  })('not started', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
    examples: [
      [[started]], // was started
      [[started, answered]], // answered
      [[started, publicationOfDatasetReviewWasRequested]], // was requested
      [[started, answered, publicationOfDatasetReviewWasRequested]], // also answered
      [[started, publicationOfDatasetReviewWasRequested, answered]], // different order
    ],
  })('not published', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotPublished())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
        .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
    ],
    {
      examples: [
        [[started, answered, publicationOfDatasetReviewWasRequested, doiWasAssigned, datasetReviewWasPublished]], // was published with a DOI
      ],
    },
  )('does not have a record', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.DoesNotHaveARecord())
  })

  test.prop(
    [
      fc
        .tuple(
          fc.datasetReviewWasStarted(),
          fc.zenodoRecordForDatasetReviewWasCreated(),
          fc.datasetReviewWasPublished(),
        )
        .map(([started, created, published]) => Tuple.make([started, created, published], created.recordId)),
    ],
    {
      examples: [
        [[[started, recordCreated1, datasetReviewWasPublished], recordCreated1.recordId]], // assigned once
        [[[started, recordCreated1, recordCreated2, datasetReviewWasPublished], recordCreated2.recordId]], // assigned twice
      ],
    },
  )('has an unpublished record', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasAnUnpublishedRecord({ recordId: expected }))
  })

  test.prop(
    [
      fc
        .tuple(
          fc.datasetReviewWasStarted(),
          fc.zenodoRecordForDatasetReviewWasCreated(),
          fc.datasetReviewWasPublished(),
          fc.zenodoRecordForDatasetReviewWasPublished(),
        )
        .map(([started, created, ...published]) => Tuple.make([started, created, ...published], created.recordId)),
    ],
    {
      examples: [
        [[[started, recordCreated1, datasetReviewWasPublished, recordWasPublished], recordCreated1.recordId]], // assigned once
        [
          [
            [started, recordCreated1, recordCreated2, datasetReviewWasPublished, recordWasPublished],
            recordCreated2.recordId,
          ],
        ], // assigned twice
        [[[started, datasetReviewWasPublished, recordWasPublished, recordCreated1], recordCreated1.recordId]], // different order
      ],
    },
  )('has a published record', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasAPublishedRecord({ recordId: expected }))
  })
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

  test('does not have a record', () => {
    const result = _.decide(new _.DoesNotHaveARecord(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewDoesNotHaveAZenodoRecord({})))
  })

  test.prop([fc.integer()])('has an unpublished record', recordId => {
    const result = _.decide(new _.HasAnUnpublishedRecord({ recordId }), { datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.ZenodoRecordForDatasetReviewWasPublished({ datasetReviewId }))),
    )
  })

  test.prop([fc.integer()])('has a published record', recordId => {
    const result = _.decide(new _.HasAPublishedRecord({ recordId }), { datasetReviewId })

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})

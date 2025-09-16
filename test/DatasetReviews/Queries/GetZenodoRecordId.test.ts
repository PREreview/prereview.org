import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { type Array, Either, identity, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/GetZenodoRecordId.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const recordCreated1 = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId: 123, datasetReviewId })
const recordCreated2 = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId: 456, datasetReviewId })
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})
const recordPublished = new DatasetReviews.ZenodoRecordForDatasetReviewWasPublished({ datasetReviewId })

describe('GetZenodoRecordId', () => {
  describe('when it has a Zenodo record', () => {
    it.prop(
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.zenodoRecordForDatasetReviewWasCreated())
          .map(events =>
            Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, number]>(
              events,
              events[1].recordId,
            ),
          ),
      ],
      {
        examples: [
          [[[datasetReviewWasStarted, recordCreated1], recordCreated1.recordId]], // single record
          [[[datasetReviewWasStarted, recordCreated1, recordCreated2], recordCreated2.recordId]], // multiple records
          [[[datasetReviewWasStarted, recordCreated1, recordPublished], recordCreated1.recordId]], // published record
          [[[recordPublished, recordCreated1, datasetReviewWasStarted], recordCreated1.recordId]], // different order
        ],
      },
    )('returns the record ID', ([events, expected]) => {
      const actual = _.GetZenodoRecordId(events)

      expect(actual).toStrictEqual(Either.right(expected))
    })
  })

  describe("when it doesn't have a Zenodo record", () => {
    it.prop(
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
      ],
      {
        examples: [
          [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // was published
          [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // also requested
          [[datasetReviewWasStarted, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
          [[datasetReviewWasStarted, recordPublished]], // not created
        ],
      },
    )('returns an error', events => {
      const actual = _.GetZenodoRecordId(events)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewDoesNotHaveAZenodoRecord({})))
    })
  })
})

describe('when it has not been started', () => {
  it.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[answeredIfTheDatasetFollowsFairAndCarePrinciples, recordCreated1]], // with events
    ],
  })('returns an error', events => {
    const actual = _.GetZenodoRecordId(events)

    expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
  })
})

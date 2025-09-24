import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Equal, identity, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Queries/FindPublishedReviewsForADataset.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const datasetReviewId2 = Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931')
const otherDatasetReviewId = Uuid.Uuid('0b4aef08-494c-41dd-9a13-d6aaafea0733')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const otherDatasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.9ghx3ffhb') })

const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const datasetReviewWasStarted2 = new DatasetReviews.DatasetReviewWasStarted({
  authorId,
  datasetId,
  datasetReviewId: datasetReviewId2,
})
const otherDatasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({
  authorId,
  datasetId: otherDatasetId,
  datasetReviewId: otherDatasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})
const datasetReviewWasPublished2 = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId: datasetReviewId2,
  publicationDate: Temporal.PlainDate.from('2025-02-01'),
})
const otherDatasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId: otherDatasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-03-01'),
})

describe('FindPublishedReviewsForADataset', () => {
  describe('when there are published reviews', () => {
    it.prop(
      [
        fc
          .datasetReviewWasStarted()
          .chain(started =>
            fc
              .tuple(
                fc.constant(started),
                fc.datasetReviewWasPublished({ datasetReviewId: fc.constant(started.datasetReviewId) }),
              )
              .map(([started, published]) =>
                Tuple.make(started.datasetId, [started, published], [started.datasetReviewId]),
              ),
          ),
      ],
      {
        examples: [
          [[datasetId, [datasetReviewWasStarted, datasetReviewWasPublished], [datasetReviewId]]], // one published
          [
            [
              datasetId,
              [
                datasetReviewWasStarted,
                datasetReviewWasStarted2,
                datasetReviewWasPublished,
                datasetReviewWasPublished2,
              ],
              [datasetReviewId2, datasetReviewId],
            ],
          ], // two published
          [
            [
              datasetId,
              [
                datasetReviewWasPublished2,
                datasetReviewWasPublished,
                datasetReviewWasStarted,
                datasetReviewWasStarted2,
              ],
              [datasetReviewId2, datasetReviewId],
            ],
          ], // different order,
        ],
      },
    )('returns the reviews', ([datasetId, events, expected]) => {
      const actual = _.FindPublishedReviewsForADataset(events)(datasetId)

      expect(actual).toStrictEqual(expected)
    })
  })

  describe('when there are no published reviews', () => {
    it.prop(
      [
        fc.datasetId(),
        fc
          .array(fc.datasetReviewWasStarted())
          .map(
            identity<ReadonlyArray<DatasetReviews.DatasetReviewWasStarted | DatasetReviews.DatasetReviewWasPublished>>,
          ),
      ],
      {
        examples: [
          [datasetId, []], // nothing has been started
          [datasetId, [datasetReviewWasStarted]], // one has been started
          [datasetId, [datasetReviewWasStarted, otherDatasetReviewWasStarted]], // multiple have been started
          [datasetId, [datasetReviewWasPublished]], // no started events
        ],
      },
    )('returns nothing', (datasetId, events) => {
      const actual = _.FindPublishedReviewsForADataset(events)(datasetId)

      expect(actual).toStrictEqual([])
    })
  })

  describe('when reviews are for other datasets', () => {
    it.prop(
      [
        fc
          .tuple(fc.datasetId(), fc.datasetId(), fc.uuid())
          .filter(([datasetId1, datasetId2]) => !Equal.equals(datasetId1, datasetId2))
          .chain(([datasetId1, datasetId2, datasetReviewId]) =>
            fc.tuple(
              fc.constant(datasetId1),
              fc.nonEmptyArray(
                fc.oneof(
                  fc.datasetReviewWasStarted({
                    datasetId: fc.constant(datasetId2),
                    datasetReviewId: fc.constant(datasetReviewId),
                  }),
                  fc.datasetReviewWasPublished({ datasetReviewId: fc.constant(datasetReviewId) }),
                ),
              ),
            ),
          ),
      ],
      {
        examples: [
          [[datasetId, [otherDatasetReviewWasStarted]]], // other dataset review was started
          [[datasetId, [otherDatasetReviewWasStarted, otherDatasetReviewWasPublished]]], // other dataset review was published
          [[otherDatasetId, [datasetReviewWasStarted, datasetReviewWasPublished]]], // reversed
        ],
      },
    )('returns nothing', ([datasetId, events]) => {
      const actual = _.FindPublishedReviewsForADataset(events)(datasetId)

      expect(actual).toStrictEqual([])
    })
  })
})

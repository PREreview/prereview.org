import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/MarkRecordCreatedOnZenodo.ts'
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
const recordCreated1 = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId: 123, datasetReviewId })
const recordCreated2 = new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId: 456, datasetReviewId })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

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
          [[recordCreated1, datasetReviewWasPublished]], // with events
        ],
      },
    },
  )

  it.prop(
    'does not have a record',
    [fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.DoesNotHaveARecord())
    },
    {
      fastCheck: {
        examples: [
          [[started]], // was started
          [[started, answered, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // was published
        ],
      },
    },
  )

  it.prop(
    'has a record',
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.zenodoRecordForDatasetReviewWasCreated())
        .map(([started, created]) => [started, created]),
    ],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.AlreadyHasARecord())
    },
    {
      fastCheck: {
        examples: [
          [[started, recordCreated1]], // created once
          [[started, recordCreated1, recordCreated2]], // created twice
        ],
      },
    },
  )
})

describe('decide', () => {
  it.prop('has not been started', [fc.integer()], ([recordId]) => {
    const result = _.decide(new _.NotStarted(), { recordId, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  it.prop('does not have a record', [fc.integer()], ([recordId]) => {
    const result = _.decide(new _.DoesNotHaveARecord(), { recordId, datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(
        Option.some(new DatasetReviews.ZenodoRecordForDatasetReviewWasCreated({ recordId, datasetReviewId })),
      ),
    )
  })

  describe('already has a record', () => {
    it.prop('with a different answer', [fc.integer()], ([recordId]) => {
      const result = _.decide(new _.AlreadyHasARecord(), { recordId, datasetReviewId })

      expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewAlreadyHasAZenodoRecord({})))
    })
  })
})

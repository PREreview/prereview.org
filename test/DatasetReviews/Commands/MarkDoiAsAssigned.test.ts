import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/MarkDoiAsAssigned.ts'
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
    'does not have a DOI',
    [fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)],
    ([events]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.DoesNotHaveADoi())
    },
    {
      fastCheck: {
        examples: [
          [[started]], // was started
          [[started, answered, publicationOfDatasetReviewWasRequested, recordCreated, datasetReviewWasPublished]], // was published
        ],
      },
    },
  )

  it.prop(
    'has a DOI',
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasAssignedADoi())
        .map(([started, assigned]) => Tuple.make([started, assigned], assigned.doi)),
    ],
    ([[events, expected]]) => {
      const state = _.foldState(events)

      expect(state).toStrictEqual(new _.AlreadyHasADoi({ doi: expected }))
    },
    {
      fastCheck: {
        examples: [
          [[[started, doiWasAssigned1], doiWasAssigned1.doi]], // assigned once
          [[[started, doiWasAssigned1, doiWasAssigned2], doiWasAssigned2.doi]], // assigned twice
        ],
      },
    },
  )
})

describe('decide', () => {
  it.prop('has not been started', [fc.doi()], ([doi]) => {
    const result = _.decide(new _.NotStarted(), { doi, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  it.prop('does not have a DOI', [fc.doi()], ([doi]) => {
    const result = _.decide(new _.DoesNotHaveADoi(), { doi, datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewWasAssignedADoi({ doi, datasetReviewId }))),
    )
  })

  describe('already has a DOI', () => {
    it.prop('with the same DOI', [fc.doi()], ([doi]) => {
      const result = _.decide(new _.AlreadyHasADoi({ doi }), { doi, datasetReviewId })

      expect(result).toStrictEqual(Either.right(Option.none()))
    })

    it.prop(
      'with a different DOI',
      [fc.tuple(fc.doi(), fc.doi()).filter(([doi1, doi2]) => !Equal.equals(doi1, doi2))],
      ([[doi1, doi2]]) => {
        const result = _.decide(new _.AlreadyHasADoi({ doi: doi1 }), { doi: doi2, datasetReviewId })

        expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewAlreadyHasADoi({})))
      },
    )
  })
})

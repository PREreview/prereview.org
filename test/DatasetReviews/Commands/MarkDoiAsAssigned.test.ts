import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
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
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[recordCreated, doiWasAssigned1, datasetReviewWasPublished]], // with events
    ],
  })('not started', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
    examples: [
      [[started]], // was started
      [[started, answered, publicationOfDatasetReviewWasRequested, recordCreated, datasetReviewWasPublished]], // was published
    ],
  })('does not have a DOI', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.DoesNotHaveADoi())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasAssignedADoi())
        .map(([started, assigned]) => Tuple.make([started, assigned], assigned.doi)),
    ],
    {
      examples: [
        [[[started, doiWasAssigned1], doiWasAssigned1.doi]], // assigned once
        [[[started, doiWasAssigned1, doiWasAssigned2], doiWasAssigned2.doi]], // assigned twice
      ],
    },
  )('has a DOI', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.AlreadyHasADoi({ doi: expected }))
  })
})

describe('decide', () => {
  test.prop([fc.doi()])('has not been started', doi => {
    const result = _.decide(new _.NotStarted(), { doi, datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.prop([fc.doi()])('does not have a DOI', doi => {
    const result = _.decide(new _.DoesNotHaveADoi(), { doi, datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewWasAssignedADoi({ doi, datasetReviewId }))),
    )
  })

  describe('already has a DOI', () => {
    test.prop([fc.doi()])('with the same DOI', doi => {
      const result = _.decide(new _.AlreadyHasADoi({ doi }), { doi, datasetReviewId })

      expect(result).toStrictEqual(Either.right(Option.none()))
    })

    test.prop([fc.tuple(fc.doi(), fc.doi()).filter(([doi1, doi2]) => !Equal.equals(doi1, doi2))])(
      'with a different DOI',
      ([doi1, doi2]) => {
        const result = _.decide(new _.AlreadyHasADoi({ doi: doi1 }), { doi: doi2, datasetReviewId })

        expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewAlreadyHasADoi({})))
      },
    )
  })
})

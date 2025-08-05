import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/MarkDoiAsActivated.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, Orcid, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = Orcid.Orcid('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const started = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answered = new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: 'no', datasetReviewId })
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
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({ datasetReviewId })
const datasetReviewDoiWasActivated = new DatasetReviews.DatasetReviewDoiWasActivated({ datasetReviewId })

describe('foldState', () => {
  test.prop([fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))], {
    examples: [
      [[]], // no events
      [[recordCreated, doiWasAssigned1, datasetReviewWasPublished]], // with events
    ],
  })('not started', () => {
    const state = _.foldState([])

    expect(state).toStrictEqual(new _.NotStarted())
  })

  test.failing.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
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

  test.failing.prop([fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)], {
    examples: [
      [[started, answered, publicationOfDatasetReviewWasRequested, recordCreated, datasetReviewWasPublished]], // was published with a DOI
    ],
  })('does not have a DOI', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasNotBeenAssignedADoi())
  })

  test.failing.prop(
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
  )('has an inactive DOI', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasAnInactiveDoi({ doi: expected }))
  })

  test.failing.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasAssignedADoi(), fc.datasetReviewDoiWasActivated())
        .map(([started, assigned, activated]) => Tuple.make([started, assigned, activated], assigned.doi)),
    ],
    {
      examples: [
        [[[started, doiWasAssigned1, datasetReviewDoiWasActivated], doiWasAssigned1.doi]], // assigned once
        [[[started, doiWasAssigned1, doiWasAssigned2], doiWasAssigned2.doi]], // assigned twice
        [[[started, datasetReviewDoiWasActivated, doiWasAssigned1], doiWasAssigned1.doi]], // different order
      ],
    },
  )('has an active DOI', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasAnActiveDoi({ doi: expected }))
  })
})

describe('decide', () => {
  test('has not been started', () => {
    const result = _.decide(new _.NotStarted(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()))
  })

  test.failing('has not been published', () => {
    const result = _.decide(new _.NotPublished(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenPublished({})))
  })

  test.failing('has not been assigned a DOI', () => {
    const result = _.decide(new _.HasNotBeenAssignedADoi(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenAssignedADoi({})))
  })

  test.failing.prop([fc.doi()])('has a inactive DOI', doi => {
    const result = _.decide(new _.HasAnInactiveDoi({ doi }), { datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewDoiWasActivated({ datasetReviewId }))),
    )
  })

  test.failing.prop([fc.doi()])('with a different DOI', doi => {
    const result = _.decide(new _.HasAnActiveDoi({ doi }), { datasetReviewId })

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})

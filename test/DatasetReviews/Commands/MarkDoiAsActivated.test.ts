import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/MarkDoiAsActivated.js'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as Datasets from '../../../src/Datasets/index.js'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.js'
import * as fc from '../../fc.js'

const datasetReviewId = Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
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
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})
const datasetReviewDoiWasActivated = new DatasetReviews.DatasetReviewDoiWasActivated({ datasetReviewId })

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
        [[started, answered, publicationOfDatasetReviewWasRequested, recordCreated, datasetReviewWasPublished]], // was published with a DOI
      ],
    },
  )('does not have a DOI', events => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasNotBeenAssignedADoi())
  })

  test.prop(
    [
      fc
        .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasAssignedADoi(), fc.datasetReviewWasPublished())
        .map(([started, assigned, published]) => Tuple.make([started, assigned, published], assigned.doi)),
    ],
    {
      examples: [
        [[[started, doiWasAssigned1, datasetReviewWasPublished], doiWasAssigned1.doi]], // assigned once
        [[[started, doiWasAssigned1, doiWasAssigned2, datasetReviewWasPublished], doiWasAssigned2.doi]], // assigned twice
      ],
    },
  )('has an inactive DOI', ([events, expected]) => {
    const state = _.foldState(events)

    expect(state).toStrictEqual(new _.HasAnInactiveDoi({ doi: expected }))
  })

  test.prop(
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
    {
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

  test('has not been published', () => {
    const result = _.decide(new _.NotPublished(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenPublished({})))
  })

  test('has not been assigned a DOI', () => {
    const result = _.decide(new _.HasNotBeenAssignedADoi(), { datasetReviewId })

    expect(result).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewHasNotBeenAssignedADoi({})))
  })

  test.prop([fc.doi()])('has a inactive DOI', doi => {
    const result = _.decide(new _.HasAnInactiveDoi({ doi }), { datasetReviewId })

    expect(result).toStrictEqual(
      Either.right(Option.some(new DatasetReviews.DatasetReviewDoiWasActivated({ datasetReviewId }))),
    )
  })

  test.prop([fc.doi()])('with a different DOI', doi => {
    const result = _.decide(new _.HasAnActiveDoi({ doi }), { datasetReviewId })

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})

import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Tuple } from 'effect'
import * as Datasets from '../src/Datasets/index.js'
import * as _ from '../src/Events.js'
import { Doi, OrcidId, Uuid } from '../src/types/index.js'
import * as fc from './fc.js'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const otherAuthorId = OrcidId.OrcidId('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const otherDatasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.9ghx3ffhb') })
const datasetReviewWasStarted = new _.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })

describe('matches', () => {
  test.prop(
    [fc.event().map(event => Tuple.make<[_.Event, _.EventFilter<_.Event['_tag']>]>(event, { types: [event._tag] }))],
    {
      examples: [
        [[datasetReviewWasStarted, { types: ['DatasetReviewWasStarted'] }]], // single type
        [
          [
            datasetReviewWasStarted,
            { types: ['DatasetReviewWasStarted', 'AnsweredIfTheDatasetFollowsFairAndCarePrinciples'] },
          ], // multiple types
        ],
        [
          [
            datasetReviewWasStarted,
            { types: ['DatasetReviewWasStarted'], predicates: { datasetId: datasetReviewWasStarted.datasetId } },
          ], // single type and predicate
        ],
        [
          [
            datasetReviewWasStarted,
            {
              types: ['DatasetReviewWasStarted', 'AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
              predicates: { datasetId: datasetReviewWasStarted.datasetId, authorId: datasetReviewWasStarted.authorId },
            },
          ], // multiple types and predicates
        ],
      ],
    },
  )('when the event matches the filter', ([event, filter]) => {
    const result = _.matches(event, filter)

    expect(result).toBeTruthy()
  })
  test.prop(
    [
      fc
        .tuple(fc.event(), fc.event())
        .filter(([event1, event2]) => event1._tag !== event2._tag)
        .map(([event1, event2]) =>
          Tuple.make<[_.Event, _.EventFilter<_.Event['_tag']>]>(event1, { types: [event2._tag] }),
        ),
    ],
    {
      examples: [
        [[datasetReviewWasStarted, { types: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'] }]], // single type
        [
          [
            datasetReviewWasStarted,
            { types: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples', 'PublicationOfDatasetReviewWasRequested'] },
          ], // multiple types
        ],
        [
          [datasetReviewWasStarted, { types: ['DatasetReviewWasStarted'], predicates: { datasetId: otherDatasetId } }], // single predicate doesn't match
        ],
        [
          [
            datasetReviewWasStarted,
            { types: ['DatasetReviewWasStarted'], predicates: { datasetId: otherDatasetId, authorId: otherAuthorId } },
          ], // multiple predicates don't match
        ],
      ],
    },
  )("when the event doesn't match the filter", ([event, filter]) => {
    const result = _.matches(event, filter)

    expect(result).toBeFalsy()
  })
})

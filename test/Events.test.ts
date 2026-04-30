import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Tuple, type Types } from 'effect'
import * as Datasets from '../src/Datasets/index.ts'
import * as _ from '../src/Events.ts'
import * as Preprints from '../src/Preprints/index.ts'
import { Doi, OrcidId, Uuid } from '../src/types/index.ts'
import * as fc from './fc.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const otherAuthorId = OrcidId.OrcidId('0000-0002-6109-0367')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const otherDatasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.9ghx3ffhb') })
const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2024.01.01.12345') })
const preprintIdIndeterminate = new Preprints.BiorxivOrMedrxivPreprintId({ value: preprintId.value })
const otherPreprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2024.01.01.67890') })
const datasetReviewWasStarted = new _.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const reviewRequestForAPreprintWasStarted = new _.ReviewRequestForAPreprintWasStarted({
  startedAt: Temporal.Now.instant(),
  preprintId,
  reviewRequestId: Uuid.Uuid('2404b8f0-ac79-436d-a452-ba7f1cdab753'),
  requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
})

describe('matches', () => {
  it.prop(
    'when the event matches the filter',
    [
      fc
        .event()
        .map(event => Tuple.make<[_.Event, _.EventFilter<Types.Tags<_.Event>>]>(event, { types: [event._tag] })),
    ],
    ([[event, filter]]) => {
      const result = _.matches(event, filter)

      expect(result).toBeTruthy()
    },
    {
      fastCheck: {
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
                predicates: {
                  datasetId: datasetReviewWasStarted.datasetId,
                  authorId: datasetReviewWasStarted.authorId,
                },
              },
            ], // multiple types and predicates
          ],
          [
            [
              datasetReviewWasStarted,
              [
                {
                  types: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
                  predicates: {
                    datasetId: datasetReviewWasStarted.datasetId,
                    authorId: datasetReviewWasStarted.authorId,
                  },
                },
                {
                  types: ['DatasetReviewWasStarted'],
                  predicates: {
                    datasetId: datasetReviewWasStarted.datasetId,
                    authorId: datasetReviewWasStarted.authorId,
                  },
                },
              ],
            ], // multiple filters
          ],
          [
            [
              reviewRequestForAPreprintWasStarted,
              { types: ['ReviewRequestForAPreprintWasStarted'], predicates: { preprintId: preprintIdIndeterminate } },
            ], // complex predicate
          ],
        ],
      },
    },
  )
  it.prop(
    "when the event doesn't match the filter",
    [
      fc
        .tuple(fc.event(), fc.event())
        .filter(([event1, event2]) => event1._tag !== event2._tag)
        .map(([event1, event2]) =>
          Tuple.make<[_.Event, _.EventFilter<Types.Tags<_.Event>>]>(event1, { types: [event2._tag] }),
        ),
    ],
    ([[event, filter]]) => {
      const result = _.matches(event, filter)

      expect(result).toBeFalsy()
    },
    {
      fastCheck: {
        examples: [
          [[datasetReviewWasStarted, { types: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'] }]], // single type
          [
            [
              datasetReviewWasStarted,
              { types: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples', 'PublicationOfDatasetReviewWasRequested'] },
            ], // multiple types
          ],
          [
            [
              datasetReviewWasStarted,
              { types: ['DatasetReviewWasStarted'], predicates: { datasetId: otherDatasetId } },
            ], // single predicate doesn't match
          ],
          [
            [
              datasetReviewWasStarted,
              {
                types: ['DatasetReviewWasStarted'],
                predicates: { datasetId: otherDatasetId, authorId: otherAuthorId },
              },
            ], // multiple predicates don't match
          ],
          [
            [
              datasetReviewWasStarted,
              [
                {
                  types: ['DatasetReviewWasStarted'],
                  predicates: { datasetId, authorId: otherAuthorId },
                },
                {
                  types: ['DatasetReviewWasStarted'],
                  predicates: { datasetId: otherDatasetId, authorId },
                },
              ],
            ], // multiple filters
          ],
          [
            [
              reviewRequestForAPreprintWasStarted,
              { types: ['ReviewRequestForAPreprintWasStarted'], predicates: { preprintId: otherPreprintId } },
            ], // complex predicate
          ],
        ],
      },
    },
  )
})

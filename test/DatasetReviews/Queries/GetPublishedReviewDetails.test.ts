import { it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, identity, Option, Predicate, Tuple } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../src/DatasetReviews/Queries/GetPublishedReviewDetails.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const datasetReviewId = Uuid.Uuid('fd6b7b4b-a560-4a32-b83b-d3847161003a')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const datasetReviewWasStarted = new DatasetReviews.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })
const answeredIfTheDatasetFollowsFairAndCarePrinciples =
  new DatasetReviews.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
    answer: 'no',
    detail: Option.none(),
    datasetReviewId,
  })
const publicationOfDatasetReviewWasRequested = new DatasetReviews.PublicationOfDatasetReviewWasRequested({
  datasetReviewId,
})
const datasetReviewWasAssignedADoi1 = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.1000/12345'),
  datasetReviewId,
})
const datasetReviewWasAssignedADoi2 = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi.Doi('10.1000/67890'),
  datasetReviewId,
})
const datasetReviewWasPublished = new DatasetReviews.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.PlainDate.from('2025-01-01'),
})

describe('GetPublishedReviewDetails', () => {
  describe('when it has been published', () => {
    describe('when there is a DOI', () => {
      it.prop(
        'returns the DOI',
        [
          fc
            .tuple(
              fc.datasetReviewWasStarted(),
              fc.personaForDatasetReviewWasChosen(),
              fc.datasetReviewWasAssignedADoi(),
              fc.datasetReviewWasPublished(),
            )
            .map(events =>
              Tuple.make<[Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>, _.PublishedReviewDetails]>(
                events,
                {
                  doi: events[2].doi,
                  id: events[2].datasetReviewId,
                  persona: events[1].persona,
                },
              ),
            ),
        ],
        ([[events, expected]]) => {
          const actual = _.GetPublishedReviewDetails(events)

          expect(actual).toStrictEqual(Either.right(expected))
        },
        {
          fastCheck: {
            examples: [
              [
                [
                  [
                    datasetReviewWasStarted,
                    answeredIfTheDatasetFollowsFairAndCarePrinciples,
                    datasetReviewWasAssignedADoi1,
                    datasetReviewWasPublished,
                  ],
                  {
                    doi: datasetReviewWasAssignedADoi1.doi,
                    id: datasetReviewWasStarted.datasetReviewId,
                    persona: 'public',
                  },
                ],
              ], // was published
              [
                [
                  [
                    datasetReviewWasStarted,
                    answeredIfTheDatasetFollowsFairAndCarePrinciples,
                    datasetReviewWasAssignedADoi1,
                    datasetReviewWasAssignedADoi2,
                    datasetReviewWasPublished,
                  ],
                  {
                    doi: datasetReviewWasAssignedADoi2.doi,
                    id: datasetReviewWasStarted.datasetReviewId,
                    persona: 'public',
                  },
                ],
              ], // multiple DOIs
              [
                [
                  [
                    datasetReviewWasStarted,
                    datasetReviewWasPublished,
                    answeredIfTheDatasetFollowsFairAndCarePrinciples,
                    datasetReviewWasAssignedADoi1,
                  ],
                  {
                    doi: datasetReviewWasAssignedADoi1.doi,
                    id: datasetReviewWasStarted.datasetReviewId,
                    persona: 'public',
                  },
                ],
              ], // different order
            ],
          },
        },
      )
    })

    describe("when there isn't a DOI", () => {
      it.prop(
        'returns an error',
        [
          fc
            .tuple(fc.datasetReviewWasStarted(), fc.datasetReviewWasPublished())
            .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
        ],
        ([events]) => {
          const actual = _.GetPublishedReviewDetails(events)

          expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
        },
        {
          fastCheck: {
            examples: [
              [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // was published
              [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasPublished]], // also requested
              [[datasetReviewWasStarted, datasetReviewWasPublished, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // different order
            ],
          },
        },
      )
    })
  })

  describe('when it is being published', () => {
    it.prop(
      'returns an error',
      [
        fc
          .tuple(fc.datasetReviewWasStarted(), fc.publicationOfDatasetReviewWasRequested())
          .map(identity<Array.NonEmptyReadonlyArray<DatasetReviews.DatasetReviewEvent>>),
      ],
      ([events]) => {
        const actual = _.GetPublishedReviewDetails(events)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()))
      },
      {
        fastCheck: {
          examples: [
            [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested]], // was requested
            [[datasetReviewWasStarted, publicationOfDatasetReviewWasRequested, datasetReviewWasAssignedADoi1]], // assigned a DOI
            [
              [
                datasetReviewWasStarted,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
                publicationOfDatasetReviewWasRequested,
              ],
            ], // also answered
            [
              [
                datasetReviewWasStarted,
                publicationOfDatasetReviewWasRequested,
                answeredIfTheDatasetFollowsFairAndCarePrinciples,
              ],
            ], // different order
          ],
        },
      },
    )
  })

  describe('when it is in progress', () => {
    it.prop(
      'returns an error',
      [fc.datasetReviewWasStarted().map(Array.of<DatasetReviews.DatasetReviewEvent>)],
      ([events]) => {
        const actual = _.GetPublishedReviewDetails(events)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.DatasetReviewIsInProgress()))
      },
      {
        fastCheck: {
          examples: [
            [[datasetReviewWasStarted]], // was started
            [[datasetReviewWasStarted, answeredIfTheDatasetFollowsFairAndCarePrinciples]], // with answer
          ],
        },
      },
    )
  })

  describe('when it has not been started', () => {
    it.prop(
      'returns an error',
      [fc.array(fc.datasetReviewEvent().filter(Predicate.not(Predicate.isTagged('DatasetReviewWasStarted'))))],
      ([events]) => {
        const actual = _.GetPublishedReviewDetails(events)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.UnexpectedSequenceOfEvents({})))
      },
      {
        fastCheck: {
          examples: [
            [[]], // no events
            [[answeredIfTheDatasetFollowsFairAndCarePrinciples, datasetReviewWasPublished]], // with events
          ],
        },
      },
    )
  })
})

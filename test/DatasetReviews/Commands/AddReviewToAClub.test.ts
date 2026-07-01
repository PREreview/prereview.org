import { expect, test } from '@effect/vitest'
import { Either, Option } from 'effect'
import * as _ from '../../../src/DatasetReviews/Commands/AddReviewToAClub.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import { DryadDatasetId } from '../../../src/Datasets/DatasetId.ts'
import * as Events from '../../../src/Events.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const input = {
  datasetReviewId: Uuid('e179be5f-947e-4408-b28d-68feec3a0015'),
  clubId: '13e21570-0d1a-47f0-b378-b8c20776496a',
} satisfies _.Input

const started = new Events.DatasetReviewWasStarted({
  datasetReviewId: input.datasetReviewId,
  authorId: OrcidId('0000-0002-1825-0097'),
  datasetId: new DryadDatasetId({ value: Doi('10.5061/dryad.12345') }),
})

const added = new Events.DatasetReviewWasAddedToAClub({
  datasetReviewId: input.datasetReviewId,
  clubId: input.clubId,
})

const addedDifferentClub = new Events.DatasetReviewWasAddedToAClub({
  datasetReviewId: input.datasetReviewId,
  clubId: 'd3e62606-0367-44b9-8d52-b75e0e7e5ba7',
})

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new DatasetReviews.UnknownDatasetReview({}))],
  ['not in a club', [started], input, Either.right(Option.some(added))],
  ['already in the club', [started, added], input, Either.right(Option.none())],
  [
    'already a different club',
    [started, addedDifferentClub],
    input,
    Either.left(new DatasetReviews.DatasetReviewHasAlreadyBeenAddedToAClub()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.AddReviewToAClub

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})

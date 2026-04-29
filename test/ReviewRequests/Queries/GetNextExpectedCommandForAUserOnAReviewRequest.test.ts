import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/GetNextExpectedCommandForAUserOnAReviewRequest.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'

const requesterId1 = OrcidId.OrcidId('0000-0002-1825-0097')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })

const reviewRequestId1 = Uuid.Uuid('123e4567-e89b-12d3-a456-426614174000')
const reviewRequestId2 = Uuid.Uuid('e7c61ab4-1080-4b6f-8826-397b094c4fad')

const now = Temporal.Now.instant()

const started = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  reviewRequestId: reviewRequestId1,
  requesterId: requesterId1,
  preprintId: preprintId1,
  startedAt: now,
})

const publicChosen = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  reviewRequestId: reviewRequestId1,
  persona: 'public',
})

const pseudonymChosen = new ReviewRequests.PersonaForAReviewRequestForAPreprintWasChosen({
  reviewRequestId: reviewRequestId1,
  persona: 'pseudonym',
})

const published = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  reviewRequestId: reviewRequestId1,
  publishedAt: now,
})

const imported = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  reviewRequestId: reviewRequestId1,
  requester: { orcidId: requesterId1, persona: 'public' },
  preprintId: preprintId1,
  publishedAt: now,
})

test.each<[string, _.Input, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, _.Result]>([
  ['no events', { reviewRequestId: reviewRequestId1 }, [], Either.left(new ReviewRequests.UnknownReviewRequest({}))],
  [
    'different review request ID',
    { reviewRequestId: reviewRequestId2 },
    [started, imported],
    Either.left(new ReviewRequests.UnknownReviewRequest({})),
  ],
  [
    'has been imported',
    { reviewRequestId: reviewRequestId1 },
    [imported],
    Either.left(new ReviewRequests.ReviewRequestHasBeenPublished({})),
  ],
  ['incomplete without choice', { reviewRequestId: reviewRequestId1 }, [started], Either.right('ChoosePersona')],
  [
    'has been published',
    { reviewRequestId: reviewRequestId1 },
    [started, publicChosen, published],
    Either.left(new ReviewRequests.ReviewRequestHasBeenPublished({})),
  ],
  [
    'incomplete with choice',
    { reviewRequestId: reviewRequestId1 },
    [started, publicChosen],
    Either.right('PublishReviewRequest'),
  ],
  [
    'incomplete with multiples choice',
    { reviewRequestId: reviewRequestId1 },
    [started, publicChosen, pseudonymChosen],
    Either.right('PublishReviewRequest'),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetNextExpectedCommandForAUserOnAReviewRequest

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})

import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/GetPersonaChoice.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'

const requesterId1 = OrcidId.OrcidId('0000-0002-1825-0097')
const requesterId2 = OrcidId.OrcidId('0000-0002-6109-0367')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId1IndeterminateVersion = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId2 = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })

const reviewRequestId1 = Uuid.Uuid('123e4567-e89b-12d3-a456-426614174000')

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
  [
    'no events',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [],
    Either.left(new ReviewRequests.UnknownReviewRequest({})),
  ],
  [
    'different requester',
    { requesterId: requesterId2, preprintId: preprintId1 },
    [started, imported],
    Either.left(new ReviewRequests.UnknownReviewRequest({})),
  ],
  [
    'different preprint',
    { requesterId: requesterId1, preprintId: preprintId2 },
    [started, imported],
    Either.left(new ReviewRequests.UnknownReviewRequest({})),
  ],
  [
    'has been imported',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [imported],
    Either.left(new ReviewRequests.ReviewRequestHasBeenPublished({})),
  ],
  [
    'started with same DOI, different preprint ID',
    { requesterId: requesterId1, preprintId: preprintId1IndeterminateVersion },
    [started],
    Either.right({ reviewRequestId: reviewRequestId1, personaChoice: Option.none() }),
  ],
  [
    'imported with same DOI, different preprint ID',
    { requesterId: requesterId1, preprintId: preprintId1IndeterminateVersion },
    [imported],
    Either.left(new ReviewRequests.ReviewRequestHasBeenPublished({})),
  ],
  [
    'incomplete without choice',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [started],
    Either.right({ reviewRequestId: reviewRequestId1, personaChoice: Option.none() }),
  ],
  [
    'has been published',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [started, publicChosen, published],
    Either.left(new ReviewRequests.ReviewRequestHasBeenPublished({})),
  ],
  [
    'incomplete with choice',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [started, publicChosen],
    Either.right({ reviewRequestId: reviewRequestId1, personaChoice: Option.some('public') }),
  ],
  [
    'incomplete with multiples choice',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [started, publicChosen, pseudonymChosen],
    Either.right({ reviewRequestId: reviewRequestId1, personaChoice: Option.some('pseudonym') }),
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.GetPersonaChoice

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})

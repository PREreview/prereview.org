import { expect, test } from '../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import * as Events from '../../src/Events.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import * as _ from '../../src/AuthorInvites/ImportAuthorChoices.ts'

const input = {
  reviewId: 12345,
  orcidId: OrcidId('0000-0002-1825-0097'),
  persona: 'public',
  confirmedAt: Temporal.Now.instant(),
} satisfies _.Input

const differentPrereviewerSameReview = new Events.AuthorChoicesForAReviewImported({
  reviewId: input.reviewId,
  orcidId: OrcidId('0000-0002-6109-0367'),
  persona: 'public',
  confirmedAt: Temporal.Now.instant(),
})

const samePrereviewerDifferentReview = new Events.AuthorChoicesForAReviewImported({
  reviewId: 54321,
  orcidId: input.orcidId,
  persona: 'public',
  confirmedAt: Temporal.Now.instant(),
})

const samePrereviewerSameReviewSameData = new Events.AuthorChoicesForAReviewImported({
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  persona: input.persona,
  confirmedAt: input.confirmedAt,
})

const samePrereviewerSameReviewDifferentData = new Events.AuthorChoicesForAReviewImported({
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  persona: 'pseudonym',
  confirmedAt: Temporal.Now.instant(),
})

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Events.Event]>([
  ['no events', [], input, new Events.AuthorChoicesForAReviewImported(input)],
  [
    'another PREreviewer already imported on same review',
    [differentPrereviewerSameReview],
    input,
    new Events.AuthorChoicesForAReviewImported(input),
  ],
  [
    'PREreviewer already imported on different review',
    [samePrereviewerDifferentReview],
    input,
    new Events.AuthorChoicesForAReviewImported(input),
  ],
  [
    'already imported with same data',
    [samePrereviewerSameReviewSameData],
    input,
    new Events.AuthorChoicesForAReviewImported(input),
  ],
  [
    'already imported with different data',
    [samePrereviewerSameReviewDifferentData],
    input,
    new Events.AuthorChoicesForAReviewImported(input),
  ],
])('%s', (_name, events, input, expected) => {
  const { decide } = _.ImportAuthorChoices
  const actual = decide(input)

  expect(actual).toStrictEqual(expected)
})

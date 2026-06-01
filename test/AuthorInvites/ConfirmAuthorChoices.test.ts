import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as _ from '../../src/AuthorInvites/ConfirmAuthorChoices.ts'
import { DryadDatasetId } from '../../src/Datasets/index.ts'
import * as Events from '../../src/Events.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  reviewId: Uuid('4ecba4c3-f0f7-4631-8011-58e7a0a62e6a'),
  orcidId: OrcidId('0000-0002-1825-0097'),
  confirmedAt: Temporal.Now.instant(),
} satisfies _.Input

const inputWithDifferentReviewId = {
  ...input,
  reviewId: Uuid('17914f94-6e6c-4f9c-88eb-860522596169'),
} satisfies _.Input

const inputWithDifferentOrcidId = {
  ...input,
  orcidId: OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const invitationId = Uuid('aa39be59-6e33-4756-a4c9-109a152a6fc5')

const inviteAccepted = new Events.AuthorInviteAccepted({
  invitationId,
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  acceptedAt: Temporal.Now.instant(),
})

const personaChosen = new Events.PersonaForAReviewChosen({
  orcidId: input.orcidId,
  reviewId: input.reviewId,
  persona: 'public',
})

const confirmed = new Events.AuthorChoicesForAReviewConfirmed({
  orcidId: input.orcidId,
  reviewId: input.reviewId,
  confirmedAt: Temporal.Now.instant(),
})

const started = new Events.DatasetReviewWasStarted({
  datasetReviewId: input.reviewId,
  authorId: input.orcidId,
  datasetId: new DryadDatasetId({ value: Doi('10.5061/dryad.12345') }),
})

const startedDifferentOrcidId = new Events.DatasetReviewWasStarted({
  datasetReviewId: input.reviewId,
  authorId: inputWithDifferentOrcidId.orcidId,
  datasetId: new DryadDatasetId({ value: Doi('10.5061/dryad.12345') }),
})

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.ChoicesDoNotNeedToBeConfirmed())],
  ['invitation accepted', [inviteAccepted], input, Either.left(new _.ChoicesDoNotNeedToBeConfirmed())],
  [
    'persona chosen',
    [inviteAccepted, personaChosen],
    input,
    Either.right(Option.some(new Events.AuthorChoicesForAReviewConfirmed(input))),
  ],
  [
    'no matching review id',
    [inviteAccepted, personaChosen],
    inputWithDifferentReviewId,
    Either.left(new _.ChoicesDoNotNeedToBeConfirmed()),
  ],
  [
    'no matching ORCID iD',
    [inviteAccepted, personaChosen],
    inputWithDifferentOrcidId,
    Either.left(new _.ChoicesDoNotNeedToBeConfirmed()),
  ],
  [
    'choices already confirmed',
    [inviteAccepted, personaChosen, confirmed],
    input,
    Either.left(new _.ChoicesCannotBeChanged()),
  ],
  ['started the review', [started, inviteAccepted], input, Either.left(new _.ChoicesCannotBeChanged())],
  [
    'someone else started the review',
    [startedDifferentOrcidId, inviteAccepted],
    input,
    Either.left(new _.ChoicesDoNotNeedToBeConfirmed()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ConfirmAuthorChoices

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})

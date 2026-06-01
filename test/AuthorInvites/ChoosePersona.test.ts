import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as _ from '../../src/AuthorInvites/ChoosePersona.ts'
import * as Events from '../../src/Events.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  reviewId: Uuid('4ecba4c3-f0f7-4631-8011-58e7a0a62e6a'),
  orcidId: OrcidId('0000-0002-1825-0097'),
  persona: 'public',
} satisfies _.Input

const inputWithDifferentReviewId = {
  ...input,
  reviewId: Uuid('17914f94-6e6c-4f9c-88eb-860522596169'),
} satisfies _.Input

const inputWithDifferentOrcidId = {
  ...input,
  orcidId: OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const inputWithDifferentPersona = {
  ...input,
  persona: 'pseudonym',
} satisfies _.Input

const invitationId = Uuid('aa39be59-6e33-4756-a4c9-109a152a6fc5')

const authorAdded = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.reviewId,
  invitationId,
  contactDetails: Option.none(),
})

const inviteAccepted = new Events.AuthorInviteAccepted({
  invitationId,
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  acceptedAt: Temporal.Now.instant(),
})

const personaChosen = new Events.PersonaForAReviewChosen({
  orcidId: input.orcidId,
  reviewId: input.reviewId,
  persona: input.persona,
})

const confirmed = new Events.AuthorChoicesForAReviewConfirmed({
  orcidId: input.orcidId,
  reviewId: input.reviewId,
  confirmedAt: Temporal.Now.instant(),
})

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.PersonaDoesNotNeedToBeChosen())],
  [
    'no matching review id',
    [authorAdded, inviteAccepted],
    inputWithDifferentReviewId,
    Either.left(new _.PersonaDoesNotNeedToBeChosen()),
  ],
  [
    'no matching ORCID iD',
    [authorAdded, inviteAccepted],
    inputWithDifferentOrcidId,
    Either.left(new _.PersonaDoesNotNeedToBeChosen()),
  ],
  [
    'invitation accepted',
    [authorAdded, inviteAccepted],
    input,
    Either.right(Option.some(new Events.PersonaForAReviewChosen(input))),
  ],
  ['invitation not accepted', [authorAdded], input, Either.left(new _.PersonaDoesNotNeedToBeChosen())],
  [
    'persona already chosen with same value',
    [authorAdded, inviteAccepted, personaChosen],
    input,
    Either.right(Option.none()),
  ],
  [
    'persona already chosen with different value',
    [authorAdded, inviteAccepted, personaChosen],
    inputWithDifferentPersona,
    Either.right(Option.some(new Events.PersonaForAReviewChosen(inputWithDifferentPersona))),
  ],
  [
    'choices confirmed',
    [authorAdded, inviteAccepted, personaChosen, confirmed],
    input,
    Either.left(new _.PersonaCannotBeChanged()),
  ],
  [
    'choices confirmed with a persona',
    [authorAdded, inviteAccepted, confirmed],
    input,
    Either.left(new _.PersonaCannotBeChanged()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ChoosePersona

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})

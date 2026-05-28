import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as _ from '../../src/AuthorInvites/AcceptInvite.ts'
import * as Events from '../../src/Events.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  invitationId: Uuid('4ecba4c3-f0f7-4631-8011-58e7a0a62e6a'),
  orcidId: OrcidId('0000-0002-1825-0097'),
  acceptedAt: Temporal.Now.instant(),
} satisfies _.Input

const inputWithDifferentInvitationId = {
  ...input,
  invitationId: Uuid('305d1af0-d946-4827-9610-e16d232b4066'),
} satisfies _.Input

const inputWithDifferentOrcidId = {
  ...input,
  orcidId: OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const datasetReviewId = Uuid('aa39be59-6e33-4756-a4c9-109a152a6fc5')

const authorAdded = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: input.invitationId,
  contactDetails: Option.none(),
})

const authorRemoved = new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId,
  invitationId: input.invitationId,
})

const inviteAccepted = new Events.AuthorInviteAccepted(input)

const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({ datasetReviewId })

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events', [], input, Either.left(new _.InvitationNotFound())],
  [
    'author added, publication requested',
    [authorAdded, publicationRequested],
    input,
    Either.right(Option.some(new Events.AuthorInviteAccepted(input))),
  ],
  [
    'author added, publication requested, different invitation ID',
    [authorAdded, publicationRequested],
    inputWithDifferentInvitationId,
    Either.left(new _.InvitationNotFound()),
  ],
  [
    'author added then removed, publication requested',
    [authorAdded, authorRemoved, publicationRequested],
    input,
    Either.left(new _.InvitationNotFound()),
  ],
  ['author added, publication not requested', [authorAdded], input, Either.left(new _.InvitationNotFound())],
  ['invite has been accepted', [authorAdded, publicationRequested, inviteAccepted], input, Either.right(Option.none())],
  [
    'invite has been accepted by a different PREreviewer',
    [authorAdded, publicationRequested, inviteAccepted],
    inputWithDifferentOrcidId,
    Either.left(new _.InvitationHasAlreadyBeenAcceptedByAnotherPrereviewer()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.AcceptInvite

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})

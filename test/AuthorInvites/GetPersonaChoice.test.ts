import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as _ from '../../src/AuthorInvites/GetPersonaChoice.ts'
import { DryadDatasetId } from '../../src/Datasets/index.ts'
import * as Events from '../../src/Events.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  reviewId: Uuid('2c4981b5-ec9e-4535-88eb-3623e30b8ab9'),
  orcidId: OrcidId('0000-0002-1825-0097'),
} satisfies _.Input

const inputDifferentReviewId = {
  ...input,
  reviewId: Uuid('ab10ab48-d3bf-4120-a517-49bdcb76d727'),
} satisfies _.Input

const inputDifferentOrcidId = {
  ...input,
  orcidId: OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const invitationId = Uuid('92361b42-ed3c-4b26-9315-dfd8bd4bdc36')

const started = new Events.DatasetReviewWasStarted({
  datasetReviewId: input.reviewId,
  authorId: input.orcidId,
  datasetId: new DryadDatasetId({ value: Doi('10.5061/dryad.12345') }),
})

const startedDifferentOrcidId = new Events.DatasetReviewWasStarted({
  datasetReviewId: input.reviewId,
  authorId: inputDifferentOrcidId.orcidId,
  datasetId: new DryadDatasetId({ value: Doi('10.5061/dryad.12345') }),
})

const added = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.reviewId,
  invitationId,
  contactDetails: Option.none(),
})

const accepted = new Events.AuthorInviteAccepted({
  invitationId,
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  acceptedAt: Temporal.Now.instant(),
})

const persona = new Events.PersonaForAReviewChosen({
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  persona: 'public',
})

const personaChanged = new Events.PersonaForAReviewChosen({
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  persona: 'pseudonym',
})

const confirmed = new Events.AuthorChoicesForAReviewConfirmed({
  reviewId: input.reviewId,
  orcidId: input.orcidId,
  confirmedAt: Temporal.Now.instant(),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], Either.left(new _.PrereviewerIsNotListedOnTheReview())],
  ['not accepted an invite', input, [added], Either.left(new _.PrereviewerIsNotListedOnTheReview())],
  ['accepted an invite', input, [added, accepted], Either.right(Option.none())],
  [
    'accepted an invite, different review ID',
    inputDifferentReviewId,
    [added, accepted],
    Either.left(new _.PrereviewerIsNotListedOnTheReview()),
  ],
  [
    'accepted an invite, different ORCID iD',
    inputDifferentOrcidId,
    [added, accepted],
    Either.left(new _.PrereviewerIsNotListedOnTheReview()),
  ],
  ['started the review', input, [started, added, accepted], Either.left(new _.PersonaCannotBeChanged())],
  [
    'different ORCID iD started the review',
    input,
    [startedDifferentOrcidId, added, accepted],
    Either.right(Option.none()),
  ],
  ['persona chosen', input, [added, accepted, persona], Either.right(Option.some(persona.persona))],
  [
    'persona changed',
    input,
    [added, accepted, persona, personaChanged],
    Either.right(Option.some(personaChanged.persona)),
  ],
  ['details confirmed', input, [added, accepted, persona, confirmed], Either.left(new _.PersonaCannotBeChanged())],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetPersonaChoice

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})

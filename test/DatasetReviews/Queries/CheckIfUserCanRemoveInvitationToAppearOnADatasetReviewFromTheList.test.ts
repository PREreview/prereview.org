import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi, EmailAddress, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

const input = {
  datasetReviewId: Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d'),
  invitationId: Uuid.Uuid('b1438430-3275-41fb-9356-9e1a9267a3a1'),
  authorId: OrcidId.OrcidId('0000-0002-1825-0097'),
} satisfies _.Input

const inputDifferentDatasetReviewId = {
  ...input,
  datasetReviewId: Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931'),
} satisfies _.Input

const inputDifferentInvitationId = {
  ...input,
  invitationId: Uuid.Uuid('a41ccf5e-520c-47e6-85a3-bc83f1d8dc2a'),
} satisfies _.Input

const inputDifferentAuthorId = {
  ...input,
  authorId: OrcidId.OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const now = Temporal.Now.instant()

const started = new Events.DatasetReviewWasStarted({
  authorId: input.authorId,
  datasetId: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
  datasetReviewId: input.datasetReviewId,
})
const answeredYes = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'yes',
  datasetReviewId: input.datasetReviewId,
})
const answeredNo = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  answer: 'no',
  datasetReviewId: input.datasetReviewId,
})
const invited = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: input.invitationId,
  contactDetails: Option.some({
    name: NonEmptyString.NonEmptyString('Josiah Carberry'),
    emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
  }),
})
const invitedNoContactDetails = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: input.invitationId,
  contactDetails: Option.none(),
})
const removed = new DatasetReviews.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: input.invitationId,
})
const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId: input.datasetReviewId,
})
const published = new Events.DatasetReviewWasPublished({
  datasetReviewId: input.datasetReviewId,
  publicationDate: now.toZonedDateTimeISO('UTC').toPlainDate(),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted())],
  ['not answered', input, [started], Either.left(new DatasetReviews.DatasetReviewDoesNotNeedInvitationsToAppear())],
  [
    'different dataset review ID',
    inputDifferentDatasetReviewId,
    [started],
    Either.left(new DatasetReviews.DatasetReviewHasNotBeenStarted()),
  ],
  [
    'different author ID',
    inputDifferentAuthorId,
    [started],
    Either.left(new DatasetReviews.DatasetReviewWasStartedByAnotherUser()),
  ],
  [
    'answered no',
    input,
    [started, answeredNo],
    Either.left(new DatasetReviews.DatasetReviewDoesNotNeedInvitationsToAppear()),
  ],
  [
    'answered yes, not added',
    input,
    [started, answeredYes],
    Either.left(new DatasetReviews.DatasetReviewInvitationNotInList()),
  ],
  ['answered yes, added', input, [started, answeredYes, invited], Either.void],
  [
    'different invitation ID, answered yes, added',
    inputDifferentInvitationId,
    [started, answeredYes, invited],
    Either.left(new DatasetReviews.DatasetReviewInvitationNotInList()),
  ],
  [
    'answered yes, added with no contact details',
    input,
    [started, answeredYes, invitedNoContactDetails],
    Either.left(new DatasetReviews.DatasetReviewInvitationNotInList()),
  ],
  [
    'answered yes, added and removed',
    input,
    [started, answeredYes, invited, removed],
    Either.left(new DatasetReviews.DatasetReviewInvitationNotInList()),
  ],
  [
    'publication requested',
    input,
    [started, answeredYes, publicationRequested],
    Either.left(new DatasetReviews.DatasetReviewIsBeingPublished()),
  ],
  [
    'published',
    input,
    [started, answeredYes, publicationRequested, published],
    Either.left(new DatasetReviews.DatasetReviewHasBeenPublished()),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})

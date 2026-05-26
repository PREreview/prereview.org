import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Commands from '../../../src/Commands.ts'
import * as _ from '../../../src/DatasetReviews/Commands/AddInvitationToAppearToTheList.ts'
import * as Errors from '../../../src/DatasetReviews/Errors.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const input = {
  name: NonEmptyString('Josiah Carberry'),
  emailAddress: EmailAddress('jcarberry@example.com'),
  invitationId: Uuid('000b3291-ee40-4d00-b43f-844d26831f7c'),
  datasetReviewId: Uuid('5871bddf-a2ff-4dd8-9e63-c42b4a6df684'),
  userId: OrcidId('0000-0002-1825-0097'),
} satisfies _.Input

const inputDifferentName = {
  ...input,
  name: NonEmptyString('Not Josiah Carberry'),
} satisfies _.Input

const inputDifferentEmailAddress = {
  ...input,
  invitationId: Uuid('432fcb89-f5e6-4ea1-a366-19917be054c7'),
  emailAddress: EmailAddress('notjcarberry@example.com'),
} satisfies _.Input

const inputDifferentEmailAddressCase = {
  ...input,
  invitationId: Uuid('432fcb89-f5e6-4ea1-a366-19917be054c7'),
  emailAddress: EmailAddress('JCarberry@example.com'),
} satisfies _.Input

const inputDifferentInvitationId = {
  ...input,
  invitationId: Uuid('432fcb89-f5e6-4ea1-a366-19917be054c7'),
} satisfies _.Input

const inputDifferentDatasetReviewId = {
  ...input,
  datasetReviewId: Uuid('2f1254b2-1aea-4220-9a21-e119c9e7005e'),
} satisfies _.Input

const inputDifferentUserId = {
  ...input,
  userId: OrcidId('0000-0002-6109-0367'),
} satisfies _.Input

const started = new Events.DatasetReviewWasStarted({
  authorId: input.userId,
  datasetId: new Datasets.DryadDatasetId({ value: Doi('10.5061/dryad.wstqjq2n3') }),
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

const addedToList = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: input.invitationId,
  contactDetails: Option.some({ name: input.name, emailAddress: input.emailAddress }),
})

const removedFromList = new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: input.invitationId,
})

const publicationRequested = new Events.PublicationOfDatasetReviewWasRequested({
  datasetReviewId: input.datasetReviewId,
})

const published = new Events.DatasetReviewWasPublished({
  publicationDate: Temporal.Now.plainDateISO(),
  datasetReviewId: input.datasetReviewId,
})

test.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Either.Either<Option.Option<Events.Event>, _.Error | Commands.UnableToHandleCommand>,
  ]
>([
  ['no events', [], input, Either.left(new Errors.DatasetReviewHasNotBeenStarted())],
  ['not answered', [started], input, Either.left(new Errors.DatasetReviewDoesNotNeedInvitationsToAppear())],
  ['answered no', [started, answeredNo], input, Either.left(new Errors.DatasetReviewDoesNotNeedInvitationsToAppear())],
  [
    'answered yes',
    [started, answeredYes],
    input,
    Either.right(
      Option.some(
        new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
          datasetReviewId: input.datasetReviewId,
          invitationId: input.invitationId,
          contactDetails: Option.some({ name: input.name, emailAddress: input.emailAddress }),
        }),
      ),
    ),
  ],
  ['answered yes, already added', [started, answeredYes, addedToList], input, Either.right(Option.none())],
  [
    'answered yes, already added with different name',
    [started, answeredYes, addedToList],
    inputDifferentName,
    Either.right(Option.none()),
  ],
  [
    'answered yes, already added with different email address',
    [started, answeredYes, addedToList],
    inputDifferentEmailAddress,
    Either.right(
      Option.some(
        new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
          datasetReviewId: inputDifferentEmailAddress.datasetReviewId,
          invitationId: inputDifferentEmailAddress.invitationId,
          contactDetails: Option.some({
            name: inputDifferentEmailAddress.name,
            emailAddress: inputDifferentEmailAddress.emailAddress,
          }),
        }),
      ),
    ),
  ],
  [
    'answered yes, already added with different email address casing',
    [started, answeredYes, addedToList],
    inputDifferentEmailAddressCase,
    Either.right(Option.none()),
  ],
  [
    'answered yes, already added with different invitation ID',
    [started, answeredYes, addedToList],
    inputDifferentInvitationId,
    Either.right(Option.none()),
  ],
  [
    'answered yes, already added and removed with same invitation ID',
    [started, answeredYes, addedToList, removedFromList],
    input,
    Either.right(Option.none()),
  ],
  [
    'answered yes, already added and removed with different invitation ID',
    [started, answeredYes, addedToList, removedFromList],
    inputDifferentInvitationId,
    Either.right(
      Option.some(
        new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
          datasetReviewId: inputDifferentInvitationId.datasetReviewId,
          invitationId: inputDifferentInvitationId.invitationId,
          contactDetails: Option.some({
            name: inputDifferentInvitationId.name,
            emailAddress: inputDifferentInvitationId.emailAddress,
          }),
        }),
      ),
    ),
  ],
  [
    'different dataset review ID',
    [started],
    inputDifferentDatasetReviewId,
    Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
  ],
  [
    'different user ID',
    [started],
    inputDifferentUserId,
    Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' })),
  ],
  [
    'publication requested',
    [started, answeredYes, publicationRequested],
    input,
    Either.left(new Errors.DatasetReviewIsBeingPublished()),
  ],
  [
    'published',
    [started, answeredYes, publicationRequested, published],
    input,
    Either.left(new Errors.DatasetReviewHasBeenPublished()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, authorize, decide } = _.AddInvitationToAppearToTheList

  const state = foldState(events, input)

  const actual = authorize(state, input)
    ? decide(state, input)
    : Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' }))

  expect(actual).toStrictEqual(expected)
})

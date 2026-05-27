import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Either, Option } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/GetListOfInvitationsToAppearOnADatasetReview.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi, EmailAddress, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

const input = {
  datasetReviewId: Uuid.Uuid('73b481b8-f33f-43f2-a29e-5be10401c09d'),
} satisfies _.Input

const inputDifferentDatasetReviewId = {
  ...input,
  datasetReviewId: Uuid.Uuid('f7b3a56e-d320-484c-8452-83a609357931'),
} satisfies _.Input

const started = new Events.DatasetReviewWasStarted({
  authorId: OrcidId.OrcidId('0000-0002-1825-0097'),
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
const invited1 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: Uuid.Uuid('c4342f49-62f7-496f-9ce9-2c18e32a5cef'),
  contactDetails: Option.some({
    name: NonEmptyString.NonEmptyString('Josiah Carberry'),
    emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
  }),
})
const invited2 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: Uuid.Uuid('e9aaf38b-2d3b-4703-a16a-6c1408762ab7'),
  contactDetails: Option.some({
    name: NonEmptyString.NonEmptyString('Arne Saknussemm'),
    emailAddress: EmailAddress.EmailAddress('asaknussemm@example.com'),
  }),
})
const invited3 = new DatasetReviews.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: Uuid.Uuid('bf962433-30c0-415f-ae8f-faeca117b9e1'),
  contactDetails: Option.none(),
})
const removed = new DatasetReviews.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId: input.datasetReviewId,
  invitationId: Uuid.Uuid('c4342f49-62f7-496f-9ce9-2c18e32a5cef'),
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
    'answered no',
    input,
    [started, answeredNo],
    Either.left(new DatasetReviews.DatasetReviewDoesNotNeedInvitationsToAppear()),
  ],
  ['answered yes', input, [started, answeredYes], Either.right([])],
  [
    'answered yes, one invite',
    input,
    [started, answeredYes, invited1],
    Either.right([
      {
        invitationId: invited1.invitationId,
        name: Option.getOrThrow(invited1.contactDetails).name,
        emailAddress: Option.getOrThrow(invited1.contactDetails).emailAddress,
      },
    ]),
  ],
  [
    'answered yes, multiple invites',
    input,
    [started, answeredYes, invited1, invited2, invited3],
    Either.right([
      {
        invitationId: invited1.invitationId,
        name: Option.getOrThrow(invited1.contactDetails).name,
        emailAddress: Option.getOrThrow(invited1.contactDetails).emailAddress,
      },
      {
        invitationId: invited2.invitationId,
        name: Option.getOrThrow(invited2.contactDetails).name,
        emailAddress: Option.getOrThrow(invited2.contactDetails).emailAddress,
      },
    ]),
  ],
  ['answered yes, one invite removed', input, [started, answeredYes, invited1, removed], Either.right([])],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetListOfInvitationsToAppearOnADatasetReview

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})

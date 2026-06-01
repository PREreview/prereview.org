import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Either, Option } from 'effect'
import * as _ from '../../src/AuthorInvites/GetReviewIdForInvitation.ts'
import * as Events from '../../src/Events.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input: _.Input = Uuid('2c4981b5-ec9e-4535-88eb-3623e30b8ab9')

const inputDifferentInvitationId: _.Input = Uuid('61cdf2dc-5ec2-403c-8a92-5e1c89c1d5e3')

const reviewId = Uuid('38655da9-3efb-43b7-9795-dcd6f69088e7')

const added = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId: reviewId,
  invitationId: input,
  contactDetails: Option.none(),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], Either.left(new _.InvitationNotFound())],
  ['added', input, [added], Either.right(reviewId)],
  ['added, different invitation ID', inputDifferentInvitationId, [added], Either.left(new _.InvitationNotFound())],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetReviewIdForInvitation

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})

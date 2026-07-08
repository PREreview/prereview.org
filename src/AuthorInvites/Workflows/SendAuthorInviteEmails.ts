import { Effect, Schema, Struct } from 'effect'
import { DatasetReviewQueries } from '../../DatasetReviews/index.ts'
import { Datasets } from '../../Datasets/index.ts'
import { Email } from '../../ExternalInteractions/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import { Temporal } from '../../types/index.ts'
import type { Uuid } from '../../types/Uuid.ts'
import { AuthorInvites } from '../AuthorInvites.ts'

export class FailedToSendAuthorInviteEmails extends Schema.TaggedError<FailedToSendAuthorInviteEmails>()(
  'FailedToInviteAuthors',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export const SendAuthorInviteEmails = Effect.fn(
  function* (reviewId: Uuid) {
    const authorInvites = yield* AuthorInvites
    const datasetReviewQueries = yield* DatasetReviewQueries
    const datasets = yield* Datasets
    const email = yield* Email.Email

    const review = yield* datasetReviewQueries.getPublishedReview(reviewId)

    const { author, dataset, invitations } = yield* Effect.all(
      {
        author: Prereviewers.getPersona(review.author),
        dataset: datasets.getDataset(review.dataset),
        invitations: datasetReviewQueries.getListOfInvitationsToAppearOnADatasetReview({ datasetReviewId: review.id }),
      },
      { concurrency: 'inherit' },
    )

    yield* Effect.forEach(
      invitations,
      Effect.fnUntraced(function* (invitation) {
        if (yield* authorInvites.hasAnEmailToInviteAuthorBeenSent(invitation.invitationId)) {
          return
        }

        yield* email.inviteAuthorToReview({
          invitationId: invitation.invitationId,
          inviter: Prereviewers.matchPersona(author, {
            onPublic: Struct.get('name'),
            onPseudonym: Struct.get('pseudonym'),
          }),
          invitee: { name: invitation.name, emailAddress: invitation.emailAddress },
          subject: { language: dataset.title.language, title: dataset.title.text },
        })

        yield* authorInvites.recordEmailSentToInviteAuthor({
          invitationId: invitation.invitationId,
          sentAt: yield* Temporal.currentInstant,
        })
      }, Effect.uninterruptible),
      { concurrency: 'inherit', discard: true },
    )
  },
  Effect.tapError(error =>
    Effect.logError('Failed to send author invite emails for review').pipe(Effect.annotateLogs({ error })),
  ),
  Effect.catchAll(error => new FailedToSendAuthorInviteEmails({ cause: error })),
)

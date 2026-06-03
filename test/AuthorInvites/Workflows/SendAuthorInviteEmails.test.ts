import { describe, expect, it, vi } from '@effect/vitest'
import { Array, Effect, Either, Layer, pipe } from 'effect'
import * as AuthorInvites from '../../../src/AuthorInvites/index.ts'
import * as _ from '../../../src/AuthorInvites/Workflows/SendAuthorInviteEmails.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Email } from '../../../src/ExternalInteractions/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as fc from '../../fc.ts'

describe('SendAuthorInviteEmails', () => {
  describe('when the review can be loaded', () => {
    describe('when there are authors needing to be invited', () => {
      it.effect.prop(
        'sends an email',
        [
          fc.uuid(),
          fc.publishedDatasetReview(),
          fc.dataset(),
          fc.publicPersona(),
          fc.pseudonymPersona(),
          fc.nonEmptyArray(
            fc.record({
              invitationId: fc.uuid(),
              name: fc.nonEmptyString(),
              emailAddress: fc.emailAddress(),
            }),
          ),
        ],
        ([reviewId, review, dataset, publicPersona, pseudonymPersona, invitations]) =>
          Effect.gen(function* () {
            const inviteAuthorToReview = vi.fn<(typeof Email.Email.Service)['inviteAuthorToReview']>(_ => Effect.void)
            const hasAnEmailToInviteAuthorBeenSent = vi.fn<
              (typeof AuthorInvites.AuthorInvites.Service)['hasAnEmailToInviteAuthorBeenSent']
            >(() => Effect.succeed(false))
            const recordEmailSentToInviteAuthor = vi.fn<
              (typeof AuthorInvites.AuthorInvites.Service)['recordEmailSentToInviteAuthor']
            >(_ => Effect.void)

            const actual = yield* pipe(
              _.SendAuthorInviteEmails(reviewId),
              Effect.provide([
                Layer.mock(Email.Email, { inviteAuthorToReview }),
                Layer.mock(AuthorInvites.AuthorInvites, {
                  hasAnEmailToInviteAuthorBeenSent,
                  recordEmailSentToInviteAuthor,
                }),
              ]),
              Effect.either,
            )

            expect(actual).toStrictEqual(Either.void)
            expect(inviteAuthorToReview).toHaveBeenCalledTimes(Array.length(invitations))
            expect(recordEmailSentToInviteAuthor).toHaveBeenCalledTimes(Array.length(invitations))
          }).pipe(
            Effect.provide([
              Layer.mock(AuthorInvites.AuthorInvites, {}),
              Layer.mock(DatasetReviews.DatasetReviewQueries, {
                getPublishedReview: () => Effect.succeed(review),
                getListOfInvitationsToAppearOnADatasetReview: () => Effect.succeed(invitations),
              }),
              Layer.mock(Datasets.Datasets, { getDataset: () => Effect.succeed(dataset) }),
              Layer.mock(Email.Email, {}),
              Layer.mock(Personas.Personas, {
                getPublicPersona: () => Effect.succeed(publicPersona),
                getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
              }),
            ]),
          ),
      )
    })

    it.effect.prop(
      'when there are no more invitations to send',
      [
        fc.uuid(),
        fc.publishedDatasetReview(),
        fc.dataset(),
        fc.publicPersona(),
        fc.pseudonymPersona(),
        fc.nonEmptyArray(
          fc.record({
            invitationId: fc.uuid(),
            name: fc.nonEmptyString(),
            emailAddress: fc.emailAddress(),
          }),
        ),
      ],
      ([reviewId, review, dataset, publicPersona, pseudonymPersona, invitations]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.SendAuthorInviteEmails(reviewId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide([
            Layer.mock(AuthorInvites.AuthorInvites, {
              hasAnEmailToInviteAuthorBeenSent: () => Effect.succeed(true),
            }),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(review),
              getListOfInvitationsToAppearOnADatasetReview: () => Effect.succeed(invitations),
            }),
            Layer.mock(Datasets.Datasets, { getDataset: () => Effect.succeed(dataset) }),
            Layer.mock(Email.Email, {}),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
          ]),
        ),
    )

    it.effect.prop(
      'when there are no invitations',
      [fc.uuid(), fc.publishedDatasetReview(), fc.dataset(), fc.publicPersona(), fc.pseudonymPersona()],
      ([reviewId, review, dataset, publicPersona, pseudonymPersona]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.SendAuthorInviteEmails(reviewId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide([
            Layer.mock(AuthorInvites.AuthorInvites, {}),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getPublishedReview: () => Effect.succeed(review),
              getListOfInvitationsToAppearOnADatasetReview: () => Effect.succeed([]),
            }),
            Layer.mock(Datasets.Datasets, { getDataset: () => Effect.succeed(dataset) }),
            Layer.mock(Email.Email, {}),
            Layer.mock(Personas.Personas, {
              getPublicPersona: () => Effect.succeed(publicPersona),
              getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
            }),
          ]),
        ),
    )
  })

  it.effect.prop(
    "when the review can't be loaded",
    [
      fc.uuid(),
      fc
        .anything()
        .chain(cause =>
          fc.constantFrom(
            new DatasetReviews.UnknownDatasetReview({ cause }),
            new DatasetReviews.DatasetReviewHasNotBeenPublished({ cause }),
            new Queries.UnableToQuery({ cause }),
          ),
        ),
    ],
    ([reviewId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.SendAuthorInviteEmails(reviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new _.FailedToSendAuthorInviteEmails({ cause: error })))
      }).pipe(
        Effect.provide([
          Layer.mock(AuthorInvites.AuthorInvites, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getPublishedReview: () => error }),
          Layer.mock(Datasets.Datasets, {}),
          Layer.mock(Email.Email, {}),
          Layer.mock(Personas.Personas, {}),
        ]),
      ),
  )
})

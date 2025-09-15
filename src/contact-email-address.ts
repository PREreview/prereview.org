import { Context, Data, type Effect, flow, Match, pipe, type Predicate } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import type { Locale } from './Context.js'
import type { IndeterminatePreprintId } from './Preprints/index.js'
import { type EmailAddress, EmailAddressC } from './types/EmailAddress.js'
import { UuidC } from './types/uuid.js'
import type { User } from './user.js'

export class ContactEmailAddressIsNotFound extends Data.TaggedError('ContactEmailAddressIsNotFound') {}

export class ContactEmailAddressIsUnavailable extends Data.TaggedError('ContactEmailAddressIsUnavailable') {}

export class GetContactEmailAddress extends Context.Tag('GetContactEmailAddress')<
  GetContactEmailAddress,
  (orcid: Orcid) => Effect.Effect<ContactEmailAddress, ContactEmailAddressIsNotFound | ContactEmailAddressIsUnavailable>
>() {}

export class SaveContactEmailAddress extends Context.Tag('SaveContactEmailAddress')<
  SaveContactEmailAddress,
  (orcid: Orcid, ContactEmailAddress: ContactEmailAddress) => Effect.Effect<void, ContactEmailAddressIsUnavailable>
>() {}

export type ContactEmailAddress = VerifiedContactEmailAddress | UnverifiedContactEmailAddress

export class VerifiedContactEmailAddress extends Data.TaggedClass('VerifiedContactEmailAddress')<{
  value: EmailAddress
}> {}

export class UnverifiedContactEmailAddress extends Data.TaggedClass('UnverifiedContactEmailAddress')<{
  value: EmailAddress
  verificationToken: Uuid
}> {}

export interface GetContactEmailAddressEnv {
  getContactEmailAddress: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', ContactEmailAddress>
}

export interface SaveContactEmailAddressEnv {
  saveContactEmailAddress: (
    orcid: Orcid,
    ContactEmailAddress: ContactEmailAddress,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressEnv {
  verifyContactEmailAddress: (
    user: User,
    emailAddress: UnverifiedContactEmailAddress,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressForReviewEnv {
  verifyContactEmailAddressForReview: (
    user: User,
    emailAddress: UnverifiedContactEmailAddress,
    preprint: IndeterminatePreprintId,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressForInvitedAuthorEnv {
  verifyContactEmailAddressForInvitedAuthor: (verify: {
    user: User
    emailAddress: UnverifiedContactEmailAddress
    authorInvite: Uuid
  }) => TE.TaskEither<'unavailable', void>
}

export class VerifyContactEmailAddressForComment extends Context.Tag('VerifyContactEmailAddressForComment')<
  VerifyContactEmailAddressForComment,
  (
    user: User,
    emailAddress: UnverifiedContactEmailAddress,
    comment: Uuid,
  ) => Effect.Effect<void, ContactEmailAddressIsUnavailable, Locale>
>() {}

export const ContactEmailAddressC = pipe(
  C.sum('type')({
    verified: pipe(
      C.struct({
        type: C.literal('verified'),
        value: EmailAddressC,
      }),
    ),
    unverified: pipe(
      C.struct({
        type: C.literal('unverified'),
        value: EmailAddressC,
        verificationToken: UuidC,
      }),
    ),
  }),
  C.imap(
    flow(
      Match.value,
      Match.when({ type: 'verified' }, ({ value }) => new VerifiedContactEmailAddress({ value })),
      Match.when(
        { type: 'unverified' },
        ({ value, verificationToken }) => new UnverifiedContactEmailAddress({ value, verificationToken }),
      ),
      Match.exhaustive,
    ),
    flow(
      Match.value,
      Match.tag('VerifiedContactEmailAddress', ({ value }) => ({ type: 'verified' as const, value })),
      Match.tag('UnverifiedContactEmailAddress', ({ value, verificationToken }) => ({
        type: 'unverified' as const,
        value,
        verificationToken,
      })),
      Match.exhaustive,
    ),
  ),
) satisfies C.Codec<unknown, unknown, ContactEmailAddress>

export const getContactEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getContactEmailAddress }: GetContactEmailAddressEnv) => getContactEmailAddress(orcid)),
  )

export const maybeGetContactEmailAddress = flow(
  getContactEmailAddress,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

export const saveContactEmailAddress = (
  orcid: Orcid,
  emailAddress: ContactEmailAddress,
): RTE.ReaderTaskEither<SaveContactEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveContactEmailAddress }) => saveContactEmailAddress(orcid, emailAddress)),
  )

export const verifyContactEmailAddress = (
  user: User,
  emailAddress: UnverifiedContactEmailAddress,
): RTE.ReaderTaskEither<VerifyContactEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddress }) => verifyContactEmailAddress(user, emailAddress)),
  )

export const verifyContactEmailAddressForReview = (
  user: User,
  emailAddress: UnverifiedContactEmailAddress,
  preprint: IndeterminatePreprintId,
): RTE.ReaderTaskEither<VerifyContactEmailAddressForReviewEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddressForReview }) =>
      verifyContactEmailAddressForReview(user, emailAddress, preprint),
    ),
  )

export const verifyContactEmailAddressForInvitedAuthor = (verify: {
  user: User
  emailAddress: UnverifiedContactEmailAddress
  authorInvite: Uuid
}): RTE.ReaderTaskEither<VerifyContactEmailAddressForInvitedAuthorEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddressForInvitedAuthor }) =>
      verifyContactEmailAddressForInvitedAuthor(verify),
    ),
  )

export const isUnverified: Predicate.Refinement<ContactEmailAddress, UnverifiedContactEmailAddress> = (
  emailAddress: ContactEmailAddress,
): emailAddress is UnverifiedContactEmailAddress => emailAddress._tag === 'UnverifiedContactEmailAddress'

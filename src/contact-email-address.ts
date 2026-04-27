import { Context, Data, type Effect, flow, Match, pipe, type Predicate } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import type { Locale } from './Context.ts'
import type { IndeterminatePreprintId } from './Preprints/index.ts'
import { type EmailAddress, EmailAddressC } from './types/EmailAddress.ts'
import type { NonEmptyString } from './types/NonEmptyString.ts'
import type { OrcidId } from './types/OrcidId.ts'
import { type Uuid, UuidC } from './types/uuid.ts'

export class ContactEmailAddressIsNotFound extends Data.TaggedError('ContactEmailAddressIsNotFound') {}

export class ContactEmailAddressIsUnavailable extends Data.TaggedError('ContactEmailAddressIsUnavailable')<{
  cause?: unknown
}> {}

export class GetContactEmailAddress extends Context.Tag('GetContactEmailAddress')<
  GetContactEmailAddress,
  (
    orcid: OrcidId,
  ) => Effect.Effect<ContactEmailAddress, ContactEmailAddressIsNotFound | ContactEmailAddressIsUnavailable>
>() {}

export class SaveContactEmailAddress extends Context.Tag('SaveContactEmailAddress')<
  SaveContactEmailAddress,
  (orcid: OrcidId, ContactEmailAddress: ContactEmailAddress) => Effect.Effect<void, ContactEmailAddressIsUnavailable>
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
  getContactEmailAddress: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', ContactEmailAddress>
}

export interface SaveContactEmailAddressEnv {
  saveContactEmailAddress: (
    orcid: OrcidId,
    ContactEmailAddress: ContactEmailAddress,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressEnv {
  verifyContactEmailAddress: (
    name: NonEmptyString,
    emailAddress: UnverifiedContactEmailAddress,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressForReviewEnv {
  verifyContactEmailAddressForReview: (
    name: NonEmptyString,
    emailAddress: UnverifiedContactEmailAddress,
    preprint: IndeterminatePreprintId,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressForInvitedAuthorEnv {
  verifyContactEmailAddressForInvitedAuthor: (verify: {
    name: NonEmptyString
    emailAddress: UnverifiedContactEmailAddress
    authorInvite: Uuid
  }) => TE.TaskEither<'unavailable', void>
}

export class VerifyContactEmailAddressForComment extends Context.Tag('VerifyContactEmailAddressForComment')<
  VerifyContactEmailAddressForComment,
  (
    name: NonEmptyString,
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

export const getContactEmailAddress = (orcid: OrcidId) =>
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
  orcid: OrcidId,
  emailAddress: ContactEmailAddress,
): RTE.ReaderTaskEither<SaveContactEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveContactEmailAddress }) => saveContactEmailAddress(orcid, emailAddress)),
  )

export const verifyContactEmailAddress = (
  name: NonEmptyString,
  emailAddress: UnverifiedContactEmailAddress,
): RTE.ReaderTaskEither<VerifyContactEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddress }) => verifyContactEmailAddress(name, emailAddress)),
  )

export const verifyContactEmailAddressForReview = (
  name: NonEmptyString,
  emailAddress: UnverifiedContactEmailAddress,
  preprint: IndeterminatePreprintId,
): RTE.ReaderTaskEither<VerifyContactEmailAddressForReviewEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddressForReview }) =>
      verifyContactEmailAddressForReview(name, emailAddress, preprint),
    ),
  )

export const verifyContactEmailAddressForInvitedAuthor = (verify: {
  name: NonEmptyString
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

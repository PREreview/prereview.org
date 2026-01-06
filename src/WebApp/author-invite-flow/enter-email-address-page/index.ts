import { Match, Option, Struct, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type AssignedAuthorInvite, type GetAuthorInviteEnv, getAuthorInvite } from '../../../author-invite.ts'
import {
  type ContactEmailAddress,
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
  type VerifyContactEmailAddressForInvitedAuthorEnv,
  maybeGetContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddressForInvitedAuthor,
} from '../../../contact-email-address.ts'
import { getInput, invalidE, missingE } from '../../../form.ts'
import type { Html } from '../../../html.ts'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../../../http-error.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import {
  LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../../Response/index.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
  authorInvitePublishedMatch,
} from '../../../routes.ts'
import { EmailAddressC } from '../../../types/EmailAddress.ts'
import { type GenerateUuidEnv, generateUuidIO } from '../../../types/uuid.ts'
import type { User } from '../../../user.ts'
import { enterEmailAddressForm } from './enter-email-address-form.ts'

export interface Prereview {
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInviteEnterEmailAddress = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: Uuid
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  GenerateUuidEnv &
    GetContactEmailAddressEnv &
    GetPrereviewEnv &
    GetAuthorInviteEnv &
    SaveContactEmailAddressEnv &
    VerifyContactEmailAddressForInvitedAuthorEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
    RTE.let('inviteId', () => id),
    RTE.bindW('invite', ({ user }) =>
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: 'open' }, () => RTE.left('not-assigned' as const))
            .with({ status: 'declined' }, () => RTE.left('declined' as const))
            .with({ orcid: P.not(user.orcid) }, () => RTE.left('wrong-user' as const))
            .with({ status: 'completed' }, () => RTE.left('already-completed' as const))
            .with({ status: 'assigned' }, RTE.of)
            .exhaustive(),
        ),
      ),
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.bindW('contactEmailAddress', ({ user }) => maybeGetContactEmailAddress(user.orcid)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('already-completed', () =>
              RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
            )
            .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
            .with('no-session', () => LogInResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-found', () => pageNotFound(locale))
            .with('unavailable', () => havingProblemsPage(locale))
            .with('wrong-user', () => noPermissionPage(locale))
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ contactEmailAddress: { _tag: 'VerifiedContactEmailAddress' } }, () =>
            RT.of(RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id }) })),
          )
          .with({ method: 'POST' }, handleEnterEmailAddressForm)
          .with(
            { contactEmailAddress: { _tag: 'UnverifiedContactEmailAddress' } },
            ({ contactEmailAddress, invite, locale }) =>
              RT.of(
                enterEmailAddressForm({
                  form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.right(contactEmailAddress.value) },
                  inviteId: id,
                  invitedEmailAddress: invite.emailAddress,
                  locale,
                }),
              ),
          )
          .with({ contactEmailAddress: undefined }, ({ invite, locale }) =>
            RT.of(
              enterEmailAddressForm({
                form: { useInvitedAddress: E.right(undefined), otherEmailAddress: E.right(undefined) },
                inviteId: id,
                invitedEmailAddress: invite.emailAddress,
                locale,
              }),
            ),
          )
          .exhaustive(),
    ),
  )

const handleEnterEmailAddressForm = ({
  body,
  invite,
  inviteId,
  user,
  locale,
}: {
  body: unknown
  invite: AssignedAuthorInvite
  inviteId: Uuid
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RTE.Do,
    RTE.let('useInvitedAddress', () => pipe(UseInvitedAddressFieldD.decode(body), E.mapLeft(missingE))),
    RTE.let('otherEmailAddress', ({ useInvitedAddress }) =>
      match(useInvitedAddress)
        .with({ right: 'no' }, () =>
          pipe(
            OtherEmailAddressFieldD.decode(body),
            E.mapLeft(error =>
              match(getInput('otherEmailAddress')(error))
                .with(P.union(P.when(Option.isNone), { value: '' }), () => missingE())
                .with({ value: P.select() }, invalidE)
                .exhaustive(),
            ),
          ),
        )
        .with({ right: 'yes' }, { left: { _tag: 'MissingE' } }, () => E.right(undefined))
        .exhaustive(),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('useInvitedAddress', fields.useInvitedAddress),
        E.apS('otherEmailAddress', fields.otherEmailAddress),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.chainReaderIOK(fields =>
      match(fields)
        .returnType<RIO.ReaderIO<GenerateUuidEnv, ContactEmailAddress>>()
        .with({ useInvitedAddress: 'yes' }, () =>
          RIO.of(new VerifiedContactEmailAddress({ value: invite.emailAddress })),
        )
        .with({ useInvitedAddress: 'no', otherEmailAddress: P.select(P.string) }, emailAddress =>
          pipe(
            generateUuidIO,
            RIO.map(verificationToken => new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken })),
          ),
        )
        .run(),
    ),
    RTE.chainFirstW(contactEmailAddress => saveContactEmailAddress(user.orcid, contactEmailAddress)),
    RTE.chainFirstW(
      Match.valueTags({
        VerifiedContactEmailAddress: () => RTE.of(undefined),
        UnverifiedContactEmailAddress: contactEmailAddress =>
          verifyContactEmailAddressForInvitedAuthor({
            user,
            emailAddress: contactEmailAddress,
            authorInvite: inviteId,
          }),
      }),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage(locale))
          .with({ useInvitedAddress: P.any }, form =>
            enterEmailAddressForm({
              form,
              inviteId,
              invitedEmailAddress: invite.emailAddress,
              locale,
            }),
          )
          .exhaustive(),
      Match.valueTags({
        VerifiedContactEmailAddress: () =>
          RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id: inviteId }) }),
        UnverifiedContactEmailAddress: () =>
          RedirectResponse({
            location: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
          }),
      }),
    ),
  )

const UseInvitedAddressFieldD = pipe(
  D.struct({
    useInvitedAddress: D.literal('yes', 'no'),
  }),
  D.map(Struct.get('useInvitedAddress')),
)

const OtherEmailAddressFieldD = pipe(
  D.struct({
    otherEmailAddress: EmailAddressC,
  }),
  D.map(Struct.get('otherEmailAddress')),
)

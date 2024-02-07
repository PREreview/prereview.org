import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RIO from 'fp-ts/ReaderIO'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import type { LanguageCode } from 'iso-639-1'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type AssignedAuthorInvite, type GetAuthorInviteEnv, getAuthorInvite } from '../../author-invite'
import {
  type ContactEmailAddress,
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
  type VerifyContactEmailAddressForInvitedAuthorEnv,
  maybeGetContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddressForInvitedAuthor,
} from '../../contact-email-address'
import { getInput, invalidE, missingE } from '../../form'
import type { Html } from '../../html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import {
  authorInviteCheckMatch,
  authorInviteMatch,
  authorInviteNeedToVerifyEmailAddressMatch,
  authorInvitePublishedMatch,
} from '../../routes'
import { EmailAddressC } from '../../types/email-address'
import { type GenerateUuidEnv, generateUuid } from '../../types/uuid'
import type { User } from '../../user'
import { enterEmailAddressForm } from './enter-email-address-form'

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
  method,
  user,
}: {
  body: unknown
  id: Uuid
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
    RTE.let('inviteId', () => id),
    RTE.bindW('invite', ({ user }) =>
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: 'open' }, () => RTE.left('not-assigned' as const))
            .with({ status: 'declined' }, () => RTE.left('not-found' as const))
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
            .with('no-session', () => LogInResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .with('wrong-user', () => noPermissionPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ contactEmailAddress: { type: 'verified' } }, () =>
            RT.of(RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id }) })),
          )
          .with({ method: 'POST' }, handleEnterEmailAddressForm)
          .with({ contactEmailAddress: { type: 'unverified' } }, ({ contactEmailAddress, invite }) =>
            RT.of(
              enterEmailAddressForm({
                form: { useInvitedAddress: E.right('no'), otherEmailAddress: E.right(contactEmailAddress.value) },
                inviteId: id,
                invitedEmailAddress: invite.emailAddress,
              }),
            ),
          )
          .with({ contactEmailAddress: undefined }, ({ invite }) =>
            RT.of(
              enterEmailAddressForm({
                form: { useInvitedAddress: E.right(undefined), otherEmailAddress: E.right(undefined) },
                inviteId: id,
                invitedEmailAddress: invite.emailAddress,
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
}: {
  body: unknown
  invite: AssignedAuthorInvite
  inviteId: Uuid
  user: User
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
                .with(P.union(P.when(O.isNone), { value: '' }), () => missingE())
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
        .with({ useInvitedAddress: 'yes' }, () => RIO.of({ type: 'verified', value: invite.emailAddress }))
        .with({ useInvitedAddress: 'no', otherEmailAddress: P.select(P.string) }, emailAddress =>
          pipe(
            generateUuid,
            RIO.map(verificationToken => ({
              type: 'unverified',
              value: emailAddress,
              verificationToken,
            })),
          ),
        )
        .run(),
    ),
    RTE.chainFirstW(contactEmailAddress => saveContactEmailAddress(user.orcid, contactEmailAddress)),
    RTE.chainFirstW(contactEmailAddress =>
      match(contactEmailAddress)
        .with({ type: 'verified' }, () => RTE.of(undefined))
        .with({ type: 'unverified' }, contactEmailAddress =>
          verifyContactEmailAddressForInvitedAuthor({
            user,
            emailAddress: contactEmailAddress,
            authorInvite: inviteId,
          }),
        )
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage)
          .with({ useInvitedAddress: P.any }, form =>
            enterEmailAddressForm({
              form,
              inviteId,
              invitedEmailAddress: invite.emailAddress,
            }),
          )
          .exhaustive(),
      contactEmailAddress =>
        match(contactEmailAddress)
          .with({ type: 'verified' }, () =>
            RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id: inviteId }) }),
          )
          .with({ type: 'unverified' }, () =>
            RedirectResponse({
              location: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
            }),
          )
          .exhaustive(),
    ),
  )

const UseInvitedAddressFieldD = pipe(
  D.struct({
    useInvitedAddress: D.literal('yes', 'no'),
  }),
  D.map(get('useInvitedAddress')),
)

const OtherEmailAddressFieldD = pipe(
  D.struct({
    otherEmailAddress: EmailAddressC,
  }),
  D.map(get('otherEmailAddress')),
)

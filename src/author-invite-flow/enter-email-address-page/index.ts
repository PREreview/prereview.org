import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import type { LanguageCode } from 'iso-639-1'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type AssignedAuthorInvite, type GetAuthorInviteEnv, getAuthorInvite } from '../../author-invite'
import { type GetContactEmailAddressEnv, maybeGetContactEmailAddress } from '../../contact-email-address'
import { getInput, invalidE, missingE } from '../../form'
import type { Html } from '../../html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { authorInviteCheckMatch, authorInviteMatch, authorInvitePublishedMatch } from '../../routes'
import { EmailAddressC } from '../../types/email-address'
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
  GetContactEmailAddressEnv & GetPrereviewEnv & GetAuthorInviteEnv,
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
    RTE.matchW(
      error =>
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
      state =>
        match(state)
          .with({ contactEmailAddress: { type: 'verified' } }, () =>
            RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id }) }),
          )
          .with({ method: 'POST' }, handleEnterEmailAddressForm)
          .with({ method: P.string }, ({ invite }) =>
            enterEmailAddressForm({
              form: { useInvitedAddress: E.right(undefined), otherEmailAddress: E.right(undefined) },
              inviteId: id,
              invitedEmailAddress: invite.emailAddress,
            }),
          )

          .exhaustive(),
    ),
  )

const handleEnterEmailAddressForm = ({
  body,
  invite,
  inviteId,
}: {
  body: unknown
  invite: AssignedAuthorInvite
  inviteId: Uuid
}) =>
  pipe(
    E.Do,
    E.let('useInvitedAddress', () => pipe(UseInvitedAddressFieldD.decode(body), E.mapLeft(missingE))),
    E.let('otherEmailAddress', ({ useInvitedAddress }) =>
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
    E.chain(fields =>
      pipe(
        E.Do,
        E.apS('useInvitedAddress', fields.useInvitedAddress),
        E.apS('otherEmailAddress', fields.otherEmailAddress),
        E.mapLeft(() => fields),
      ),
    ),
    E.matchW(
      error =>
        match(error)
          .with({ useInvitedAddress: P.any }, form =>
            enterEmailAddressForm({
              form,
              inviteId,
              invitedEmailAddress: invite.emailAddress,
            }),
          )
          .exhaustive(),
      () => havingProblemsPage,
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

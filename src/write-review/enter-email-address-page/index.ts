import { Match, Option, String, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import {
  type GetContactEmailAddressEnv,
  type SaveContactEmailAddressEnv,
  UnverifiedContactEmailAddress,
  type VerifyContactEmailAddressForReviewEnv,
  maybeGetContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddressForReview,
} from '../../contact-email-address.ts'
import { type InvalidE, type MissingE, getInput, invalidE, missingE } from '../../form.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.ts'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../Response/index.ts'
import { writeReviewMatch, writeReviewNeedToVerifyEmailAddressMatch } from '../../routes.ts'
import { EmailAddressC } from '../../types/EmailAddress.ts'
import { type GenerateUuidEnv, generateUuidIO } from '../../types/uuid.ts'
import type { User } from '../../user.ts'
import { type FormStoreEnv, getForm, nextFormMatch } from '../form.ts'
import { enterEmailAddressPage } from './enter-email-address-page.ts'

export const writeReviewEnterEmailAddress = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  GenerateUuidEnv &
    GetContactEmailAddressEnv &
    SaveContactEmailAddressEnv &
    VerifyContactEmailAddressForReviewEnv &
    GetPreprintTitleEnv &
    FormStoreEnv,
  PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.bindW('contactEmailAddress', ({ user }) => maybeGetContactEmailAddress(user.orcid)),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', 'unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with({ contactEmailAddress: { _tag: 'VerifiedContactEmailAddress' } }, state =>
                  RT.of(
                    RedirectResponse({ location: format(nextFormMatch(state.form).formatter, { id: preprint.id }) }),
                  ),
                )
                .with(
                  {
                    contactEmailAddress: P.union({ _tag: 'UnverifiedContactEmailAddress' }, undefined),
                    method: 'POST',
                  },
                  handleEnterEmailAddressForm,
                )
                .with({ contactEmailAddress: P.union({ _tag: 'UnverifiedContactEmailAddress' }, undefined) }, state =>
                  RT.of(showEnterEmailAddressForm(state)),
                )
                .exhaustive(),
          ),
        ),
    ),
  )

const showEnterEmailAddressForm = ({
  contactEmailAddress,
  locale,
  preprint,
}: {
  contactEmailAddress?: UnverifiedContactEmailAddress
  locale: SupportedLocale
  preprint: PreprintTitle
}) => enterEmailAddressPage(preprint, { emailAddress: E.right(contactEmailAddress?.value) }, locale)

const handleEnterEmailAddressForm = ({
  body,
  locale,
  preprint,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.fromEither(EmailAddressFieldD.decode(body)),
    RTE.mapLeft(error => ({
      emailAddress: match(getInput('emailAddress')(error))
        .returnType<E.Either<MissingE | InvalidE, never>>()
        .with(P.union(P.when(Option.isNone), { value: '' }), () => pipe(missingE(), E.left))
        .with({ value: P.select() }, flow(invalidE, E.left))
        .exhaustive(),
    })),
    RTE.bindTo('value'),
    RTE.apS('verificationToken', RTE.rightReaderIO(generateUuidIO)),
    RTE.map(({ value, verificationToken }) => new UnverifiedContactEmailAddress({ value, verificationToken })),
    RTE.chainFirstW(contactEmailAddress => saveContactEmailAddress(user.orcid, contactEmailAddress)),
    RTE.chainFirstW(contactEmailAddress => verifyContactEmailAddressForReview(user, contactEmailAddress, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage(locale))
          .with({ emailAddress: P.any }, form => enterEmailAddressPage(preprint, form, locale))
          .exhaustive(),
      () =>
        RedirectResponse({ location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id }) }),
    ),
  )

const EmailAddressFieldD = pipe(
  D.struct({ emailAddress: pipe(D.string, D.map(String.trim), D.compose(EmailAddressC)) }),
  D.map(Struct.get('emailAddress')),
)

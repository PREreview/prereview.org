import { Option, String, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import {
  type SaveContactEmailAddressEnv,
  UnverifiedContactEmailAddress,
  type VerifyContactEmailAddressEnv,
  getContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddress,
} from '../../contact-email-address.ts'
import { getInput, invalidE, missingE } from '../../form.ts'
import type { EnvFor } from '../../Fpts.ts'
import { havingProblemsPage } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import { EmailAddressC } from '../../types/EmailAddress.ts'
import { type GenerateUuidEnv, generateUuidIO } from '../../types/uuid.ts'
import type { User } from '../../user.ts'
import { createFormPage } from './change-contact-email-address-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeContactEmailAddress>>

export const changeContactEmailAddress = ({
  body,
  locale,
  method,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  method: string
  user?: User
}) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.let('locale', () => locale),
    RTE.matchEW(
      error =>
        match(error)
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .exhaustive(),
      state =>
        match(state)
          .with({ method: 'POST' }, handleChangeContactEmailAddressForm)
          .otherwise(showChangeContactEmailAddressForm),
    ),
  )

const showChangeContactEmailAddressForm = ({ locale, user }: { locale: SupportedLocale; user: User }) =>
  pipe(
    getContactEmailAddress(user.orcid),
    RTE.getOrElseW(() => RT.of(undefined)),
    RT.map(emailAddress => createFormPage({ emailAddress: E.right(emailAddress?.value) }, locale)),
  )

const handleChangeContactEmailAddressForm = ({
  body,
  locale,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  user: User
}) =>
  pipe(
    RTE.fromEither(EmailAddressFieldD.decode(body)),
    RTE.orElseW(error =>
      match(getInput('emailAddress')(error))
        .with({ value: P.select() }, flow(invalidE, RTE.left))
        .when(Option.isNone, () => RTE.right(undefined))
        .exhaustive(),
    ),
    RTE.bindTo('emailAddress'),
    RTE.apSW(
      'originalEmailAddress',
      pipe(
        getContactEmailAddress(user.orcid),
        RTE.map(originalEmailAddress => originalEmailAddress.value),
        RTE.orElseW(() => RTE.right(undefined)),
      ),
    ),
    RTE.matchEW(
      state => RT.of(createFormPage({ emailAddress: E.left(state) }, locale)),
      ({ emailAddress, originalEmailAddress }) =>
        match(emailAddress)
          .returnType<
            RT.ReaderTask<
              GenerateUuidEnv & SaveContactEmailAddressEnv & VerifyContactEmailAddressEnv,
              PageResponse | RedirectResponse | FlashMessageResponse
            >
          >()
          .with(originalEmailAddress, () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with(P.select(P.string), emailAddress =>
            pipe(
              RTE.rightReaderIO(generateUuidIO),
              RTE.map(
                verificationToken =>
                  new UnverifiedContactEmailAddress({
                    value: emailAddress,
                    verificationToken,
                  }),
              ),
              RTE.chainFirstW(contactEmailAddress => saveContactEmailAddress(user.orcid, contactEmailAddress)),
              RTE.chainFirstW(contactEmailAddress => verifyContactEmailAddress(user, contactEmailAddress)),
              RTE.matchW(
                () => havingProblemsPage(locale),
                () =>
                  FlashMessageResponse({
                    location: format(myDetailsMatch.formatter, {}),
                    message: 'verify-contact-email',
                  }),
              ),
            ),
          )
          .with(undefined, () => RT.of(createFormPage({ emailAddress: E.left(missingE()) }, locale)))
          .exhaustive(),
    ),
  )

const EmailAddressFieldD = pipe(
  D.struct({
    emailAddress: pipe(
      D.string,
      D.map(String.trim),
      D.compose(
        D.union(
          EmailAddressC,
          pipe(
            D.literal(''),
            D.map(() => undefined),
          ),
        ),
      ),
    ),
  }),
  D.map(Struct.get('emailAddress')),
)

import { Effect, Option, String, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { ContactEmailAddresses } from '../../ContactEmailAddresses/index.ts'
import { getInput, invalidE, missingE } from '../../form.ts'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { EffectToFpts } from '../../RefactoringUtilities/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import { EmailAddressC, type EmailAddress } from '../../types/EmailAddress.ts'
import type { User } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { FlashMessageResponse, LogInResponse, RedirectResponse } from '../Response/index.ts'
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
    EffectToFpts.toReaderTaskEither(
      Effect.gen(function* () {
        const contactEmailAddresses = yield* ContactEmailAddresses

        return yield* contactEmailAddresses.getContactEmailAddress(user.orcid)
      }),
    ),
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
    RTE.matchEW(
      state => RT.of(createFormPage({ emailAddress: E.left(state) }, locale)),
      EffectToFpts.toReaderTaskK(
        Effect.fnUntraced(
          function* (emailAddress: EmailAddress | undefined) {
            const contactEmailAddresses = yield* ContactEmailAddresses

            if (!emailAddress) {
              return createFormPage({ emailAddress: E.left(missingE()) }, locale)
            }

            yield* contactEmailAddresses.startVerificationOfContactEmailAddress({
              orcidId: user.orcid,
              emailAddress,
              resumeAt: format(myDetailsMatch.formatter, {}) as `/${string}`,
            })

            return FlashMessageResponse({
              location: format(myDetailsMatch.formatter, {
                orcidId: user.orcid,
                emailAddress,
                resumeAt: format(myDetailsMatch.formatter, {}),
              }),
              message: 'verify-contact-email',
            })
          },
          Effect.catchTags({
            ContactEmailAddressIsUnavailable: () => HavingProblemsPage,
            ContactEmailAddressHasAlreadyBeenVerified: () =>
              Effect.succeed(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })),
          }),
        ),
      ),
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

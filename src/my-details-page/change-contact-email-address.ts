import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import type { Reader } from 'fp-ts/lib/Reader.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import * as s from 'fp-ts/lib/string.js'
import * as D from 'io-ts/lib/Decoder.js'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import {
  type SaveContactEmailAddressEnv,
  UnverifiedContactEmailAddress,
  type VerifyContactEmailAddressEnv,
  getContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddress,
} from '../contact-email-address.js'
import { getInput, invalidE, missingE } from '../form.js'
import { havingProblemsPage } from '../http-error.js'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import { EmailAddressC } from '../types/email-address.js'
import { type GenerateUuidEnv, generateUuid } from '../types/uuid.js'
import type { User } from '../user.js'
import { createFormPage } from './change-contact-email-address-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeContactEmailAddress>>

export const changeContactEmailAddress = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
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

const showChangeContactEmailAddressForm = ({ user }: { user: User }) =>
  pipe(
    getContactEmailAddress(user.orcid),
    RTE.getOrElseW(() => RT.of(undefined)),
    RT.map(emailAddress => createFormPage({ emailAddress: E.right(emailAddress?.value) })),
  )

const handleChangeContactEmailAddressForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.fromEither(EmailAddressFieldD.decode(body)),
    RTE.orElseW(error =>
      match(getInput('emailAddress')(error))
        .with({ value: P.select() }, flow(invalidE, RTE.left))
        .when(O.isNone, () => RTE.right(undefined))
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
      state => RT.of(createFormPage({ emailAddress: E.left(state) })),
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
              RTE.rightReaderIO(generateUuid),
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
                () => havingProblemsPage,
                () =>
                  FlashMessageResponse({
                    location: format(myDetailsMatch.formatter, {}),
                    message: 'verify-contact-email',
                  }),
              ),
            ),
          )
          .with(undefined, () => RT.of(createFormPage({ emailAddress: E.left(missingE()) })))
          .exhaustive(),
    ),
  )

const EmailAddressFieldD = pipe(
  D.struct({
    emailAddress: pipe(
      D.string,
      D.map(s.trim),
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
  D.map(get('emailAddress')),
)

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never

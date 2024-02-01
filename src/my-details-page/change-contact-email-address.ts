import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import {
  type SaveContactEmailAddressEnv,
  type UnverifiedContactEmailAddress,
  type VerifyContactEmailAddressEnv,
  getContactEmailAddress,
  saveContactEmailAddress,
  verifyContactEmailAddress,
} from '../contact-email-address'
import { type InvalidE, type MissingE, getInput, hasAnError, invalidE, missingE } from '../form'
import { html, plainText } from '../html'
import { havingProblemsPage } from '../http-error'
import { FlashMessageResponse, LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeContactEmailAddressMatch, myDetailsMatch } from '../routes'
import { type EmailAddress, EmailAddressC } from '../types/email-address'
import { type GenerateUuidEnv, generateUuid } from '../types/uuid'
import type { User } from '../user'

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
                  ({
                    type: 'unverified',
                    value: emailAddress,
                    verificationToken,
                  }) satisfies UnverifiedContactEmailAddress,
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

interface ChangeContactEmailAddressForm {
  readonly emailAddress: E.Either<MissingE | InvalidE, EmailAddress | undefined>
}

function createFormPage(form: ChangeContactEmailAddressForm) {
  const error = hasAnError(form)

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}What is your email address?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeContactEmailAddressMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.emailAddress)
                    ? html`
                        <li>
                          <a href="#email-address">
                            ${match(form.emailAddress.left)
                              .with({ _tag: 'MissingE' }, () => 'Enter your email address')
                              .with(
                                { _tag: 'InvalidE' },
                                () => 'Enter an email address in the correct format, like name@example.com',
                              )
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${error ? html`class="error"` : ''}>
          <h1><label for="email-address">What is your email address?</label></h1>

          <p id="email-address-tip" role="note">
            We’ll only use this to contact you about your account and PREreviews.
          </p>

          ${E.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.emailAddress.left)
                    .with({ _tag: 'MissingE' }, () => 'Enter your email address')
                    .with(
                      { _tag: 'InvalidE' },
                      () => 'Enter an email address in the correct format, like name@example.com',
                    )
                    .exhaustive()}
                </div>
              `
            : ''}

          <input
            name="emailAddress"
            id="email-address"
            type="text"
            inputmode="email"
            spellcheck="false"
            autocomplete="email"
            aria-describedby="email-address-tip"
            ${match(form.emailAddress)
              .with({ right: undefined }, () => '')
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ left: { _tag: 'MissingE' } }, () => '')
              .with({ left: { _tag: 'InvalidE', actual: P.select() } }, value => html`value="${value}"`)
              .exhaustive()}
            ${E.isLeft(form.emailAddress) ? html`aria-invalid="true" aria-errormessage="email-address-error"` : ''}
          />
        </div>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeContactEmailAddressMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never

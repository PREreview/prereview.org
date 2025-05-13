import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { P, match } from 'ts-pattern'
import {
  type UnverifiedContactEmailAddress,
  type VerifyContactEmailAddressForReviewEnv,
  maybeGetContactEmailAddress,
  verifyContactEmailAddressForReview,
} from '../contact-email-address.js'
import { html, plainText } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import type { TemplatePageEnv } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import type { PublicUrlEnv } from '../public-url.js'
import {
  FlashMessageResponse,
  StreamlinePageResponse,
  handleFlashMessageResponse,
  handlePageResponse,
} from '../response.js'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../routes.js'
import type { GetUserOnboardingEnv } from '../user-onboarding.js'
import { type GetUserEnv, type User, getUser } from '../user.js'
import { getForm, redirectToNextForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewNeedToVerifyEmailAddress = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bindW(
        'contactEmailAddress',
        RM.fromReaderTaskEitherK(({ user }) => maybeGetContactEmailAddress(user.orcid)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
      RM.ichainW(state =>
        match(state)
          .returnType<
            RM.ReaderMiddleware<
              GetUserEnv &
                GetUserOnboardingEnv & { locale: SupportedLocale } & PublicUrlEnv &
                TemplatePageEnv &
                VerifyContactEmailAddressForReviewEnv,
              StatusOpen,
              ResponseEnded,
              never,
              void
            >
          >()
          .with({ contactEmailAddress: { _tag: 'VerifiedContactEmailAddress' } }, state =>
            RM.fromMiddleware(redirectToNextForm(preprint.id)(state.form)),
          )
          .with(
            { contactEmailAddress: { _tag: 'UnverifiedContactEmailAddress' }, method: 'POST' },
            resendVerificationEmail,
          )
          .with({ contactEmailAddress: { _tag: 'UnverifiedContactEmailAddress' } }, showNeedToVerifyEmailAddressMessage)
          .with({ contactEmailAddress: undefined }, () =>
            RM.fromMiddleware(seeOther(format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id }))),
          )
          .exhaustive(),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('unavailable', 'form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(
    Match.valueTags({
      PreprintIsNotFound: () => notFound,
      PreprintIsUnavailable: () => serviceUnavailable,
    }),
  ),
)

const resendVerificationEmail = ({
  contactEmailAddress,
  preprint,
  user,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.fromReaderTaskEither(verifyContactEmailAddressForReview(user, contactEmailAddress, preprint.id)),
    RM.map(() =>
      FlashMessageResponse({
        message: 'verify-contact-email-resend',
        location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id }),
      }),
    ),
    RM.bindTo('response'),
    RM.ichainMiddlewareKW(handleFlashMessageResponse),
    RM.orElseW(() => serviceUnavailable),
  )

const showNeedToVerifyEmailAddressMessage = ({
  contactEmailAddress,
  preprint,
  locale,
  user,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  preprint: PreprintTitle
  locale: SupportedLocale
  user: User
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(needToVerifyEmailAddressMessage({ contactEmailAddress, locale, preprint }))),
    RM.ichainW(handlePageResponse),
  )

function needToVerifyEmailAddressMessage({
  contactEmailAddress,
  locale,
  preprint,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  locale: SupportedLocale
  preprint: PreprintTitle
}) {
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    title: pipe(t('verifyEmailAddress')(), prereviewOfSuffix(locale, preprint.title), plainText),
    nav: html`
      <a href="${format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <h1>${t('verifyEmailAddress')()}</h1>

      <p>${t('howToVerifyEmailAddress')({ emailAddress: contactEmailAddress.value })}</p>

      <p>${t('onceEmailAddressVerified')()}</p>

      <form
        method="post"
        action="${format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        <button class="secondary">${t('resendEmailButton')()}</button>
      </form>
    `,
  })
}

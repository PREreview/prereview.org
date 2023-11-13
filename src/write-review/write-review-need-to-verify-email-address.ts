import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import {
  type UnverifiedContactEmailAddress,
  maybeGetContactEmailAddress,
  verifyContactEmailAddressForReview,
} from '../contact-email-address'
import { requiresVerifiedEmailAddress } from '../feature-flags'
import { html, plainText, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { getForm, redirectToNextForm } from './form'

export const writeReviewNeedToVerifyEmailAddress = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'requiresVerifiedEmailAddress',
        flow(
          RM.fromReaderK(({ user }) => requiresVerifiedEmailAddress(user)),
          RM.filterOrElse(
            requiresVerifiedEmailAddress => requiresVerifiedEmailAddress,
            () => 'not-found' as const,
          ),
        ),
      ),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bindW(
        'contactEmailAddress',
        RM.fromReaderTaskEitherK(({ user }) => maybeGetContactEmailAddress(user.orcid)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with({ contactEmailAddress: { type: 'verified' } }, state =>
            RM.fromMiddleware(redirectToNextForm(preprint.id)(state.form)),
          )
          .with({ contactEmailAddress: { type: 'unverified' }, method: 'POST' }, resendVerificationEmail)
          .with({ contactEmailAddress: { type: 'unverified' } }, showNeedToVerifyEmailAddressMessage)
          .with({ contactEmailAddress: undefined }, () =>
            RM.fromMiddleware(seeOther(format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id }))),
          )
          .exhaustive(),
      ),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => notFound)
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
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
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
    RM.ichainMiddlewareK(() =>
      seeOther(format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id })),
    ),
    RM.orElseW(() => serviceUnavailable),
  )

const showNeedToVerifyEmailAddressMessage = flow(
  RM.fromReaderK(needToVerifyEmailAddressMessage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

function needToVerifyEmailAddressMessage({ preprint, user }: { preprint: PreprintTitle; user: User }) {
  return page({
    title: plainText`Verify your email address – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="main-content">
        <h1>Verify your email address</h1>

        <p>We’re ready to publish your PREreview, but we need to verify your email address first.</p>

        <p>
          We’ve sent you an email. Please open it and follow the link to verify your address, then reload this page.
        </p>

        <form
          method="post"
          action="${format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          <button class="secondary">Resend verification email</button>
        </form>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    type: 'streamline',
    user,
  })
}

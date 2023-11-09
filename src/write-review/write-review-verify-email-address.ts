import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { maybeGetContactEmailAddress } from '../contact-email-address'
import { requiresVerifiedEmailAddress } from '../feature-flags'
import { html, plainText, sendHtml } from '../html'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { writeReviewConductMatch, writeReviewEnterEmailAddressMatch, writeReviewMatch } from '../routes'
import { type User, getUser } from '../user'
import { getForm, redirectToNextForm } from './form'

export const writeReviewVerifyEmailAddress = flow(
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
      RM.ichainW(state =>
        match(state)
          .with({ contactEmailAddress: { type: 'verified' } }, state =>
            RM.fromMiddleware(redirectToNextForm(preprint.id)(state.form)),
          )
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
        <a href="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="main-content">
        <h1>Verify your email address</h1>

        <p>
          We’ve sent you an email. Please open it and follow the link to verify your address, then reload this page.
        </p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    type: 'streamline',
    user,
  })
}

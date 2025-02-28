import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import {
  type UnverifiedContactEmailAddress,
  maybeGetContactEmailAddress,
  verifyContactEmailAddressForReview,
} from '../contact-email-address.js'
import { deleteFlashMessage, getFlashMessage, setFlashMessage } from '../flash-message.js'
import { html, plainText, sendHtml } from '../html.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { showNotificationBanner } from '../notification-banner.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../routes.js'
import { type User, getUser } from '../user.js'
import { getForm, redirectToNextForm } from './form.js'

const FlashMessageD = D.literal('verify-contact-email-resend')

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
      RM.ichainW(state =>
        match(state)
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
  RM.orElseW(error =>
    match(error)
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
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
    RM.ichain(() => RM.status(Status.SeeOther)),
    RM.ichain(() =>
      RM.header('Location', format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id })),
    ),
    RM.ichainMiddlewareKW(() => setFlashMessage('verify-contact-email-resend')),
    RM.ichain(() => RM.closeHeaders()),
    RM.ichain(() => RM.end()),
    RM.orElseW(() => serviceUnavailable),
  )

const showNeedToVerifyEmailAddressMessage = flow(
  (state: { contactEmailAddress: UnverifiedContactEmailAddress; preprint: PreprintTitle; user: User }) => RM.of(state),
  RM.apSW('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
  RM.chainReaderK(needToVerifyEmailAddressMessage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(RM.fromMiddlewareK(() => deleteFlashMessage)),
  RM.ichainMiddlewareK(sendHtml),
)

function needToVerifyEmailAddressMessage({
  contactEmailAddress,
  message,
  preprint,
  user,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  message?: D.TypeOf<typeof FlashMessageD>
  preprint: PreprintTitle
  user: User
}) {
  return templatePage({
    title: plainText`Verify your email address – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id })}" class="back"
          ><span>Back</span></a
        >
      </nav>

      <main id="main-content">
        ${match(message)
          .with('verify-contact-email-resend', () =>
            showNotificationBanner({
              type: 'notice',
              title: html`Important`,
              content: html`<p>We’ve sent you a new email.</p>`,
            }),
          )
          .with(undefined, () => '')
          .exhaustive()}

        <h1>Verify your email address</h1>

        <p>
          Please open the email we sent to ${contactEmailAddress.value} and follow the link. You’ll then be able to
          publish your PREreview.
        </p>

        <p>Once your address is verified, you can close this page.</p>

        <form
          method="post"
          action="${format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          <button class="secondary">Resend email</button>
        </form>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    js: message ? ['notification-banner.js'] : [],
    type: 'streamline',
    user,
  })
}

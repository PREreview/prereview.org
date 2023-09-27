import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { writeReviewAddAuthorsMatch, writeReviewAuthorsMatch, writeReviewMatch } from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm } from './form'

export const writeReviewAddAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, RM.fromMiddlewareK(handleCannotAddAuthorsForm))
          .with({ form: { moreAuthors: 'yes' } }, showCannotAddAuthorsForm)
          .otherwise(() => notFound),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
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

const showCannotAddAuthorsForm = flow(
  RM.fromReaderK(({ preprint, user }: { preprint: PreprintTitle; user: User }) => cannotAddAuthorsForm(preprint, user)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const handleCannotAddAuthorsForm = ({ form, preprint }: { form: Form; preprint: PreprintTitle }) =>
  redirectToNextForm(preprint.id)(form)

function cannotAddAuthorsForm(preprint: PreprintTitle, user: User) {
  return page({
    title: plainText`Add more authors – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
          <h1>Add more authors</h1>

          <p>Unfortunately, we’re unable to add more authors now.</p>

          <p>
            Please email us at <a href="mailto:help@prereview.org">help@prereview.org</a> to let us know their details,
            and we’ll add them on your behalf.
          </p>

          <p>We’ll remind you to do this once you have published your PREreview.</p>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { writeReviewAddAuthorsMatch, writeReviewAuthorsMatch, writeReviewMatch } from '../routes'
import { getUserFromSession } from '../user'
import { Form, getForm, redirectToNextForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAddAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, fromMiddlewareK(handleCannotAddAuthorsForm))
          .with({ form: { moreAuthors: 'yes' } }, showCannotAddAuthorsForm)
          .otherwise(() => notFound),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
          )
          .with('form-unavailable', 'session-unavailable', () => serviceUnavailable)
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
  fromReaderK(({ preprint }: { preprint: Preprint }) => cannotAddAuthorsForm(preprint)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const handleCannotAddAuthorsForm = ({ form, preprint }: { form: Form; preprint: Preprint }) =>
  redirectToNextForm(preprint.doi)(form)

function cannotAddAuthorsForm(preprint: Preprint) {
  return page({
    title: plainText`Add more authors – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          <h1>Add more authors</h1>

          <p>Unfortunately, we’re unable to add more authors now.</p>

          <p>Once you have published your PREreview, please let us know their details, and we’ll add them.</p>

          <p>We’ll remind you to do this.</p>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

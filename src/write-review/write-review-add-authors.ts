import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { notFound, seeOther } from '../middleware'
import { page } from '../page'
import { writeReviewAddAuthorsMatch, writeReviewAuthorsMatch, writeReviewMatch } from '../routes'
import { getUserFromSession } from '../user'
import { getForm, showNextForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAddAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state)
          .with({ form: P.select({ moreAuthors: 'yes' }), method: 'POST' }, fromMiddlewareK(showNextForm(preprint.doi)))
          .with({ form: { moreAuthors: 'yes' } }, showAddAuthorsForm)
          .otherwise(() => notFound),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => notFound),
)

const showAddAuthorsForm = flow(
  fromReaderK(({ preprint }: { preprint: Preprint }) => addAuthorsForm(preprint)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

function addAuthorsForm(preprint: Preprint, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Add more authors – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          <h1>Add more authors</h1>

          <p>Unfortunately, we’re unable to add more authors now.</p>

          <p>Once you have posted your PREreview, please let us know their details, and we’ll add them.</p>

          <p>We’ll remind you to do this.</p>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
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

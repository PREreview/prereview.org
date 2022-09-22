import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { notFound, seeOther } from '../middleware'
import { page } from '../page'
import { preprintMatch, writeReviewMatch, writeReviewReviewMatch } from '../routes'
import { User, getUserFromSession } from '../user'
import { ReviewFormD } from './completed-form'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleReviewForm).otherwise(showReviewForm)),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(() => notFound),
)

const handleReviewForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(ReviewFormD.decode),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(() => showReviewErrorForm(preprint)),
  )

const showReviewForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) => reviewForm(preprint, form)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReviewErrorForm = flow(
  fromReaderK((preprint: Preprint) => reviewForm(preprint, {}, true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

function reviewForm(preprint: Preprint, form: Form, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Write your PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewReviewMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    <li>
                      <a href="#review">Enter your PREreview</a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(error ? 'class="error"' : '')}>
            <h1><label id="review-label" for="review">Write your PREreview</label></h1>

            ${error
              ? html`
                  <div class="error-message" id="review-error">
                    <span class="visually-hidden">Error:</span> Enter your PREreview
                  </div>
                `
              : ''}

            <html-editor>
              <textarea
                id="review"
                name="review"
                rows="20"
                ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="review-error"' : '')}
              >
${rawHtml(form.review ?? '')}</textarea
              >
            </html-editor>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['html-editor.js', 'error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

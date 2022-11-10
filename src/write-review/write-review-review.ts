import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { preprintMatch, writeReviewMatch, writeReviewReviewMatch } from '../routes'
import { NonEmptyString, NonEmptyStringC } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewReview = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'form',
        RM.fromReaderTaskK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { method: 'POST', form: { alreadyWritten: P.optional(P.nullish), review: P.optional(P.nullish) } },
            handleAlreadyWrittenForm,
          )
          .with({ method: 'POST' }, handleReviewForm)
          .with(
            { form: { alreadyWritten: P.optional(P.nullish), review: P.optional(P.nullish) } },
            showAlreadyWrittenForm,
          )
          .otherwise(showReviewForm),
      ),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showReviewForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    reviewForm(preprint, { review: E.right(form.review) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReviewErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: ReviewForm) => reviewForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showAlreadyWrittenForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    alreadyWrittenForm(preprint, { alreadyWritten: E.right(form.alreadyWritten) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAlreadyWrittenErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: AlreadyWrittenForm) => alreadyWrittenForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleReviewForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(body => E.right({ review: pipe(ReviewFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('review', fields.review),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(showReviewErrorForm(preprint)),
  )

const handleAlreadyWrittenForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(body => E.right({ alreadyWritten: pipe(AlreadyWrittenFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('alreadyWritten', fields.alreadyWritten),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(showAlreadyWrittenErrorForm(preprint)),
  )

const ReviewFieldD = pipe(
  D.struct({
    review: NonEmptyStringC,
  }),
  D.map(get('review')),
)

type ReviewForm = {
  readonly review: E.Either<MissingE, NonEmptyString | undefined>
}

const AlreadyWrittenFieldD = pipe(
  D.struct({
    alreadyWritten: D.literal('yes', 'no'),
  }),
  D.map(get('alreadyWritten')),
)

type AlreadyWrittenForm = {
  readonly alreadyWritten: E.Either<MissingE, 'yes' | 'no' | undefined>
}

function reviewForm(preprint: Preprint, form: ReviewForm) {
  const error = hasAnError(form)

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
                    ${E.isLeft(form.review)
                      ? html`
                          <li>
                            <a href="#review">
                              ${match(form.review.left)
                                .with({ _tag: 'MissingE' }, () => 'Enter your PREreview')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.review) ? 'class="error"' : '')}>
            <h1><label id="review-label" for="review">Write your PREreview</label></h1>

            ${E.isLeft(form.review)
              ? html`
                  <div class="error-message" id="review-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.review.left)
                      .with({ _tag: 'MissingE' }, () => 'Enter your PREreview')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <html-editor>
              <textarea
                id="review"
                name="review"
                rows="20"
                ${rawHtml(E.isLeft(form.review) ? 'aria-invalid="true" aria-errormessage="review-error"' : '')}
              >
${match(form.review)
                  .with(E.right(undefined), () => '')
                  .with(E.right(P.select(P.string)), identity)
                  .with(E.left({ _tag: 'MissingE' }), () => '')
                  .exhaustive()}</textarea
              >
            </html-editor>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'],
  })
}

function alreadyWrittenForm(preprint: Preprint, form: AlreadyWrittenForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Have you already written your PREreview? – PREreview of “${
      preprint.title
    }”`,
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
                    ${E.isLeft(form.alreadyWritten)
                      ? html`
                          <li>
                            <a href="#already-written-no">
                              ${match(form.alreadyWritten.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select yes if you have already written your PREreview',
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

          <div ${rawHtml(E.isLeft(form.alreadyWritten) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.alreadyWritten) ? 'aria-invalid="true" aria-errormessage="already-written-error"' : '',
              )}
            >
              <legend>
                <h1>Have you already written your PREreview?</h1>
              </legend>

              ${E.isLeft(form.alreadyWritten)
                ? html`
                    <div class="error-message" id="already-written-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.alreadyWritten.left)
                        .with({ _tag: 'MissingE' }, () => 'Select yes if you have already written your PREreview')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="alreadyWritten"
                      id="already-written-no"
                      type="radio"
                      value="no"
                      ${match(form.alreadyWritten)
                        .with(E.right('no' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="alreadyWritten"
                      type="radio"
                      value="yes"
                      ${match(form.alreadyWritten)
                        .with(E.right('yes' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

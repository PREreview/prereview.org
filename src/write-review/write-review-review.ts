import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import markdownIt from 'markdown-it'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import TurndownService from 'turndown'
import { MissingE, hasAnError, missingE } from '../form'
import { Html, html, plainText, rawHtml, sanitizeHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { preprintMatch, writeReviewMatch, writeReviewReviewMatch } from '../routes'
import { NonEmptyStringC } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

const turndown = new TurndownService({ bulletListMarker: '-', emDelimiter: '*', headingStyle: 'atx' })
turndown.keep(['sub', 'sup'])

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
          .with(
            { method: 'POST', form: { alreadyWritten: 'yes', review: P.optional(P.nullish) } },
            handlePasteReviewForm,
          )
          .with({ method: 'POST' }, handleWriteReviewForm)
          .with(
            { form: { alreadyWritten: P.optional(P.nullish), review: P.optional(P.nullish) } },
            showAlreadyWrittenForm,
          )
          .with(
            { form: { alreadyWritten: P.optional(P.nullish), review: P.optional(P.nullish) } },
            showAlreadyWrittenForm,
          )
          .with({ form: { alreadyWritten: 'yes', review: P.optional(P.nullish) } }, showPasteReviewForm)
          .otherwise(showWriteReviewForm),
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

const showWriteReviewForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    writeReviewForm(preprint, { review: E.right(form.review) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showWriteReviewErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: WriteReviewForm) => writeReviewForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showPasteReviewForm = flow(
  fromReaderK(({ form, preprint }: { form: Form & Partial<{ review: undefined }>; preprint: Preprint }) =>
    pasteReviewForm(preprint, { review: E.right(form.review) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showPasteReviewErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: PasteReviewForm) => pasteReviewForm(preprint, form)),
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

const handleWriteReviewForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
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
    RM.orElseW(showWriteReviewErrorForm(preprint)),
  )

const handlePasteReviewForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(
      flow(
        ReviewFieldD.decode,
        E.mapLeft(missingE),
        E.bimap(
          review => ({ review: E.left(review) }),
          review => ({ review }),
        ),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
    RM.orElseW(showPasteReviewErrorForm(preprint)),
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
  D.map(({ review }) => sanitizeHtml(markdownIt({ html: true }).render(review))),
)

type WriteReviewForm = {
  readonly review: E.Either<MissingE, Html | undefined>
}

type PasteReviewForm = {
  readonly review: E.Either<MissingE, undefined>
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

function writeReviewForm(preprint: Preprint, form: WriteReviewForm) {
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
              ${match(form.review)
                .with(
                  E.right(undefined),
                  () => html`
                    <textarea id="review" name="review" rows="20">${template}</textarea>
                    <textarea hidden disabled>${markdownIt().render(template)}</textarea>
                  `,
                )
                .with(
                  E.right(P.select(P.not(undefined))),
                  review => html`
                    <textarea id="review" name="review" rows="20">${turndown.turndown(review.toString())}</textarea>
                    <textarea hidden disabled>${review}</textarea>
                  `,
                )
                .with(
                  E.left({ _tag: 'MissingE' }),
                  () => html`
                    <textarea
                      id="review"
                      name="review"
                      rows="20"
                      aria-invalid="true"
                      aria-errormessage="review-error"
                    ></textarea>
                  `,
                )
                .exhaustive()}
            </html-editor>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'],
  })
}

function pasteReviewForm(preprint: Preprint, form: PasteReviewForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Paste your PREreview of “${preprint.title}”`,
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
                                .with({ _tag: 'MissingE' }, () => 'Paste your PREreview')
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
            <h1><label id="review-label" for="review">Paste your PREreview</label></h1>

            <div id="review-tip" role="note">
              Copy your PREreview and paste it here. We’ll do our best to preserve how it looks.
            </div>

            ${E.isLeft(form.review)
              ? html`
                  <div class="error-message" id="review-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.review.left)
                      .with({ _tag: 'MissingE' }, () => 'Paste your PREreview')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <html-editor>
              <textarea
                id="review"
                name="review"
                rows="20"
                aria-describedby="review-tip"
                ${rawHtml(E.isLeft(form.review) ? 'aria-invalid="true" aria-errormessage="review-error"' : '')}
              >
${match(form.review)
                  .with(E.right(undefined), () => '')
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

const template = `
Write a short summary of the research’s main findings and how this work has moved the field forward.

## Major issues

- List significant concerns about the research, if there are any.

## Minor issues

- List concerns that would improve the overall flow or clarity but are not critical to the understanding and conclusions of the research.
`.trim()

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import markdownIt from 'markdown-it'
import { P, match } from 'ts-pattern'
import TurndownService from 'turndown'
import { type InvalidE, type MissingE, hasAnError, invalidE, missingE } from '../form'
import { type Html, html, plainText, rawHtml, sanitizeHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { writeReviewMatch, writeReviewReviewMatch, writeReviewReviewTypeMatch } from '../routes'
import { NonEmptyStringC } from '../string'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

const turndown = new TurndownService({ bulletListMarker: '-', emDelimiter: '*', headingStyle: 'atx' })
turndown.keep(['sub', 'sup'])

export const writeReviewReview = flow(
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
          .with(
            {
              form: P.union(
                { alreadyWritten: P.optional(undefined) },
                { alreadyWritten: 'no', reviewType: 'questions' },
              ),
            },
            fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST', form: { alreadyWritten: 'yes' } }, handlePasteReviewForm)
          .with({ method: 'POST', form: { alreadyWritten: 'no' } }, handleWriteReviewForm)
          .with({ form: { alreadyWritten: 'yes' } }, showPasteReviewForm)
          .with({ form: { alreadyWritten: 'no' } }, showWriteReviewForm)
          .exhaustive(),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
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

const showWriteReviewForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    writeReviewForm(preprint, { review: E.right(form.review) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showWriteReviewErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: WriteReviewForm) => writeReviewForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showPasteReviewForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    pasteReviewForm(preprint, { review: E.right(form.review) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showPasteReviewErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: PasteReviewForm) => pasteReviewForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleWriteReviewForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(body =>
      E.right({
        review: pipe(
          ReviewFieldD.decode(body),
          E.mapLeft(missingE),
          E.filterOrElseW(isSameMarkdownAs(template), flow(String, invalidE)),
        ),
      }),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('review', fields.review),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ review: P.any }, showWriteReviewErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const handlePasteReviewForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
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
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ review: P.any }, showPasteReviewErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const ReviewFieldD = pipe(
  D.struct({
    review: NonEmptyStringC,
  }),
  D.map(({ review }) => sanitizeHtml(markdownIt({ html: true }).render(review))),
)

interface WriteReviewForm {
  readonly review: E.Either<MissingE | InvalidE, Html | undefined>
}

interface PasteReviewForm {
  readonly review: E.Either<MissingE, Html | undefined>
}

function writeReviewForm(preprint: PreprintTitle, form: WriteReviewForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Write your PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a
          href="${format(writeReviewReviewTypeMatch.formatter, {
            id: preprint.id,
          })}"
          class="back"
          >Back</a
        >
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}" novalidate>
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
                                .with({ _tag: P.union('MissingE', 'InvalidE') }, () => 'Enter your PREreview')
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

            <p id="review-tip" role="note">
              We want to support you in contributing high-quality feedback on PREreview. Check out our
              <a href="https://content.prereview.org/resources/">tips and resources for reviewers</a>.
            </p>

            <details>
              <summary><span>Examples of good reviewer behavior</span></summary>

              <div>
                <ul>
                  <li>Being respectful of the authors and their work.</li>
                  <li>Being humble and aware of how you would like to receive feedback from others.</li>
                  <li>Giving clear, constructive, and actionable feedback that can improve the preprint.</li>
                </ul>
              </div>
            </details>

            <details>
              <summary><span>Examples of helpful review sections</span></summary>

              <div>
                <ol>
                  <li>Begin with a summary of the research and how it contributes to the field of study.</li>
                  <li>Next, share your positive feedback, including the approach’s strengths and results.</li>
                  <li>
                    Finally, share major and minor concerns and related clear, constructive, and actionable suggestions
                    for addressing them.
                  </li>
                </ol>
              </div>
            </details>

            ${E.isLeft(form.review)
              ? html`
                  <div class="error-message" id="review-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.review.left)
                      .with({ _tag: P.union('MissingE', 'InvalidE') }, () => 'Enter your PREreview')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <html-editor>
              ${match(form.review)
                .with(
                  { right: undefined },
                  () => html`
                    <textarea id="review" name="review" rows="20" aria-describedby="review-tip">${template}</textarea>
                    <textarea hidden disabled>${markdownIt().render(template)}</textarea>
                  `,
                )
                .with(
                  { right: P.select(P.not(undefined)) },
                  review => html`
                    <textarea id="review" name="review" rows="20" aria-describedby="review-tip">
${turndown.turndown(review.toString())}</textarea
                    >
                    <textarea hidden disabled>${review}</textarea>
                  `,
                )
                .with(
                  { left: { _tag: 'MissingE' } },
                  () => html`
                    <textarea
                      id="review"
                      name="review"
                      rows="20"
                      aria-describedby="review-tip"
                      aria-invalid="true"
                      aria-errormessage="review-error"
                    ></textarea>
                  `,
                )
                .with(
                  { left: { _tag: 'InvalidE', actual: P.select() } },
                  review => html`
                    <textarea
                      id="review"
                      name="review"
                      rows="20"
                      aria-describedby="review-tip"
                      aria-invalid="true"
                      aria-errormessage="review-error"
                    >
${turndown.turndown(review)}</textarea
                    >
                    <textarea hidden disabled>${rawHtml(review)}</textarea>
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
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

function pasteReviewForm(preprint: PreprintTitle, form: PasteReviewForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Paste your PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}" novalidate>
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

            <p id="review-tip" role="note">
              Copy your PREreview and paste it here. We’ll do our best to preserve how it looks.
            </p>

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
              ${match(form.review)
                .with(
                  { right: undefined },
                  () => html` <textarea id="review" name="review" rows="20" aria-describedby="review-tip"></textarea> `,
                )
                .with(
                  { right: P.select(P.not(undefined)) },
                  review => html`
                    <textarea id="review" name="review" rows="20" aria-describedby="review-tip">
${turndown.turndown(review.toString())}</textarea
                    >
                    <textarea hidden disabled>${review}</textarea>
                  `,
                )
                .with(
                  { left: { _tag: 'MissingE' } },
                  () => html`
                    <textarea
                      id="review"
                      name="review"
                      rows="20"
                      aria-describedby="review-tip"
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
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

const template = `
Write a short summary of the research’s main findings and how this work has moved the field forward.

## Major issues

- List significant concerns about the research, if there are any.

## Minor issues

- List concerns that would improve the overall flow or clarity but are not critical to the understanding and conclusions of the research.
`.trim()

function isSameMarkdownAs(reference: string) {
  return (input: Html) => {
    return (
      turndown.turndown(input.toString()).replaceAll(/\s+/g, ' ') !==
      turndown.turndown(reference.replaceAll(/\s+/g, ' '))
    )
  }
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

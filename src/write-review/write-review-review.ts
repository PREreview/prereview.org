import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import markdownIt from 'markdown-it'
import { P, match } from 'ts-pattern'
import TurndownService from 'turndown'
import { type InvalidE, type MissingE, hasAnError, invalidE, missingE } from '../form'
import { type Html, html, plainText, rawHtml, sanitizeHtml } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../preprint'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import { writeReviewMatch, writeReviewReviewMatch, writeReviewReviewTypeMatch } from '../routes'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import { NonEmptyStringC } from '../types/string'
import type { User } from '../user'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form'

const turndown = new TurndownService({ bulletListMarker: '-', emDelimiter: '*', headingStyle: 'atx' })
turndown.keep(['sub', 'sup'])

export const writeReviewReview = ({
  body,
  id,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  user?: User
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('body', () => body),
          RTE.let('method', () => method),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage)
                  .exhaustive(),
              ),
            state =>
              match(state)
                .returnType<RT.ReaderTask<FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse>>()
                .with(
                  {
                    form: P.union(
                      { alreadyWritten: P.optional(undefined) },
                      { alreadyWritten: 'no', reviewType: 'questions' },
                    ),
                  },
                  () =>
                    RT.of(
                      RedirectResponse({ location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }) }),
                    ),
                )
                .with({ method: 'POST', form: { alreadyWritten: 'yes' } }, handlePasteReviewForm)
                .with({ method: 'POST', form: { alreadyWritten: 'no' } }, handleWriteReviewForm)
                .with({ form: { alreadyWritten: 'yes' } }, state => RT.of(showPasteReviewForm(state)))
                .with({ form: { alreadyWritten: 'no' } }, state => RT.of(showWriteReviewForm(state)))
                .exhaustive(),
          ),
        ),
    ),
  )

const showWriteReviewForm = ({ form, preprint }: { form: Form; preprint: PreprintTitle }) =>
  writeReviewForm(preprint, { review: E.right(form.review) })

const showPasteReviewForm = ({ form, preprint }: { form: Form; preprint: PreprintTitle }) =>
  pasteReviewForm(preprint, { review: E.right(form.review) })

const handleWriteReviewForm = ({
  body,
  form,
  preprint,
  user,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.right({
      review: pipe(
        ReviewFieldD.decode(body),
        E.mapLeft(missingE),
        E.filterOrElseW(isSameMarkdownAs(template), flow(String, invalidE)),
      ),
    }),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('review', fields.review),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage)
          .with({ review: P.any }, form => writeReviewForm(preprint, form))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const handlePasteReviewForm = ({
  body,
  form,
  preprint,
  user,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RTE.fromEither(
      pipe(
        ReviewFieldD.decode(body),
        E.mapLeft(missingE),
        E.bimap(
          review => ({ review: E.left(review) }),
          review => ({ review }),
        ),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage)
          .with({ review: P.any }, form => pasteReviewForm(preprint, form))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
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

function writeReviewForm(preprint: PreprintTitle, form: WriteReviewForm) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Write your PREreview of “${preprint.title}”`,
    nav: html`
      <a
        href="${format(writeReviewReviewTypeMatch.formatter, {
          id: preprint.id,
        })}"
        class="back"
        >Back</a
      >
    `,
    main: html`
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
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewMatch.formatter, { id: preprint.id }),
    js: error ? ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'] : ['html-editor.js', 'editor-toolbar.js'],
  })
}

function pasteReviewForm(preprint: PreprintTitle, form: PasteReviewForm) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Paste your PREreview of “${preprint.title}”`,
    nav: html` <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back">Back</a> `,
    main: html`
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
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewMatch.formatter, { id: preprint.id }),
    js: error ? ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'] : ['html-editor.js', 'editor-toolbar.js'],
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

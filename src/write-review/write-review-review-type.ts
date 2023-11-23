import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type GetPreprintEnv, type Preprint, type PreprintTitle, getPreprint } from '../preprint'
import { LogInResponse, PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import { preprintReviewsMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { type Form, type FormStoreEnv, createForm, getForm, nextFormMatch, saveForm, updateForm } from './form'
import { ensureUserIsNotAnAuthor } from './user-is-author'

export const writeReviewReviewType = ({
  body,
  id,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  user?: User
}): RT.ReaderTask<
  GetPreprintEnv & FormStoreEnv,
  PageResponse | StreamlinePageResponse | RedirectResponse | LogInResponse
> =>
  pipe(
    getPreprint(id),
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
          RTE.let(
            'preprint',
            () =>
              ({
                id: preprint.id,
                title: preprint.title.text,
                language: preprint.title.language,
              }) satisfies PreprintTitle,
          ),
          RTE.apS(
            'user',
            pipe(RTE.fromNullable('no-session' as const)(user), RTE.chainEitherKW(ensureUserIsNotAnAuthor(preprint))),
          ),
          RTE.bindW(
            'form',
            flow(
              ({ user }) => getForm(user.orcid, preprint.id),
              RTE.orElse(() => RTE.of(createForm())),
            ),
          ),
          RTE.let('body', () => body),
          RTE.let('method', () => method),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with({ type: 'is-author' }, () => ownPreprintPage(preprint))
                  .with('no-session', () =>
                    LogInResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with(P.instanceOf(Error), () => havingProblemsPage)
                  .exhaustive(),
              ),
            state =>
              match(state)
                .returnType<RT.ReaderTask<FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse>>()
                .with({ method: 'POST' }, handleReviewTypeForm)
                .otherwise(state => RT.of(showReviewTypeForm(state))),
          ),
        ),
    ),
  )

const showReviewTypeForm = ({ form, preprint }: { form: Form; preprint: PreprintTitle }) =>
  reviewTypeForm(preprint, { reviewType: E.right(form.alreadyWritten === 'yes' ? 'already-written' : form.reviewType) })

const handleReviewTypeForm = ({
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
    RTE.right({ reviewType: pipe(ReviewTypeFieldD.decode(body), E.mapLeft(missingE)) }),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('reviewType', fields.reviewType),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(
      flow(
        fields =>
          match(fields.reviewType)
            .returnType<Form>()
            .with('questions', reviewType => ({ alreadyWritten: 'no', reviewType }))
            .with('freeform', reviewType => ({ alreadyWritten: 'no', reviewType }))
            .with('already-written', () => ({ alreadyWritten: 'yes', reviewType: undefined }))
            .exhaustive(),
        updateForm(form),
      ),
    ),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage)
          .with({ reviewType: P.any }, form => reviewTypeForm(preprint, form))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const ReviewTypeFieldD = pipe(
  D.struct({
    reviewType: D.literal('questions', 'freeform', 'already-written'),
  }),
  D.map(get('reviewType')),
)

interface ReviewTypeForm {
  readonly reviewType: E.Either<MissingE, 'questions' | 'freeform' | 'already-written' | undefined>
}

function reviewTypeForm(preprint: PreprintTitle, form: ReviewTypeForm) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}How would you like to start your PREreview? – PREreview of “${
      preprint.title
    }”`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
    `,
    main: html`
      <form method="post" action="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.reviewType)
                    ? html`
                        <li>
                          <a href="#review-type-questions">
                            ${match(form.reviewType.left)
                              .with({ _tag: 'MissingE' }, () => 'Select how you would like to start your PREreview')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.reviewType) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(E.isLeft(form.reviewType) ? 'aria-invalid="true" aria-errormessage="review-type-error"' : '')}
          >
            <legend>
              <h1>How would you like to start your PREreview?</h1>
            </legend>

            ${E.isLeft(form.reviewType)
              ? html`
                  <div class="error-message" id="review-type-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.reviewType.left)
                      .with({ _tag: 'MissingE' }, () => 'Select how you would like to start your PREreview')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="reviewType"
                    id="review-type-questions"
                    type="radio"
                    value="questions"
                    aria-describedby="review-type-tip-questions"
                    ${match(form.reviewType)
                      .with({ right: 'questions' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>With prompts</span>
                </label>
                <p id="review-type-tip-questions" role="note">
                  We’ll ask questions about the preprint to create a structured review.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="reviewType"
                    type="radio"
                    value="freeform"
                    aria-describedby="review-type-tip-freeform"
                    ${match(form.reviewType)
                      .with({ right: 'freeform' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>With a template</span>
                </label>
                <p id="review-type-tip-freeform" role="note">
                  We’ll offer a basic template, but you can review it your way.
                </p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="reviewType"
                    type="radio"
                    value="already-written"
                    ${match(form.reviewType)
                      .with({ right: 'already-written' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>I’ve already written the review</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
    js: error ? ['error-summary.js'] : [],
  })
}

function ownPreprintPage(preprint: Preprint) {
  return PageResponse({
    status: Status.Forbidden,
    title: plainText`Sorry, you can’t review your own preprint`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
    `,
    main: html`
      <h1>Sorry, you can’t review your own preprint</h1>

      <p>If you’re not an author, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
    `,
    canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
  })
}

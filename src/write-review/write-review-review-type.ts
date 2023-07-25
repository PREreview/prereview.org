import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { preprintReviewsMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes'
import { type User, getUser } from '../user'
import { type Form, createForm, getForm, saveForm, updateForm } from './form'
import { redirectToNextForm } from './form'

export const writeReviewReviewType = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'canRapidReview',
        flow(
          fromReaderK(({ user }) => canRapidReview(user)),
          RM.filterOrElse(
            canRapidReview => canRapidReview,
            () => 'not-found' as const,
          ),
        ),
      ),
      RM.bindW(
        'form',
        flow(
          RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
          RM.orElse(() => RM.of(createForm())),
        ),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleReviewTypeForm).otherwise(showReviewTypeForm)),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => notFound)
          .with(
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with(P.instanceOf(Error), () => serviceUnavailable)
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

const showReviewTypeForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    reviewTypeForm(preprint, { reviewType: E.right(form.reviewType) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReviewTypeErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: ReviewTypeForm) => reviewTypeForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleReviewTypeForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(body => E.right({ reviewType: pipe(ReviewTypeFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('reviewType', fields.reviewType),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(
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
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ reviewType: P.any }, showReviewTypeErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const ReviewTypeFieldD = pipe(
  D.struct({
    reviewType: D.literal('questions', 'freeform', 'already-written'),
  }),
  D.map(get('reviewType')),
)

type ReviewTypeForm = {
  readonly reviewType: E.Either<MissingE, 'questions' | 'freeform' | 'already-written' | undefined>
}

function reviewTypeForm(preprint: PreprintTitle, form: ReviewTypeForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}How would you like to write your PREreview? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
      </nav>

      <main id="form">
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
                                .with({ _tag: 'MissingE' }, () => 'Select how you would like to write your PREreview')
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
                <h1>How would you like to write your PREreview?</h1>
              </legend>

              ${E.isLeft(form.reviewType)
                ? html`
                    <div class="error-message" id="review-type-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.reviewType.left)
                        .with({ _tag: 'MissingE' }, () => 'Select how you would like to write your PREreview')
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
                    <span>Guided review</span>
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
                    <span>Open review</span>
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
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
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

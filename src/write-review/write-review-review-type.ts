import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import { not } from 'fp-ts/Predicate'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { Eq as eqOrcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type Preprint, type PreprintTitle, getPreprint } from '../preprint'
import { preprintReviewsMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes'
import { type User, getUser } from '../user'
import { type Form, createForm, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewReviewType = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint: { id: preprint.id, language: preprint.title.language, title: preprint.title.text } }),
      RM.apS(
        'user',
        pipe(
          getUser,
          RM.filterOrElseW(
            not(user => RA.elem(eqAuthorByOrcid)(user, preprint.authors)),
            user => ({ type: 'is-author' as const, user }),
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
          .with({ type: 'is-author', user: P.select() }, user => showOwnPreprintPage(preprint, user))
          .with(
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
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
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    reviewTypeForm(
      preprint,
      { reviewType: E.right(form.alreadyWritten === 'yes' ? 'already-written' : form.reviewType) },
      user,
    ),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReviewTypeErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: ReviewTypeForm) => reviewTypeForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const showOwnPreprintPage = (preprint: Preprint, user: User) =>
  pipe(
    RM.rightReader(ownPreprintPage(preprint, user)),
    RM.ichainFirst(() => RM.status(Status.Forbidden)),
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
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
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

interface ReviewTypeForm {
  readonly reviewType: E.Either<MissingE, 'questions' | 'freeform' | 'already-written' | undefined>
}

const eqAuthorByOrcid = Eq.contramap(O.fromNullableK((author: Preprint['authors'][number]) => author.orcid))(
  O.getEq(eqOrcid),
)

function reviewTypeForm(preprint: PreprintTitle, form: ReviewTypeForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}How would you like to start your PREreview? – PREreview of “${
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
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

function ownPreprintPage(preprint: Preprint, user: User) {
  return page({
    title: plainText`Sorry, you can’t review your own preprint`,
    content: html`
      <nav>
        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
      </nav>

      <main id="main-content">
        <h1>Sorry, you can’t review your own preprint</h1>

        <p>If you’re not an author, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

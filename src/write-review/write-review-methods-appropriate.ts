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
import { type MissingE, missingE } from '../form'
import { hasAnError } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewIntroductionMatchesMatch,
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewMethodsAppropriate = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
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
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
            fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, handleMethodsAppropriateForm)
          .otherwise(showMethodsAppropriateForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('not-found', () => notFound)
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

const showMethodsAppropriateForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    methodsAppropriateForm(preprint, { methodsAppropriate: E.right(form.methodsAppropriate) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showMethodsAppropriateErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: MethodsAppropriateForm) => methodsAppropriateForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleMethodsAppropriateForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(body =>
      E.right({ methodsAppropriate: pipe(MethodsAppropriateFieldD.decode(body), E.mapLeft(missingE)) }),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('methodsAppropriate', fields.methodsAppropriate),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ methodsAppropriate: P.any }, showMethodsAppropriateErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const MethodsAppropriateFieldD = pipe(
  D.struct({
    methodsAppropriate: D.literal(
      'inappropriate',
      'somewhat-inappropriate',
      'adequate',
      'mostly-appropriate',
      'highly-appropriate',
      'skip',
    ),
  }),
  D.map(get('methodsAppropriate')),
)

type MethodsAppropriateForm = {
  readonly methodsAppropriate: E.Either<
    MissingE,
    | 'inappropriate'
    | 'somewhat-inappropriate'
    | 'adequate'
    | 'mostly-appropriate'
    | 'highly-appropriate'
    | 'skip'
    | undefined
  >
}

function methodsAppropriateForm(preprint: PreprintTitle, form: MethodsAppropriateForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Are the methods appropriate? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.methodsAppropriate)
                      ? html`
                          <li>
                            <a href="#methods-appropriate-inappropriate">
                              ${match(form.methodsAppropriate.left)
                                .with({ _tag: 'MissingE' }, () => 'Select if the methods are appropriate')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.methodsAppropriate) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.methodsAppropriate)
                  ? 'aria-invalid="true" aria-errormessage="methods-appropriate-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Are the methods appropriate?</h1>
              </legend>

              ${E.isLeft(form.methodsAppropriate)
                ? html`
                    <div class="error-message" id="methods-appropriate-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.methodsAppropriate.left)
                        .with({ _tag: 'MissingE' }, () => 'Select if the methods are appropriate')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      id="methods-appropriate-inappropriate"
                      type="radio"
                      value="inappropriate"
                      aria-describedby="methods-appropriate-tip-inappropriate"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'inappropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Inappropriate</span>
                  </label>
                  <p id="methods-appropriate-tip-inappropriate" role="note">
                    They are fundamentally flawed, invalid, or inconsistent with standard practices.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="somewhat-inappropriate"
                      aria-describedby="methods-appropriate-tip-somewhat-inappropriate"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'somewhat-inappropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Somewhat inappropriate</span>
                  </label>
                  <p id="methods-appropriate-tip-somewhat-inappropriate" role="note">
                    They have certain flaws or deviations from best practices but still provide helpful information or
                    insights.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="adequate"
                      aria-describedby="methods-appropriate-tip-adequate"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'adequate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Adequate</span>
                  </label>
                  <p id="methods-appropriate-tip-adequate" role="note">
                    They follow standard practices and give a reasonable basis for answering the research question.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="mostly-appropriate"
                      aria-describedby="methods-appropriate-tip-mostly-appropriate"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'mostly-appropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Mostly appropriate</span>
                  </label>
                  <p id="methods-appropriate-tip-mostly-appropriate" role="note">
                    They show that the authors clearly understand the research field and effectively explain the methods
                    they used.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="highly-appropriate"
                      aria-describedby="methods-appropriate-tip-highly-appropriate"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'highly-appropriate' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Highly appropriate</span>
                  </label>
                  <p id="methods-appropriate-tip-highly-appropriate" role="note">
                    They follow best practices, are rigorously executed, and provide a robust foundation for drawing
                    valid conclusions.
                  </p>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="methodsAppropriate"
                      type="radio"
                      value="skip"
                      ${match(form.methodsAppropriate)
                        .with({ right: 'skip' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>I don’t know</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Save and continue</button>
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

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
import {
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewFindingsNextSteps = flow(
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
          .with({ method: 'POST' }, handleFindingsNextStepsForm)
          .otherwise(showFindingsNextStepsForm),
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

const showFindingsNextStepsForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    findingsNextStepsForm(preprint, { findingsNextSteps: E.right(form.findingsNextSteps) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showFindingsNextStepsErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: FindingsNextStepsForm) => findingsNextStepsForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleFindingsNextStepsForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(body =>
      E.right({ findingsNextSteps: pipe(FindingsNextStepsFieldD.decode(body), E.mapLeft(missingE)) }),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('findingsNextSteps', fields.findingsNextSteps),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ findingsNextSteps: P.any }, showFindingsNextStepsErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const FindingsNextStepsFieldD = pipe(
  D.struct({
    findingsNextSteps: D.literal(
      'inadequately',
      'insufficiently',
      'adequately',
      'clearly-insightfully',
      'exceptionally',
      'skip',
    ),
  }),
  D.map(get('findingsNextSteps')),
)

type FindingsNextStepsForm = {
  readonly findingsNextSteps: E.Either<
    MissingE,
    'inadequately' | 'insufficiently' | 'adequately' | 'clearly-insightfully' | 'exceptionally' | 'skip' | undefined
  >
}

function findingsNextStepsForm(preprint: PreprintTitle, form: FindingsNextStepsForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${
      error ? 'Error: ' : ''
    }How well do the authors discuss, explain, and interpret their findings and potential next steps for the research?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.findingsNextSteps)
                      ? html`
                          <li>
                            <a href="#findings-next-steps-inadequately">
                              ${match(form.findingsNextSteps.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select how well the authors discuss their findings and next steps',
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

          <div ${rawHtml(E.isLeft(form.findingsNextSteps) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.findingsNextSteps)
                  ? 'aria-invalid="true" aria-errormessage="findings-next-steps-error"'
                  : '',
              )}
            >
              <legend>
                <h1>
                  How well do the authors discuss, explain, and interpret their findings and potential next steps for
                  the research?
                </h1>
              </legend>

              ${E.isLeft(form.findingsNextSteps)
                ? html`
                    <div class="error-message" id="findings-next-steps-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.findingsNextSteps.left)
                        .with(
                          { _tag: 'MissingE' },
                          () => 'Select how well the authors discuss their findings and next steps',
                        )
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      id="findings-next-steps-inadequately"
                      type="radio"
                      value="inadequately"
                      aria-describedby="findings-next-steps-tip-inadequately"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'inadequately' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Inadequately</span>
                  </label>
                  <p id="findings-next-steps-tip-inadequately" role="note">
                    They fail to discuss, explain, or interpret their findings and potential next steps.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="insufficiently"
                      aria-describedby="findings-next-steps-tip-insufficiently"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'insufficiently' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Insufficiently</span>
                  </label>
                  <p id="findings-next-steps-tip-insufficiently" role="note">
                    They provide limited or insufficient discussion, explanation, or interpretation of their findings
                    and potential next steps.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="adequately"
                      aria-describedby="findings-next-steps-tip-adequately"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'adequately' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Adequately</span>
                  </label>
                  <p id="findings-next-steps-tip-adequately" role="note">
                    They adequately discuss, explain, and interpret their findings and potential next steps for the
                    research.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="clearly-insightfully"
                      aria-describedby="findings-next-steps-tip-clearly-insightfully"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'clearly-insightfully' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Clearly and insightfully</span>
                  </label>
                  <p id="findings-next-steps-tip-clearly-insightfully" role="note">
                    They provide clear and insightful discussion, explanation, and interpretation of their findings and
                    potential next steps.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="exceptionally"
                      aria-describedby="findings-next-steps-tip-exceptionally"
                      ${match(form.findingsNextSteps)
                        .with({ right: 'exceptionally' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Exceptionally</span>
                  </label>
                  <p id="findings-next-steps-tip-exceptionally" role="note">
                    They demonstrate clarity, depth, and insight in their discussion, explanation, and interpretation of
                    their findings and potential next steps.
                  </p>
                </li>
                <li>
                  <span>or</span>
                  <label>
                    <input
                      name="findingsNextSteps"
                      type="radio"
                      value="skip"
                      ${match(form.findingsNextSteps)
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

import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import {
  type FieldDecoders,
  type Fields,
  type ValidFields,
  decodeFields,
  hasAnError,
  optionalDecoder,
  requiredDecoder,
} from '../form'
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
import { NonEmptyStringC } from '../string'
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
    methodsAppropriateForm(preprint, FormToFieldsE.encode(form), user),
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
    RM.decodeBody(decodeFields(methodsAppropriateFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ methodsAppropriate: P.any }, showMethodsAppropriateErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const methodsAppropriateFields = {
  methodsAppropriate: requiredDecoder(
    D.literal(
      'inappropriate',
      'somewhat-inappropriate',
      'adequate',
      'mostly-appropriate',
      'highly-appropriate',
      'skip',
    ),
  ),
  methodsAppropriateInappropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateSomewhatInappropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateAdequateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateMostlyAppropriateDetails: optionalDecoder(NonEmptyStringC),
  methodsAppropriateHighlyAppropriateDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof methodsAppropriateFields>> = {
  encode: fields => ({
    methodsAppropriate: fields.methodsAppropriate,
    methodsAppropriateDetails: {
      inappropriate: fields.methodsAppropriateInappropriateDetails,
      'somewhat-inappropriate': fields.methodsAppropriateSomewhatInappropriateDetails,
      adequate: fields.methodsAppropriateAdequateDetails,
      'mostly-appropriate': fields.methodsAppropriateMostlyAppropriateDetails,
      'highly-appropriate': fields.methodsAppropriateHighlyAppropriateDetails,
    },
  }),
}

const FormToFieldsE: Encoder<MethodsAppropriateForm, Form> = {
  encode: form => ({
    methodsAppropriate: E.right(form.methodsAppropriate),
    methodsAppropriateInappropriateDetails: E.right(form.methodsAppropriateDetails?.['inappropriate']),
    methodsAppropriateSomewhatInappropriateDetails: E.right(form.methodsAppropriateDetails?.['somewhat-inappropriate']),
    methodsAppropriateAdequateDetails: E.right(form.methodsAppropriateDetails?.['adequate']),
    methodsAppropriateMostlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['mostly-appropriate']),
    methodsAppropriateHighlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['highly-appropriate']),
  }),
}

type MethodsAppropriateForm = Fields<typeof methodsAppropriateFields>

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
            <conditional-inputs>
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
                        aria-controls="methods-appropriate-inappropriate-control"
                        ${match(form.methodsAppropriate)
                          .with({ right: 'inappropriate' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Inappropriate</span>
                    </label>
                    <p id="methods-appropriate-tip-inappropriate" role="note">
                      They are fundamentally flawed, invalid, or inconsistent with standard practices.
                    </p>
                    <div class="conditional" id="methods-appropriate-inappropriate-control">
                      <div>
                        <label for="methods-appropriate-inappropriate-details" class="textarea"
                          >Why are they inappropriate? (optional)</label
                        >

                        <textarea
                          name="methodsAppropriateInappropriateDetails"
                          id="methods-appropriate-inappropriate-details"
                          rows="5"
                        >
${match(form.methodsAppropriateInappropriateDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="methodsAppropriate"
                        type="radio"
                        value="somewhat-inappropriate"
                        aria-describedby="methods-appropriate-tip-somewhat-inappropriate"
                        aria-controls="methods-appropriate-somewhat-inappropriate-control"
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
                    <div class="conditional" id="methods-appropriate-somewhat-inappropriate-control">
                      <div>
                        <label for="methods-appropriate-somewhat-inappropriate-details" class="textarea"
                          >Why are they somewhat inappropriate? (optional)</label
                        >

                        <textarea
                          name="methodsAppropriateSomewhatInappropriateDetails"
                          id="methods-appropriate-somewhat-inappropriate-details"
                          rows="5"
                        >
${match(form.methodsAppropriateSomewhatInappropriateDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="methodsAppropriate"
                        type="radio"
                        value="adequate"
                        aria-describedby="methods-appropriate-tip-adequate"
                        aria-controls="methods-appropriate-adequate-control"
                        ${match(form.methodsAppropriate)
                          .with({ right: 'adequate' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Adequate</span>
                    </label>
                    <p id="methods-appropriate-tip-adequate" role="note">
                      They follow standard practices and give a reasonable basis for answering the research question.
                    </p>
                    <div class="conditional" id="methods-appropriate-adequate-control">
                      <div>
                        <label for="methods-appropriate-adequate-details" class="textarea"
                          >Why are they adequate? (optional)</label
                        >

                        <textarea
                          name="methodsAppropriateAdequateDetails"
                          id="methods-appropriate-adequate-details"
                          rows="5"
                        >
${match(form.methodsAppropriateAdequateDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="methodsAppropriate"
                        type="radio"
                        value="mostly-appropriate"
                        aria-describedby="methods-appropriate-tip-mostly-appropriate"
                        aria-controls="methods-appropriate-mostly-appropriate-control"
                        ${match(form.methodsAppropriate)
                          .with({ right: 'mostly-appropriate' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Mostly appropriate</span>
                    </label>
                    <p id="methods-appropriate-tip-mostly-appropriate" role="note">
                      They show that the authors clearly understand the research field and effectively explain the
                      methods they used.
                    </p>
                    <div class="conditional" id="methods-appropriate-mostly-appropriate-control">
                      <div>
                        <label for="methods-appropriate-mostly-appropriate-details" class="textarea"
                          >Why are they mostly appropriate? (optional)</label
                        >

                        <textarea
                          name="methodsAppropriateMostlyAppropriateDetails"
                          id="methods-appropriate-mostly-appropriate-details"
                          rows="5"
                        >
${match(form.methodsAppropriateMostlyAppropriateDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="methodsAppropriate"
                        type="radio"
                        value="highly-appropriate"
                        aria-describedby="methods-appropriate-tip-highly-appropriate"
                        aria-controls="methods-appropriate-highly-appropriate-control"
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
                    <div class="conditional" id="methods-appropriate-highly-appropriate-control">
                      <div>
                        <label for="methods-appropriate-highly-appropriate-details" class="textarea"
                          >Why are they highly appropriate? (optional)</label
                        >

                        <textarea
                          name="methodsAppropriateHighlyAppropriateDetails"
                          id="methods-appropriate-highly-appropriate-details"
                          rows="5"
                        >
${match(form.methodsAppropriateHighlyAppropriateDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
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
            </conditional-inputs>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
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

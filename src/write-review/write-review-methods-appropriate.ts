import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import { P, match } from 'ts-pattern'
import {
  type FieldDecoders,
  type Fields,
  type ValidFields,
  decodeFields,
  hasAnError,
  optionalDecoder,
  requiredDecoder,
} from '../form.js'
import { html, plainText, rawHtml, sendHtml } from '../html.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewIntroductionMatchesMatch,
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'

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
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with(
            { form: P.union({ alreadyWritten: P.optional('yes') }, { reviewType: P.optional('freeform') }) },
            RM.fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with({ method: 'POST' }, handleMethodsAppropriateForm)
          .otherwise(showMethodsAppropriateForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showMethodsAppropriateForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    methodsAppropriateForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showMethodsAppropriateErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: MethodsAppropriateForm) => methodsAppropriateForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleMethodsAppropriateForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(methodsAppropriateFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
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
    methodsAppropriateInappropriateDetails: E.right(form.methodsAppropriateDetails?.inappropriate),
    methodsAppropriateSomewhatInappropriateDetails: E.right(form.methodsAppropriateDetails?.['somewhat-inappropriate']),
    methodsAppropriateAdequateDetails: E.right(form.methodsAppropriateDetails?.adequate),
    methodsAppropriateMostlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['mostly-appropriate']),
    methodsAppropriateHighlyAppropriateDetails: E.right(form.methodsAppropriateDetails?.['highly-appropriate']),
  }),
}

type MethodsAppropriateForm = Fields<typeof methodsAppropriateFields>

function methodsAppropriateForm(preprint: PreprintTitle, form: MethodsAppropriateForm, user: User) {
  const error = hasAnError(form)

  return templatePage({
    title: plainText`${error ? 'Error: ' : ''}Are the methods well-suited for this research? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}" class="back"
          ><span>Back</span></a
        >
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
                            <a href="#methods-appropriate-highly-appropriate">
                              ${match(form.methodsAppropriate.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select if the methods are well-suited for this research',
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
                  <h1>Are the methods well-suited for this research?</h1>
                </legend>

                ${E.isLeft(form.methodsAppropriate)
                  ? html`
                      <div class="error-message" id="methods-appropriate-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.methodsAppropriate.left)
                          .with({ _tag: 'MissingE' }, () => 'Select if the methods are well-suited for this research')
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="methodsAppropriate"
                        id="methods-appropriate-highly-appropriate"
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
                      They follow best practices throughout the research. They are rigorously executed and provide a
                      robust foundation for drawing valid conclusions.
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
                      <span>Somewhat appropriate</span>
                    </label>
                    <p id="methods-appropriate-tip-mostly-appropriate" role="note">
                      They follow best practices through most, but not all, of the research. They are well executed and
                      provide a good foundation for drawing valid conclusions.
                    </p>
                    <div class="conditional" id="methods-appropriate-mostly-appropriate-control">
                      <div>
                        <label for="methods-appropriate-mostly-appropriate-details" class="textarea"
                          >Why are they somewhat appropriate? (optional)</label
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
                        value="adequate"
                        aria-describedby="methods-appropriate-tip-adequate"
                        aria-controls="methods-appropriate-adequate-control"
                        ${match(form.methodsAppropriate)
                          .with({ right: 'adequate' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Neither appropriate nor inappropriate</span>
                    </label>
                    <p id="methods-appropriate-tip-adequate" role="note">
                      They do not always follow best practices but give a reasonable basis for answering the research
                      question.
                    </p>
                    <div class="conditional" id="methods-appropriate-adequate-control">
                      <div>
                        <label for="methods-appropriate-adequate-details" class="textarea"
                          >Why are they neither appropriate nor inappropriate? (optional)</label
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
                      They have certain flaws or deviations from best practices that limit the value of the information
                      and insights they share.
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
                        value="inappropriate"
                        aria-describedby="methods-appropriate-tip-inappropriate"
                        aria-controls="methods-appropriate-inappropriate-control"
                        ${match(form.methodsAppropriate)
                          .with({ right: 'inappropriate' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Highly inappropriate</span>
                    </label>
                    <p id="methods-appropriate-tip-inappropriate" role="note">
                      They are fundamentally flawed, invalid, or inconsistent with best practices.
                    </p>
                    <div class="conditional" id="methods-appropriate-inappropriate-control">
                      <div>
                        <label for="methods-appropriate-inappropriate-details" class="textarea"
                          >Why are they highly inappropriate? (optional)</label
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

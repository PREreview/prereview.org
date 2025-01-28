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
  writeReviewMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewReviewTypeMatch,
  writeReviewShouldReadMatch,
} from '../routes.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'

export const writeReviewReadyFullReview = flow(
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
          .with({ method: 'POST' }, handleReadyFullReviewForm)
          .otherwise(showReadyFullReviewForm),
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

const showReadyFullReviewForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    readyFullReviewForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showReadyFullReviewErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: ReadyFullReviewForm) => readyFullReviewForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleReadyFullReviewForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(readyFullReviewFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ readyFullReview: P.any }, showReadyFullReviewErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const readyFullReviewFields = {
  readyFullReview: requiredDecoder(D.literal('no', 'yes-changes', 'yes')),
  readyFullReviewNoDetails: optionalDecoder(NonEmptyStringC),
  readyFullReviewYesChangesDetails: optionalDecoder(NonEmptyStringC),
  readyFullReviewYesDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof readyFullReviewFields>> = {
  encode: fields => ({
    readyFullReview: fields.readyFullReview,
    readyFullReviewDetails: {
      no: fields.readyFullReviewNoDetails,
      'yes-changes': fields.readyFullReviewYesChangesDetails,
      yes: fields.readyFullReviewYesDetails,
    },
  }),
}

const FormToFieldsE: Encoder<ReadyFullReviewForm, Form> = {
  encode: form => ({
    readyFullReview: E.right(form.readyFullReview),
    readyFullReviewNoDetails: E.right(form.readyFullReviewDetails?.no),
    readyFullReviewYesChangesDetails: E.right(form.readyFullReviewDetails?.['yes-changes']),
    readyFullReviewYesDetails: E.right(form.readyFullReviewDetails?.yes),
  }),
}

type ReadyFullReviewForm = Fields<typeof readyFullReviewFields>

function readyFullReviewForm(preprint: PreprintTitle, form: ReadyFullReviewForm, user: User) {
  const error = hasAnError(form)

  return templatePage({
    title: plainText`${
      error ? 'Error: ' : ''
    }Is it ready for attention from an editor, publisher or broader audience? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}" class="back"
          ><span>Back</span></a
        >
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewReadyFullReviewMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.readyFullReview)
                      ? html`
                          <li>
                            <a href="#ready-full-review-yes">
                              ${match(form.readyFullReview.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () =>
                                    'Select yes if it is ready for attention from an editor, publisher or broader audience',
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

          <div ${rawHtml(E.isLeft(form.readyFullReview) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(
                  E.isLeft(form.readyFullReview)
                    ? 'aria-invalid="true" aria-errormessage="ready-full-review-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>Is it ready for attention from an editor, publisher or broader audience?</h1>
                </legend>

                ${E.isLeft(form.readyFullReview)
                  ? html`
                      <div class="error-message" id="ready-full-review-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.readyFullReview.left)
                          .with(
                            { _tag: 'MissingE' },
                            () =>
                              'Select yes if it is ready for attention from an editor, publisher or broader audience',
                          )
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="readyFullReview"
                        id="ready-full-review-yes"
                        type="radio"
                        value="yes"
                        aria-controls="ready-full-review-yes-control"
                        ${match(form.readyFullReview)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Yes, as it is</span>
                    </label>
                    <div class="conditional" id="ready-full-review-yes-control">
                      <div>
                        <label for="ready-full-review-yes-details" class="textarea">Why is it ready? (optional)</label>

                        <textarea name="readyFullReviewYesDetails" id="ready-full-review-yes-details" rows="5">
${match(form.readyFullReviewYesDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="readyFullReview"
                        type="radio"
                        value="yes-changes"
                        aria-controls="ready-full-review-yes-changes-control"
                        ${match(form.readyFullReview)
                          .with({ right: 'yes-changes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Yes, after minor changes</span>
                    </label>
                    <div class="conditional" id="ready-full-review-yes-changes-control">
                      <div>
                        <label for="ready-full-review-yes-changes-details" class="textarea"
                          >What needs tweaking? (optional)</label
                        >

                        <textarea
                          name="readyFullReviewYesChangesDetails"
                          id="ready-full-review-yes-changes-details"
                          rows="5"
                        >
${match(form.readyFullReviewYesChangesDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="readyFullReview"
                        type="radio"
                        value="no"
                        aria-controls="ready-full-review-no-control"
                        ${match(form.readyFullReview)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>No, it needs a major revision</span>
                    </label>
                    <div class="conditional" id="ready-full-review-no-control">
                      <div>
                        <label for="ready-full-review-no-details" class="textarea"
                          >What needs to change? (optional)</label
                        >

                        <textarea name="readyFullReviewNoDetails" id="ready-full-review-no-details" rows="5">
${match(form.readyFullReviewNoDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
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

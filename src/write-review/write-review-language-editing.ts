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
  writeReviewLanguageEditingMatch,
  writeReviewMatch,
  writeReviewNovelMatch,
  writeReviewReviewTypeMatch,
} from '../routes.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'

export const writeReviewLanguageEditing = flow(
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
          .with({ method: 'POST' }, handleLanguageEditingForm)
          .otherwise(showLanguageEditingForm),
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
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showLanguageEditingForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    languageEditingForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showLanguageEditingErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: LanguageEditingForm) => languageEditingForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleLanguageEditingForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(languageEditingFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ languageEditing: P.any }, showLanguageEditingErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const languageEditingFields = {
  languageEditing: requiredDecoder(D.literal('no', 'yes')),
  languageEditingNoDetails: optionalDecoder(NonEmptyStringC),
  languageEditingYesDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof languageEditingFields>> = {
  encode: fields => ({
    languageEditing: fields.languageEditing,
    languageEditingDetails: {
      no: fields.languageEditingNoDetails,
      yes: fields.languageEditingYesDetails,
    },
  }),
}

const FormToFieldsE: Encoder<LanguageEditingForm, Form> = {
  encode: form => ({
    languageEditing: E.right(form.languageEditing),
    languageEditingNoDetails: E.right(form.languageEditingDetails?.no),
    languageEditingYesDetails: E.right(form.languageEditingDetails?.yes),
  }),
}

type LanguageEditingForm = Fields<typeof languageEditingFields>

function languageEditingForm(preprint: PreprintTitle, form: LanguageEditingForm, user: User) {
  const error = hasAnError(form)

  return templatePage({
    title: plainText`${error ? 'Error: ' : ''}Would it benefit from language editing? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.languageEditing)
                      ? html`
                          <li>
                            <a href="#language-editing-no">
                              ${match(form.languageEditing.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select yes if it would benefit from language editing',
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

          <div ${rawHtml(E.isLeft(form.languageEditing) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(
                  E.isLeft(form.languageEditing)
                    ? 'aria-invalid="true" aria-errormessage="language-editing-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>Would it benefit from language editing?</h1>
                </legend>

                ${E.isLeft(form.languageEditing)
                  ? html`
                      <div class="error-message" id="language-editing-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.languageEditing.left)
                          .with({ _tag: 'MissingE' }, () => 'Select yes if it would benefit from language editing')
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="languageEditing"
                        id="language-editing-no"
                        type="radio"
                        value="no"
                        aria-describedby="language-editing-tip-no"
                        aria-controls="language-editing-no-control"
                        ${match(form.languageEditing)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>No</span>
                    </label>
                    <p id="language-editing-tip-no" role="note">
                      There may be minor language issues, but they do not impact clarity or understanding.
                    </p>
                    <div class="conditional" id="language-editing-no-control">
                      <div>
                        <label for="language-editing-no-details" class="textarea">Why wouldn’t it? (optional)</label>

                        <textarea name="languageEditingNoDetails" id="language-editing-no-details" rows="5">
${match(form.languageEditingNoDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="languageEditing"
                        type="radio"
                        value="yes"
                        aria-describedby="language-editing-tip-yes"
                        aria-controls="language-editing-yes-control"
                        ${match(form.languageEditing)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>Yes</span>
                    </label>
                    <p id="language-editing-tip-yes" role="note">
                      Grammatical errors, confusing phrasing, or unclear expressions may hinder comprehension.
                    </p>
                    <div class="conditional" id="language-editing-yes-control">
                      <div>
                        <label for="language-editing-yes-details" class="textarea">Why would it? (optional)</label>

                        <textarea name="languageEditingYesDetails" id="language-editing-yes-details" rows="5">
${match(form.languageEditingYesDetails)
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

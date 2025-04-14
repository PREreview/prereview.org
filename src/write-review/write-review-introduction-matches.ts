import { flow, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
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
import { DefaultLocale, type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import { writeReviewIntroductionMatchesMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewIntroductionMatches = flow(
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
          .with({ method: 'POST' }, handleIntroductionMatchesForm)
          .otherwise(showIntroductionMatchesForm),
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

const showIntroductionMatchesForm = flow(
  RM.fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    introductionMatchesForm(preprint, FormToFieldsE.encode(form), user, DefaultLocale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showIntroductionMatchesErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: IntroductionMatchesForm) => introductionMatchesForm(preprint, form, user, DefaultLocale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleIntroductionMatchesForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(introductionMatchesFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ introductionMatches: P.any }, showIntroductionMatchesErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const introductionMatchesFields = {
  introductionMatches: requiredDecoder(D.literal('yes', 'partly', 'no', 'skip')),
  introductionMatchesYesDetails: optionalDecoder(NonEmptyStringC),
  introductionMatchesPartlyDetails: optionalDecoder(NonEmptyStringC),
  introductionMatchesNoDetails: optionalDecoder(NonEmptyStringC),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof introductionMatchesFields>> = {
  encode: fields => ({
    introductionMatches: fields.introductionMatches,
    introductionMatchesDetails: {
      yes: fields.introductionMatchesYesDetails,
      partly: fields.introductionMatchesPartlyDetails,
      no: fields.introductionMatchesNoDetails,
    },
  }),
}

const FormToFieldsE: Encoder<IntroductionMatchesForm, Form> = {
  encode: form => ({
    introductionMatches: E.right(form.introductionMatches),
    introductionMatchesYesDetails: E.right(form.introductionMatchesDetails?.yes),
    introductionMatchesPartlyDetails: E.right(form.introductionMatchesDetails?.partly),
    introductionMatchesNoDetails: E.right(form.introductionMatchesDetails?.no),
  }),
}

type IntroductionMatchesForm = Fields<typeof introductionMatchesFields>

function introductionMatchesForm(
  preprint: PreprintTitle,
  form: IntroductionMatchesForm,
  user: User,
  locale: SupportedLocale,
) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return templatePage({
    title: pipe(
      t('doesIntroductionExplain')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>
        <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back"
          ><span>${t('backNav')()}</span></a
        >
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                  <ul>
                    ${E.isLeft(form.introductionMatches)
                      ? html`
                          <li>
                            <a href="#introduction-matches-yes">
                              ${match(form.introductionMatches.left)
                                .with({ _tag: 'MissingE' }, () => t('selectIntroductionExplains')())
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.introductionMatches) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                ${rawHtml(
                  E.isLeft(form.introductionMatches)
                    ? 'aria-invalid="true" aria-errormessage="introduction-matches-error"'
                    : '',
                )}
              >
                <legend>
                  <h1>${t('doesIntroductionExplain')()}</h1>
                </legend>

                ${E.isLeft(form.introductionMatches)
                  ? html`
                      <div class="error-message" id="introduction-matches-error">
                        <span class="visually-hidden">${t('error')()}:</span>
                        ${match(form.introductionMatches.left)
                          .with({ _tag: 'MissingE' }, () => t('selectIntroductionExplains')())
                          .exhaustive()}
                      </div>
                    `
                  : ''}

                <ol>
                  <li>
                    <label>
                      <input
                        name="introductionMatches"
                        id="introduction-matches-yes"
                        type="radio"
                        value="yes"
                        aria-describedby="introduction-matches-tip-yes"
                        aria-controls="introduction-matches-yes-control"
                        ${match(form.introductionMatches)
                          .with({ right: 'yes' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('yes')()}</span>
                    </label>
                    <p id="introduction-matches-tip-yes" role="note">${t('clearlyExplainsTip')()}</p>
                    <div class="conditional" id="introduction-matches-yes-control">
                      <div>
                        <label for="introduction-matches-yes-details" class="textarea"
                          >${t('howIntroductionExplains')()}</label
                        >

                        <textarea name="introductionMatchesYesDetails" id="introduction-matches-yes-details" rows="5">
${match(form.introductionMatchesYesDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="introductionMatches"
                        type="radio"
                        value="partly"
                        aria-describedby="introduction-matches-tip-partly"
                        aria-controls="introduction-matches-partly-control"
                        ${match(form.introductionMatches)
                          .with({ right: 'partly' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('partly')()}</span>
                    </label>
                    <p id="introduction-matches-tip-partly" role="note">${t('partlyTip')()}</p>
                    <div class="conditional" id="introduction-matches-partly-control">
                      <div>
                        <label for="introduction-matches-partly-details" class="textarea">${t('partlyHow')()}</label>

                        <textarea
                          name="introductionMatchesPartlyDetails"
                          id="introduction-matches-partly-details"
                          rows="5"
                        >
${match(form.introductionMatchesPartlyDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <label>
                      <input
                        name="introductionMatches"
                        type="radio"
                        value="no"
                        aria-describedby="introduction-matches-tip-no"
                        aria-controls="introduction-matches-no-control"
                        ${match(form.introductionMatches)
                          .with({ right: 'no' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('no')()}</span>
                    </label>
                    <p id="introduction-matches-tip-no" role="note">${t('doesNotExplain')()}</p>
                    <div class="conditional" id="introduction-matches-no-control">
                      <div>
                        <label for="introduction-matches-no-details" class="textarea"
                          >${t('doesNotExplainHow')()}</label
                        >

                        <textarea name="introductionMatchesNoDetails" id="introduction-matches-no-details" rows="5">
${match(form.introductionMatchesNoDetails)
                            .with({ right: P.select(P.string) }, identity)
                            .otherwise(() => '')}</textarea
                        >
                      </div>
                    </div>
                  </li>
                  <li>
                    <span>${t('or')()}</span>
                    <label>
                      <input
                        name="introductionMatches"
                        type="radio"
                        value="skip"
                        ${match(form.introductionMatches)
                          .with({ right: 'skip' }, () => 'checked')
                          .otherwise(() => '')}
                      />
                      <span>${t('iDoNotKnow')()}</span>
                    </label>
                  </li>
                </ol>
              </fieldset>
            </conditional-inputs>
          </div>

          <button>${t('saveAndContinueButton')()}</button>
        </form>
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    locale,
    user,
  })
}

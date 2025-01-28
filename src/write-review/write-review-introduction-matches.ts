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
import { writeReviewIntroductionMatchesMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes.js'
import { NonEmptyStringC } from '../types/string.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'

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
    introductionMatchesForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showIntroductionMatchesErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    RM.fromReaderK((form: IntroductionMatchesForm) => introductionMatchesForm(preprint, form, user)),
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

function introductionMatchesForm(preprint: PreprintTitle, form: IntroductionMatchesForm, user: User) {
  const error = hasAnError(form)

  return templatePage({
    title: plainText`${
      error ? 'Error: ' : ''
    }Does the introduction explain the objective of the research presented in the preprint?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back"
          ><span>Back</span></a
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
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.introductionMatches)
                      ? html`
                          <li>
                            <a href="#introduction-matches-yes">
                              ${match(form.introductionMatches.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () =>
                                    'Select if the introduction explains the objective of the research presented in the preprint',
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
                  <h1>Does the introduction explain the objective of the research presented in the preprint?</h1>
                </legend>

                ${E.isLeft(form.introductionMatches)
                  ? html`
                      <div class="error-message" id="introduction-matches-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.introductionMatches.left)
                          .with(
                            { _tag: 'MissingE' },
                            () =>
                              'Select if the introduction explains the objective of the research presented in the preprint',
                          )
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
                      <span>Yes</span>
                    </label>
                    <p id="introduction-matches-tip-yes" role="note">It clearly explains the objective.</p>
                    <div class="conditional" id="introduction-matches-yes-control">
                      <div>
                        <label for="introduction-matches-yes-details" class="textarea"
                          >How does the introduction explain the objective? (optional)</label
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
                      <span>Partly</span>
                    </label>
                    <p id="introduction-matches-tip-partly" role="note">
                      It mentions, but doesn’t fully explain, the objective.
                    </p>
                    <div class="conditional" id="introduction-matches-partly-control">
                      <div>
                        <label for="introduction-matches-partly-details" class="textarea"
                          >How does the introduction only partly explain the objective? (optional)</label
                        >

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
                      <span>No</span>
                    </label>
                    <p id="introduction-matches-tip-no" role="note">It doesn’t mention or explain the objective.</p>
                    <div class="conditional" id="introduction-matches-no-control">
                      <div>
                        <label for="introduction-matches-no-details" class="textarea"
                          >How does the introduction not explain the objective? (optional)</label
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
                    <span>or</span>
                    <label>
                      <input
                        name="introductionMatches"
                        type="radio"
                        value="skip"
                        ${match(form.introductionMatches)
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

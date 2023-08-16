import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import { type FieldDecoders, type Fields, type ValidFields, decodeFields, hasAnError, requiredDecoder } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { writeReviewIntroductionMatchesMatch, writeReviewMatch, writeReviewReviewTypeMatch } from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

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
          .with({ method: 'POST' }, handleIntroductionMatchesForm)
          .otherwise(showIntroductionMatchesForm),
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

const showIntroductionMatchesForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    introductionMatchesForm(preprint, FormToFieldsE.encode(form), user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showIntroductionMatchesErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: IntroductionMatchesForm) => introductionMatchesForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleIntroductionMatchesForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(decodeFields(introductionMatchesFields)),
    RM.map(updateFormWithFields(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ introductionMatches: P.any }, showIntroductionMatchesErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const introductionMatchesFields = {
  introductionMatches: requiredDecoder(D.literal('yes', 'partly', 'no', 'skip')),
} satisfies FieldDecoders

const updateFormWithFields = (form: Form) => flow(FieldsToFormE.encode, updateForm(form))

const FieldsToFormE: Encoder<Form, ValidFields<typeof introductionMatchesFields>> = {
  encode: fields => ({
    introductionMatches: fields.introductionMatches,
  }),
}

const FormToFieldsE: Encoder<IntroductionMatchesForm, Form> = {
  encode: form => ({
    introductionMatches: E.right(form.introductionMatches),
  }),
}

type IntroductionMatchesForm = Fields<typeof introductionMatchesFields>

function introductionMatchesForm(preprint: PreprintTitle, form: IntroductionMatchesForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${
      error ? 'Error: ' : ''
    }Does the introduction explain the objective and match the rest of the preprint?
 – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back">Back</a>
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
                                    'Select if the introduction explains the objective and matches the rest of the preprint',
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
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.introductionMatches)
                  ? 'aria-invalid="true" aria-errormessage="introduction-matches-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Does the introduction explain the objective and match the rest of the preprint?</h1>
              </legend>

              ${E.isLeft(form.introductionMatches)
                ? html`
                    <div class="error-message" id="introduction-matches-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.introductionMatches.left)
                        .with(
                          { _tag: 'MissingE' },
                          () =>
                            'Select if the introduction explains the objective and matches the rest of the preprint',
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
                      ${match(form.introductionMatches)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
                  <p id="introduction-matches-tip-yes" role="note">
                    The aim is clearly explained, and it matches up with what follows.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      type="radio"
                      value="partly"
                      aria-describedby="introduction-matches-tip-partly"
                      ${match(form.introductionMatches)
                        .with({ right: 'partly' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Partly</span>
                  </label>
                  <p id="introduction-matches-tip-partly" role="note">
                    The introduction either doesn’t adequately explain the aim of the research, or the rest of the
                    preprint doesn’t match up with the introduction.
                  </p>
                </li>
                <li>
                  <label>
                    <input
                      name="introductionMatches"
                      type="radio"
                      value="no"
                      aria-describedby="introduction-matches-tip-no"
                      ${match(form.introductionMatches)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No</span>
                  </label>
                  <p id="introduction-matches-tip-no" role="note">
                    The introduction doesn’t explain the aim of the research or match up with what follows.
                  </p>
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

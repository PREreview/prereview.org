import { Match, Struct, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { StatusCodes } from 'http-status-codes'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form.js'
import { html, plainText, rawHtml } from '../html.js'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../preprint.js'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response.js'
import * as Routes from '../routes.js'
import { writeReviewCompetingInterestsMatch, writeReviewConductMatch, writeReviewMatch } from '../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../shared-translation-elements.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'
import type { User } from '../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from './form.js'
import { backNav, prereviewOfSuffix } from './shared-elements.js'

export const writeReviewConduct = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('locale', () => locale),
          RTE.let('preprint', () => preprint),
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.matchE(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with({ method: 'POST' }, handleCodeOfConductForm)
                .otherwise(({ form }) =>
                  RT.of(codeOfConductForm(preprint, { conduct: E.right(form.conduct) }, locale)),
                ),
          ),
        ),
    ),
  )

const handleCodeOfConductForm = ({
  body,
  form,
  preprint,
  user,
  locale,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RTE.Do,
    RTE.let('conduct', () => pipe(ConductFieldD.decode(body), E.mapLeft(missingE))),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('conduct', fields.conduct),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ conduct: P.any }, form => codeOfConductForm(preprint, form, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const ConductFieldD = pipe(
  D.struct({
    conduct: D.literal('yes'),
  }),
  D.map(Struct.get('conduct')),
)

interface CodeOfConductForm {
  readonly conduct: E.Either<MissingE, 'yes' | undefined>
}
const codeOfConductLink = (text: string) => `<a href="${Routes.CodeOfConduct}">${text}</a>`.toString()

function codeOfConductForm(preprint: PreprintTitle, form: CodeOfConductForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('write-review', 'codeOfConduct')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.conduct) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="conduct-tip"
            ${rawHtml(E.isLeft(form.conduct) ? 'aria-invalid="true" aria-errormessage="conduct-error"' : '')}
          >
            <legend>
              <h1>${t('write-review', 'codeOfConduct')()}</h1>
            </legend>

            <p id="conduct-tip" role="note">
              ${rawHtml(t('write-review', 'expectYouToAbideByCodeOfConduct')({ link: codeOfConductLink }))}
            </p>

            <details>
              <summary><span>${t('write-review', 'examplesOfExpectedBehaviour')()}</span></summary>

              <div>
                <ul>
                  <li>${t('write-review', 'expectedBehaviourLanguage')()}</li>
                  <li>${t('write-review', 'expectedBehaviourFeedback')()}</li>
                  <li>${t('write-review', 'expectedBehaviourRespect')()}</li>
                  <li>${t('write-review', 'expectedBehaviourGracefulAcceptance')()}</li>
                  <li>${t('write-review', 'expectedBehaviourBestOfCommunity')()}</li>
                  <li>${t('write-review', 'expectedBehaviourEmpathy')()}</li>
                </ul>
              </div>
            </details>

            <details>
              <summary><span>${t('write-review', 'examplesOfUnacceptableBehaviour')()}</span></summary>

              <div>
                <ul>
                  <li>${t('write-review', 'unacceptableBehaviourTrollingEtc')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviourUnconstructive')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviourHarassment')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviourPublishingConfidentialInformation')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviourSexualisedLanguage')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviourInappropriate')()}</li>
                </ul>
              </div>
            </details>

            ${E.isLeft(form.conduct)
              ? html`
                  <div class="error-message" id="conduct-error">
                    <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.conduct.left, {
                      MissingE: t('write-review', 'confirmCodeOfConduct'),
                    })}
                  </div>
                `
              : ''}

            <label>
              <input
                name="conduct"
                id="conduct-yes"
                type="checkbox"
                value="yes"
                ${match(form.conduct)
                  .with({ right: 'yes' }, () => 'checked')
                  .otherwise(() => '')}
              />
              <span>${t('write-review', 'iAmFollowingCodeOfConduct')()}</span>
            </label>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    js: error ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: CodeOfConductForm) => html`
  ${E.isLeft(form.conduct)
    ? html`
        <li>
          <a href="#conduct-yes">
            ${Match.valueTags(form.conduct.left, {
              MissingE: translate(locale, 'write-review', 'confirmCodeOfConduct'),
            })}
          </a>
        </li>
      `
    : ''}
`

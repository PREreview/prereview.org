import { Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form.js'
import { html, plainText, rawHtml, sendHtml } from '../html.js'
import { DefaultLocale, type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  codeOfConductMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewMatch,
} from '../routes.js'
import { type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { backNav, errorPrefix, errorSummary, prereviewOfSuffix, saveAndContinueButton } from './shared-elements.js'

export const writeReviewConduct = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.apS('locale', RM.of(DefaultLocale)),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleCodeOfConductForm).otherwise(showCodeOfConductForm),
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

const showCodeOfConductForm = flow(
  RM.fromReaderK(
    ({ form, preprint, user, locale }: { form: Form; preprint: PreprintTitle; user: User; locale: SupportedLocale }) =>
      codeOfConductForm(preprint, { conduct: E.right(form.conduct) }, user, locale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showCodeOfConductErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: CodeOfConductForm) => codeOfConductForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleCodeOfConductForm = ({
  form,
  preprint,
  user,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RM.decodeBody(body => E.right({ conduct: pipe(ConductFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('conduct', fields.conduct),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ conduct: P.any }, showCodeOfConductErrorForm(preprint, user, locale))
        .exhaustive(),
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
const codeOfConductLink = (text: string) =>
  `<a href="${format(codeOfConductMatch.formatter, {})}">${text}</a>`.toString()

function codeOfConductForm(preprint: PreprintTitle, form: CodeOfConductForm, user: User, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale)

  return templatePage({
    title: pipe(
      t('write-review', 'codeOfConductTitle')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>${backNav(locale, format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id }))}</nav>

      <main id="form">
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
                      <span class="visually-hidden">${t('write-review', 'error')()}</span>
                      ${match(form.conduct.left)
                        .with({ _tag: 'MissingE' }, t('write-review', 'confirmCodeOfConduct'))
                        .exhaustive()}
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
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: CodeOfConductForm) => html`
  ${E.isLeft(form.conduct)
    ? html`
        <li>
          <a href="#conduct-yes">
            ${match(form.conduct.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'confirmCodeOfConduct'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`

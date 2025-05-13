import { Match, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { StatusCodes } from 'http-status-codes'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form.js'
import { html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import type { TemplatePageEnv } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import type { PublicUrlEnv } from '../public-url.js'
import { StreamlinePageResponse, handlePageResponse } from '../response.js'
import {
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewReviewMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import type { GetUserOnboardingEnv } from '../user-onboarding.js'
import { type GetUserEnv, type User, getUser } from '../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form.js'
import { prereviewOfSuffix } from './shared-elements.js'

export const writeReviewPersona = flow(
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
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handlePersonaForm).otherwise(showPersonaForm)),
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
  RM.orElseW(
    Match.valueTags({
      PreprintIsNotFound: () => notFound,
      PreprintIsUnavailable: () => serviceUnavailable,
    }),
  ),
)

const showPersonaForm = ({
  form,
  locale,
  preprint,
  user,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(personaForm(preprint, { persona: E.right(form.persona) }, form.reviewType, user, locale))),
    RM.ichainW(handlePageResponse),
  )

const showPersonaErrorForm = ({
  form,
  preprint,
  user,
  originalForm,
  locale,
}: {
  form: PersonaForm
  preprint: PreprintTitle
  user: User
  originalForm: Form
  locale: SupportedLocale
}) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('locale', RM.of(locale)),
    RM.apS('response', RM.of(personaForm(preprint, form, originalForm.reviewType, user, locale))),
    RM.ichainW(handlePageResponse),
  )

const handlePersonaForm = ({
  form,
  locale,
  preprint,
  user,
}: {
  form: Form
  locale: SupportedLocale
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.decodeBody(body => E.right({ persona: pipe(PersonaFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('persona', fields.persona),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.id)),
    RM.orElseW(error =>
      match(error)
        .returnType<
          RM.ReaderMiddleware<
            GetUserEnv & GetUserOnboardingEnv & { locale: SupportedLocale } & PublicUrlEnv & TemplatePageEnv,
            StatusOpen,
            ResponseEnded,
            never,
            void
          >
        >()
        .with('form-unavailable', () => serviceUnavailable)
        .with({ persona: P.any }, thisForm =>
          showPersonaErrorForm({ form: thisForm, preprint, user, originalForm: form, locale }),
        )
        .exhaustive(),
    ),
  )

const PersonaFieldD = pipe(
  D.struct({
    persona: D.literal('public', 'pseudonym'),
  }),
  D.map(Struct.get('persona')),
)

interface PersonaForm {
  readonly persona: E.Either<MissingE, 'public' | 'pseudonym' | undefined>
}

function personaForm(
  preprint: PreprintTitle,
  form: PersonaForm,
  reviewType: 'freeform' | 'questions' | undefined,
  user: User,
  locale: SupportedLocale,
) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(t('whatNameToUse')(), prereviewOfSuffix(locale, preprint.title), errorPrefix(locale, error), plainText),
    nav: html`
      <a
        href="${format(
          (reviewType === 'questions' ? writeReviewReadyFullReviewMatch : writeReviewReviewMatch).formatter,
          {
            id: preprint.id,
          },
        )}"
        class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.persona)
                    ? html`
                        <li>
                          <a href="#persona-public">
                            ${Match.valueTags(form.persona.left, {
                              MissingE: () => t('selectTheNameError')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.persona) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="persona-tip"
            ${rawHtml(E.isLeft(form.persona) ? 'aria-invalid="true" aria-errormessage="persona-error"' : '')}
          >
            <legend>
              <h1>${t('whatNameToUse')()}</h1>
            </legend>

            <p id="persona-tip" role="note">${t('youCanChooseBetweenNames')()}</p>

            <details>
              <summary><span>${t('whatIsAPseudonym')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    t('pseudonymIsA')({
                      term: text => html`<dfn>${text}</dfn>`.toString(),
                      pseudonym: user.pseudonym.replace(' ', ' '),
                    }),
                  )}
                </p>

                <p>${t('pseudonymAccountability')()}</p>
              </div>
            </details>

            ${E.isLeft(form.persona)
              ? html`
                  <div class="error-message" id="persona-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.persona.left, {
                      MissingE: () => t('selectTheNameError')(),
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="persona"
                    id="persona-public"
                    type="radio"
                    value="public"
                    aria-describedby="persona-tip-public"
                    ${match(form.persona)
                      .with({ right: 'public' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${user.name}</span>
                </label>
                <p id="persona-tip-public" role="note">${t('linkToOrcidId')()}</p>
              </li>
              <li>
                <label>
                  <input
                    name="persona"
                    type="radio"
                    value="pseudonym"
                    aria-describedby="persona-tip-pseudonym"
                    ${match(form.persona)
                      .with({ right: 'pseudonym' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${user.pseudonym}</span>
                </label>
                <p id="persona-tip-pseudonym" role="note">${t('linkToPseudonym')()}</p>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: error ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

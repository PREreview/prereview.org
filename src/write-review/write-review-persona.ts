import { Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError, missingE } from '../form.js'
import { html, plainText, rawHtml, sendHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware.js'
import { templatePage } from '../page.js'
import { type PreprintTitle, getPreprintTitle } from '../preprint.js'
import {
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewReviewMatch,
} from '../routes.js'
import { errorPrefix } from '../shared-translation-elements.js'
import { type User, getUser } from '../user.js'
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
  RM.orElseW(error =>
    match(error)
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showPersonaForm = flow(
  RM.fromReaderK(
    ({ form, locale, preprint, user }: { form: Form; locale: SupportedLocale; preprint: PreprintTitle; user: User }) =>
      personaForm(preprint, { persona: E.right(form.persona) }, form.reviewType, user, locale),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showPersonaErrorForm = (preprint: PreprintTitle, user: User, originalForm: Form, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: PersonaForm) => personaForm(preprint, form, originalForm.reviewType, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
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
        .with('form-unavailable', () => serviceUnavailable)
        .with({ persona: P.any }, showPersonaErrorForm(preprint, user, form, locale))
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

  return templatePage({
    title: pipe(t('whatNameToUse')(), prereviewOfSuffix(locale, preprint.title), errorPrefix(locale, error), plainText),
    content: html`
      <nav>
        <a
          href="${format(
            (reviewType === 'questions' ? writeReviewReadyFullReviewMatch : writeReviewReviewMatch).formatter,
            {
              id: preprint.id,
            },
          )}"
          class="back"
          ><span>${t('back')()}</span></a
        >
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">${t('thereIsAProblem')()}</h2>
                  <ul>
                    ${E.isLeft(form.persona)
                      ? html`
                          <li>
                            <a href="#persona-public">
                              ${match(form.persona.left)
                                .with({ _tag: 'MissingE' }, () => t('selectTheNameError')())
                                .exhaustive()}
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
                      <span class="visually-hidden">${t('error')()}:</span>
                      ${match(form.persona.left)
                        .with({ _tag: 'MissingE' }, () => t('selectTheNameError')())
                        .exhaustive()}
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

          <button>${t('saveAndContinueButton')()}</button>
        </form>
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    locale,
    user,
  })
}

import { Either, Match, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import { errorPrefix } from '../../shared-translation-elements.js'
import type { Uuid } from '../../types/index.js'
import type { User } from '../../user.js'
import type * as ChoosePersonaForm from './ChoosePersonaForm.js'

export const ChoosePersonaPage = ({
  commentId,
  form,
  locale,
  user,
}: {
  commentId: Uuid.Uuid
  form: ChoosePersonaForm.ChoosePersonaForm
  locale: SupportedLocale
  user: User
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      translate(locale, 'write-comment-flow', 'whatNameTitle')(),
      errorPrefix(locale, form._tag === 'InvalidForm'),
      plainText,
    ),
    nav: html`
      <a href="${Routes.WriteCommentEnterComment.href({ commentId })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteCommentChoosePersona.href({ commentId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${Either.isLeft(form.persona)
                    ? html`
                        <li>
                          <a href="#persona-public">
                            ${pipe(
                              Match.value(form.persona.left),
                              Match.tag('Missing', () => translate(locale, 'write-comment-flow', 'errorSelectName')()),
                              Match.exhaustive,
                            )}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            aria-describedby="persona-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.persona)
                ? 'aria-invalid="true" aria-errormessage="persona-error"'
                : '',
            )}
          >
            <legend>
              <h1>${translate(locale, 'write-comment-flow', 'whatNameTitle')()}</h1>
            </legend>

            <p id="persona-tip" role="note">${translate(locale, 'write-comment-flow', 'whichNameTip')()}</p>

            <details>
              <summary><span>${translate(locale, 'write-comment-flow', 'whatIsPseudonym')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    translate(
                      locale,
                      'write-comment-flow',
                      'whatIsPseudonymDefinition',
                    )({
                      pseudonym: user.pseudonym.replace(' ', '&nbsp;'),
                      term: text => html`<dfn>${text}</dfn>`.toString(),
                    }),
                  )}
                </p>

                <p>${translate(locale, 'write-comment-flow', 'whatIsPseudonymAccountability')()}</p>
              </div>
            </details>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.persona)
              ? html`
                  <div class="error-message" id="persona-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${pipe(
                      Match.value(form.persona.left),
                      Match.tag('Missing', () => translate(locale, 'write-comment-flow', 'errorSelectName')()),
                      Match.exhaustive,
                    )}
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
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', persona: persona => persona === 'public' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>${user.name}</span>
                </label>
                <p id="persona-tip-public" role="note">${translate(locale, 'write-comment-flow', 'linkToOrcidId')()}</p>
              </li>
              <li>
                <label>
                  <input
                    name="persona"
                    type="radio"
                    value="pseudonym"
                    aria-describedby="persona-tip-pseudonym"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        { _tag: 'CompletedForm', persona: persona => persona === 'pseudonym' },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>${user.pseudonym}</span>
                </label>
                <p id="persona-tip-pseudonym" role="note">
                  ${translate(locale, 'write-comment-flow', 'linkToPseudonym')()}
                </p>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteCommentChoosePersona.href({ commentId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
  })

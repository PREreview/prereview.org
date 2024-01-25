import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type MissingE, hasAnError } from '../../form'
import { html, plainText, rawHtml } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { authorInvitePersonaMatch } from '../../routes'
import type { User } from '../../user'

export interface PersonaForm {
  readonly persona: E.Either<MissingE, 'public' | 'pseudonym' | undefined>
}

export function personaForm({ form, inviteId, user }: { form: PersonaForm; inviteId: Uuid; user: User }) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}What name would you like to use?`,
    main: html`
      <form method="post" action="${format(authorInvitePersonaMatch.formatter, { id: inviteId })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.persona)
                    ? html`
                        <li>
                          <a href="#persona-public">
                            ${match(form.persona.left)
                              .with({ _tag: 'MissingE' }, () => 'Select the name that you would like to use')
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
              <h1>What name would you like to use?</h1>
            </legend>

            <p id="persona-tip" role="note">
              You can choose between the name on your ORCID&nbsp;profile or your PREreview&nbsp;pseudonym.
            </p>

            <details>
              <summary><span>What is a PREreview&nbsp;pseudonym?</span></summary>

              <div>
                <p>
                  A <dfn>PREreview&nbsp;pseudonym</dfn> is an alternate name you can use instead of your real&nbsp;name.
                  It is unique and combines a random color and animal. Your pseudonym is
                  ‘${rawHtml(user.pseudonym.replace(' ', '&nbsp;'))}.’
                </p>

                <p>
                  Using your pseudonym, you can contribute to open preprint review without fearing retribution or
                  judgment that may occur when using your real name. However, using a pseudonym retains an element of
                  accountability.
                </p>
              </div>
            </details>

            ${E.isLeft(form.persona)
              ? html`
                  <div class="error-message" id="persona-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.persona.left)
                      .with({ _tag: 'MissingE' }, () => 'Select the name that you would like to use')
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
                <p id="persona-tip-public" role="note">We’ll link your PREreview to your ORCID&nbsp;iD.</p>
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
                <p id="persona-tip-pseudonym" role="note">
                  We’ll only link your PREreview to others that also use your pseudonym.
                </p>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}

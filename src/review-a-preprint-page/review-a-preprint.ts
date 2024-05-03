import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import type { InvalidE } from '../form'
import { html, plainText, rawHtml } from '../html'
import { PageResponse } from '../response'
import { homeMatch, reviewAPreprintMatch } from '../routes'

export type SubmittedWhichPreprint = E.Either<InvalidE, Doi>
export type UnsubmittedWhichPreprint = E.Right<undefined>
export type WhichPreprint = SubmittedWhichPreprint | UnsubmittedWhichPreprint

export const createPage = (whichPreprint: WhichPreprint) => {
  const error = E.isLeft(whichPreprint)

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Which preprint are you reviewing?`,
    nav: html`<a href="${format(homeMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(reviewAPreprintMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(whichPreprint)
                    ? html`
                        <li>
                          <a href="#preprint">
                            ${match(whichPreprint.left)
                              .with({ _tag: 'InvalidE' }, () => 'Enter the preprint DOI or URL')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(whichPreprint) ? 'class="error"' : '')}>
          <h1><label id="preprint-label" for="preprint">Which preprint are you reviewing?</label></h1>

          <p id="preprint-tip" role="note">Use the preprint DOI or URL.</p>

          <details>
            <summary><span>What is a DOI?</span></summary>

            <div>
              <p>
                A <a href="https://www.doi.org/"><dfn>DOI</dfn></a> is a unique identifier that you can find on many
                preprints. For example, <q class="select-all" translate="no">10.1101/2022.10.06.511170</q> or
                <q class="select-all" translate="no">https://doi.org/10.1101/2022.10.06.511170</q>.
              </p>
            </div>
          </details>

          ${error
            ? html`
                <div class="error-message" id="preprint-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(whichPreprint.left)
                    .with({ _tag: 'InvalidE' }, () => 'Enter the preprint DOI or URL')
                    .exhaustive()}
                </div>
              `
            : ''}

          <input
            id="preprint"
            name="preprint"
            type="text"
            size="60"
            spellcheck="false"
            aria-describedby="preprint-tip"
            ${match(whichPreprint)
              .with({ right: P.select(P.string) }, value => html`value="${value}"`)
              .with({ left: { actual: P.select() } }, value => html`value="${value}"`)
              .otherwise(() => '')}
            ${rawHtml(E.isLeft(whichPreprint) ? 'aria-invalid="true" aria-errormessage="preprint-error"' : '')}
          />
        </div>

        <button>Continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(reviewAPreprintMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}

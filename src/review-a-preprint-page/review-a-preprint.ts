import type { Doi } from 'doi-ts'
import { identity } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import type { InvalidE } from '../form.js'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { homeMatch, reviewAPreprintMatch } from '../routes.js'

export type SubmittedWhichPreprint = E.Either<InvalidE, Doi>
export type UnsubmittedWhichPreprint = E.Right<undefined>
export type WhichPreprint = SubmittedWhichPreprint | UnsubmittedWhichPreprint

export const createPage = (whichPreprint: WhichPreprint, locale: SupportedLocale) => {
  const error = E.isLeft(whichPreprint)
  const t = translate(locale)

  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText(t('review-a-preprint', 'whichPreprint')({ error: error ? identity : () => '' })),
    nav: html`<a href="${format(homeMatch.formatter, {})}" class="back"
      ><span>${t('review-a-preprint', 'back')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(reviewAPreprintMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${t('review-a-preprint', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(whichPreprint)
                    ? html`
                        <li>
                          <a href="#preprint">
                            ${match(whichPreprint.left)
                              .with({ _tag: 'InvalidE' }, () =>
                                t('review-a-preprint', 'errorEnterPreprint')({ error: () => '' }),
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

        <div ${rawHtml(E.isLeft(whichPreprint) ? 'class="error"' : '')}>
          <h1>
            <label id="preprint-label" for="preprint"
              >${t('review-a-preprint', 'whichPreprint')({ error: () => '' })}</label
            >
          </h1>

          <p id="preprint-tip" role="note">${t('review-a-preprint', 'useDoiUrl')()}</p>

          <details>
            <summary><span>${t('review-a-preprint', 'whatIsDoi')()}</span></summary>

            <div>
              <p>
                ${rawHtml(
                  t(
                    'review-a-preprint',
                    'whatIsDoiText',
                  )({
                    doi: text => html`<a href="https://www.doi.org/"><dfn>${text}</dfn></a>`.toString(),
                    example: html`<q class="select-all" translate="no">10.1101/2022.10.06.511170</q>`.toString(),
                    exampleUrl: html`<q class="select-all" translate="no"
                      >https://doi.org/10.1101/2022.10.06.511170</q
                    >`.toString(),
                  }),
                )}
              </p>
            </div>
          </details>

          ${error
            ? html`
                <div class="error-message" id="preprint-error">
                  ${match(whichPreprint.left)
                    .with({ _tag: 'InvalidE' }, () =>
                      rawHtml(t('review-a-preprint', 'errorEnterPreprint')({ error: visuallyHidden })),
                    )
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

        <button>${t('review-a-preprint', 'continueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(reviewAPreprintMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}

const visuallyHidden = (s: string) => html`<span class="visually-hidden">${s}</span>`.toString()

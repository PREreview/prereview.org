import { isDoi } from 'doi-ts'
import { Array, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { Preprint } from '../../../Preprints/index.ts'
import * as PreprintServers from '../../../PreprintServers/index.ts'
import { preprintReviewsMatch, writeReviewMatch, writeReviewStartMatch } from '../../../routes.ts'
import { renderDate } from '../../../time.ts'
import type { User } from '../../../user.ts'
import { PageResponse } from '../../Response/index.ts'

export const startPage = (preprint: Preprint, locale: SupportedLocale, user?: User) =>
  PageResponse({
    title: plainText(translate(locale, 'write-review', 'writeAPrereview')()),
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'write-review', 'backToPreprint')()}</span></a
      >
    `,
    main: html`
      <h1>${translate(locale, 'write-review', 'writeAPrereview')()}</h1>

      <article class="preview" tabindex="0" aria-labelledby="preprint-title">
        <header>
          <h2
            lang="${preprint.title.language}"
            dir="${rtlDetect.getLangDir(preprint.title.language)}"
            id="preprint-title"
          >
            ${preprint.title.text}
          </h2>

          <div class="byline">
            ${rawHtml(
              translate(
                locale,
                'write-review',
                'authoredBy',
              )({
                authors: pipe(
                  preprint.authors,
                  Array.map(author => author.name),
                  formatList(locale),
                ).toString(),
                ...visuallyHidden,
              }),
            )}
          </div>

          <dl>
            <div>
              <dt>${translate(locale, 'write-review', 'posted')()}</dt>
              <dd>${renderDate(locale)(preprint.posted)}</dd>
            </div>
            <div>
              <dt>${translate(locale, 'write-review', 'server')()}</dt>
              <dd>${PreprintServers.getName(preprint.id)}</dd>
            </div>
            ${match(preprint.id)
              .with(
                { _tag: 'PhilsciPreprintId' },
                id => html`
                  <div>
                    <dt>${translate(locale, 'write-review', 'itemId')()}</dt>
                    <dd>${id.value}</dd>
                  </div>
                `,
              )
              .with(
                { value: P.when(isDoi) },
                id => html`
                  <div>
                    <dt>DOI</dt>
                    <dd class="doi" translate="no">${id.value}</dd>
                  </div>
                `,
              )
              .exhaustive()}
          </dl>
        </header>

        ${preprint.abstract
          ? html`
              <div lang="${preprint.abstract.language}" dir="${rtlDetect.getLangDir(preprint.abstract.language)}">
                ${fixHeadingLevels(2, preprint.abstract.text)}
              </div>
            `
          : ''}
      </article>

      <p>
        ${rawHtml(
          translate(
            locale,
            'write-review',
            'youCanWriteAPrereview',
          )({
            preprintTitle: html`<cite
              lang="${preprint.title.language}"
              dir="${rtlDetect.getLangDir(preprint.title.language)}"
              >${preprint.title.text}</cite
            >`.toString(),
          }),
        )}
      </p>

      ${user
        ? ''
        : html`
            <h2>${translate(locale, 'write-review', 'beforeStartHeading')()}</h2>

            <p>${translate(locale, 'write-review', 'orcidLogIn')()}</p>

            <details>
              <summary><span>${translate(locale, 'write-review', 'whatIsOrcidHeading')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    translate(
                      locale,
                      'write-review',
                      'whatIsOrcid',
                    )({ link: text => html`<a href="https://orcid.org/"><dfn>${text}</dfn></a>`.toString() }),
                  )}
                </p>
              </div>
            </details>
          `}

      <a href="${format(writeReviewStartMatch.formatter, { id: preprint.id })}" role="button" draggable="false"
        >${translate(locale, 'forms', 'startButton')()}</a
      >
    `,
    canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
  })

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

const visuallyHidden: { visuallyHidden: (x: string) => string } = {
  visuallyHidden: s => html`<span class="visually-hidden">${s}</span>`.toString(),
}

import { Array, Boolean, flow, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { Prereview } from '../../../Prereviews/index.ts'
import * as Routes from '../../../routes.ts'
import { renderDate } from '../../../time.ts'
import { PageResponse } from '../../Response/index.ts'

export const WriteCommentPage = ({
  prereview,
  locale,
  isLoggedIn,
}: {
  prereview: Prereview
  locale: SupportedLocale
  isLoggedIn: boolean
}) => {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('write-comment-flow', 'writeCommentTitle')()),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereview.id })}" class="back"
        >${t('write-comment-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <h1>${t('write-comment-flow', 'writeCommentTitle')()}</h1>

      <article class="preview" tabindex="0" aria-labelledby="prereview-title">
        <header>
          <h2 id="prereview-title">
            ${t(
              'review-page',
              prereview.structured ? 'structuredReviewTitle' : 'reviewTitle',
            )({
              preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
                >${prereview.preprint.title}</cite
              >`,
            })}
          </h2>

          <div class="byline">
            ${
              prereview.club
                ? t(
                    'review-page',
                    'clubReviewAuthors',
                  )({
                    authors: pipe(
                      Array.map(prereview.authors.named, author => html`<bdi>${author.name}</bdi>`),
                      Array.appendAll(
                        prereview.authors.anonymous > 0
                          ? [t('review-page', 'otherAuthors')({ otherAuthors: prereview.authors.anonymous })]
                          : [],
                      ),
                      formatList(locale),
                    ),
                    club: html`<span ${languageAttributesFor(prereview.club.language)}>${prereview.club.name}</span>`,
                    hide: text => html`<span class="visually-hidden">${text}</span>`,
                  })
                : t(
                    'review-page',
                    'reviewAuthors',
                  )({
                    authors: pipe(
                      Array.map(prereview.authors.named, author => html`<bdi>${author.name}</bdi>`),
                      Array.appendAll(
                        prereview.authors.anonymous > 0
                          ? [t('review-page', 'otherAuthors')({ otherAuthors: prereview.authors.anonymous })]
                          : [],
                      ),
                      formatList(locale),
                    ),
                    hide: text => html`<span class="visually-hidden">${text}</span>`,
                  })
            }
          </div>

          <dl>
            <div>
              <dt>${t('review-page', 'published')()}</dt>
              <dd>${renderDate(locale)(prereview.published)}</dd>
            </div>
            <div>
              <dt translate="no">DOI</dt>
              <dd class="doi" dir="auto" translate="no">${prereview.doi}</dd>
            </div>
            <div>
              <dt>${t('review-page', 'license')()}</dt>
              <dd>
                ${pipe(
                  Match.value(prereview.license),
                  Match.when(
                    'CC0-1.0',
                    () => html`
                      <dfn>
                        <abbr title="${translate(locale, 'review-page', 'licenseCcZero10')()}"
                          ><bdi translate="no">CC0 1.0</bdi></abbr
                        >
                      </dfn>
                    `,
                  ),
                  Match.when(
                    'CC-BY-4.0',
                    () => html`
                      <dfn>
                        <abbr title="${t('review-page', 'licenseCcBy40')()}"><bdi translate="no">CC BY 4.0</bdi></abbr>
                      </dfn>
                    `,
                  ),
                  Match.exhaustive,
                )}
              </dd>
            </div>
          </dl>
        </header>

        <div ${prereview.language ? languageAttributesFor(prereview.language) : ''}>
          ${fixHeadingLevels(2, prereview.text)}
        </div>
      </article>

      <p>
        ${t(
          'write-comment-flow',
          'youCanWrite',
        )({
          preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
            >${prereview.preprint.title}</cite
          >`,
        })}
      </p>

      ${Boolean.match(isLoggedIn, {
        onTrue: () => '',
        onFalse: () => html`
          <h2>${t('write-comment-flow', 'beforeStartHeading')()}</h2>

          <p>${t('write-comment-flow', 'orcidLogIn')()}</p>

          <details>
            <summary>${t('write-comment-flow', 'whatIsOrcidHeading')()}</summary>

            <div>
              <p>
                ${t(
                  'write-comment-flow',
                  'whatIsOrcid',
                )({ link: text => html`<a href="https://orcid.org/"><dfn>${text}</dfn></a>` })}
              </p>
            </div>
          </details>
        `,
      })}

      <a href="${Routes.WriteCommentStartNow.href({ id: prereview.id })}" role="button" draggable="false"
        >${t('forms', 'startButton')()}</a
      >
    `,
    canonical: Routes.WriteComment.href({ id: prereview.id }),
  })
}

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

import { Array, flow, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { getClubName } from '../../Clubs/index.ts'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type { Prereview } from '../../Prereview.ts'
import { PageResponse } from '../../response.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import type { User } from '../../user.ts'

export const WriteCommentPage = ({
  prereview,
  locale,
  user,
}: {
  prereview: Prereview
  locale: SupportedLocale
  user?: User
}) => {
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('write-comment-flow', 'writeCommentTitle')()),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereview.id })}" class="back"
        ><span>${t('write-comment-flow', 'backToPrereview')()}</span></a
      >
    `,
    main: html`
      <h1>${t('write-comment-flow', 'writeCommentTitle')()}</h1>

      <article class="preview" tabindex="0" aria-labelledby="prereview-title">
        <header>
          <h2 id="prereview-title">
            ${rawHtml(
              t(
                'review-page',
                prereview.structured ? 'structuredReviewTitle' : 'reviewTitle',
              )({
                preprint: html`<cite
                  lang="${prereview.preprint.language}"
                  dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                  >${prereview.preprint.title}</cite
                >`.toString(),
              }),
            )}
          </h2>

          <div class="byline">
            ${rawHtml(
              prereview.club
                ? t(
                    'review-page',
                    'clubReviewAuthors',
                  )({
                    authors: pipe(
                      Array.map(prereview.authors.named, author => author.name),
                      Array.appendAll(
                        prereview.authors.anonymous > 0
                          ? [t('review-page', 'otherAuthors')({ otherAuthors: prereview.authors.anonymous })]
                          : [],
                      ),
                      formatList(locale),
                    ).toString(),
                    club: getClubName(prereview.club),
                    hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                  })
                : t(
                    'review-page',
                    'reviewAuthors',
                  )({
                    authors: pipe(
                      Array.map(prereview.authors.named, author => author.name),
                      Array.appendAll(
                        prereview.authors.anonymous > 0
                          ? [t('review-page', 'otherAuthors')({ otherAuthors: prereview.authors.anonymous })]
                          : [],
                      ),
                      formatList(locale),
                    ).toString(),
                    hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                  }),
            )}
          </div>

          <dl>
            <div>
              <dt>${t('review-page', 'published')()}</dt>
              <dd>${renderDate(locale)(prereview.published)}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi" translate="no">${prereview.doi}</dd>
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
                        <abbr title="CC0 1.0 Universal"><span translate="no">CC0 1.0</span></abbr>
                      </dfn>
                    `,
                  ),
                  Match.when(
                    'CC-BY-4.0',
                    () => html`
                      <dfn>
                        <abbr title="${t('review-page', 'licenseCcBy40')()}"
                          ><span translate="no">CC BY 4.0</span></abbr
                        >
                      </dfn>
                    `,
                  ),
                  Match.exhaustive,
                )}
              </dd>
            </div>
          </dl>
        </header>

        <div
          ${prereview.language
            ? html`lang="${prereview.language}" dir="${rtlDetect.getLangDir(prereview.language)}"`
            : ''}
        >
          ${fixHeadingLevels(2, prereview.text)}
        </div>
      </article>

      <p>
        ${rawHtml(
          t(
            'write-comment-flow',
            'youCanWrite',
          )({
            preprint: html`<cite
              lang="${prereview.preprint.language}"
              dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
              >${prereview.preprint.title}</cite
            >`.toString(),
          }),
        )}
      </p>

      ${user
        ? ''
        : html`
            <h2>${t('write-comment-flow', 'beforeStartHeading')()}</h2>

            <p>${t('write-comment-flow', 'orcidLogIn')()}</p>

            <details>
              <summary><span>${t('write-comment-flow', 'whatIsOrcidHeading')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    t(
                      'write-comment-flow',
                      'whatIsOrcid',
                    )({ link: text => html`<a href="https://orcid.org/"><dfn>${text}</dfn></a>`.toString() }),
                  )}
                </p>
              </div>
            </details>
          `}

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

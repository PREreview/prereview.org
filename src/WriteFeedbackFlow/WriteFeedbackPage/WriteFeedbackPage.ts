import { Array, flow, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { getClubName } from '../../club-details.js'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { Prereview } from '../../Prereview.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import { renderDate } from '../../time.js'
import type { User } from '../../user.js'

export const WriteFeedbackPage = ({
  prereview,
  locale,
  user,
}: {
  prereview: Prereview
  locale: SupportedLocale
  user?: User
}) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-comment-flow', 'writeCommentTitle')()),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereview.id })}" class="back"
        >${translate(locale, 'write-comment-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <h1>${translate(locale, 'write-comment-flow', 'writeCommentTitle')()}</h1>

      <article class="preview" tabindex="0" aria-labelledby="prereview-title">
        <header>
          <h2 id="prereview-title">
            ${rawHtml(
              translate(
                locale,
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
                ? translate(
                    locale,
                    'review-page',
                    'clubReviewAuthors',
                  )({
                    authors: pipe(
                      Array.map(prereview.authors.named, author => author.name),
                      Array.appendAll(
                        prereview.authors.anonymous > 0
                          ? [
                              translate(
                                locale,
                                'review-page',
                                'otherAuthors',
                              )({ otherAuthors: prereview.authors.anonymous }),
                            ]
                          : [],
                      ),
                      formatList(locale),
                    ).toString(),
                    club: getClubName(prereview.club),
                    hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                  })
                : translate(
                    locale,
                    'review-page',
                    'reviewAuthors',
                  )({
                    authors: pipe(
                      Array.map(prereview.authors.named, author => author.name),
                      Array.appendAll(
                        prereview.authors.anonymous > 0
                          ? [
                              translate(
                                locale,
                                'review-page',
                                'otherAuthors',
                              )({ otherAuthors: prereview.authors.anonymous }),
                            ]
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
              <dt>${translate(locale, 'review-page', 'published')()}</dt>
              <dd>${renderDate(locale)(prereview.published)}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi" translate="no">${prereview.doi}</dd>
            </div>
            <div>
              <dt>${translate(locale, 'review-page', 'license')()}</dt>
              <dd>
                ${pipe(
                  Match.value(prereview.license),
                  Match.when(
                    'CC-BY-4.0',
                    () => html`
                      <dfn>
                        <abbr title="${translate(locale, 'review-page', 'licenseCcBy40')()}"
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
          translate(
            locale,
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
            <h2>${translate(locale, 'write-comment-flow', 'beforeStartHeading')()}</h2>

            <p>${translate(locale, 'write-comment-flow', 'orcidLogIn')()}</p>

            <details>
              <summary><span>${translate(locale, 'write-comment-flow', 'whatIsOrcidHeading')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    translate(
                      locale,
                      'write-comment-flow',
                      'whatIsOrcid',
                    )({ link: text => html`<a href="https://orcid.org/"><dfn>${text}</dfn></a>`.toString() }),
                  )}
                </p>
              </div>
            </details>
          `}

      <a href="${Routes.WriteFeedbackStartNow.href({ id: prereview.id })}" role="button" draggable="false"
        >${translate(locale, 'write-comment-flow', 'startNowButton')()}</a
      >
    `,
    canonical: Routes.WriteFeedback.href({ id: prereview.id }),
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

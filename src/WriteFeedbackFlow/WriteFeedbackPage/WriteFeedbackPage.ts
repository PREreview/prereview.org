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
    title: plainText`Write feedback`,
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereview.id })}" class="back">Back to PREreview</a>
    `,
    main: html`
      <h1>Write feedback</h1>

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
        You can write feedback on this PREreview of
        <cite lang="${prereview.preprint.language}" dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
          >${prereview.preprint.title}</cite
        >.
      </p>

      ${user
        ? ''
        : html`
            <h2>Before you start</h2>

            <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

            <details>
              <summary><span>What is an ORCID&nbsp;iD?</span></summary>

              <div>
                <p>
                  An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a unique identifier that distinguishes
                  you from everyone with the same or similar name.
                </p>
              </div>
            </details>
          `}

      <a role="button" draggable="false">Start now</a>
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

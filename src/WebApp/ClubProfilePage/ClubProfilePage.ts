import { Array, flow, Match, pipe, String } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import type { Club, ClubId } from '../../Clubs/index.ts'
import { html, plainText, rawHtml, type Html } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import assets from '../../manifest.json' with { type: 'json' }
import * as PreprintServers from '../../PreprintServers/index.ts'
import type * as Prereviews from '../../Prereviews/index.ts'
import * as Routes from '../../routes.ts'
import { profileMatch, reviewMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { ProfileId } from '../../types/index.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import { PageResponse } from '../Response/index.ts'

export function createPage({
  club,
  id,
  prereviews,
  locale,
}: {
  club: Club
  id: ClubId
  prereviews: ReadonlyArray<Prereviews.RecentPreprintPrereview>
  locale: SupportedLocale
}) {
  return PageResponse({
    title: plainText`${club.name}`,
    main: html`
      <h1>${club.name}</h1>

      ${pipe(
        Match.value(id),
        Match.when(
          String.startsWith('asapbio-'),
          () => html`
            <img src="${assets['asapbio.svg']}" width="1851" height="308" alt="ASAPbio" class="club-logo" />
          `,
        ),
        Match.when(
          'jmir-publications',
          () => html`
            <a href="https://jmirpublications.com/"
              ><img src="${assets['jmir.svg']}" width="537" height="86" alt="JMIR Publications" class="club-logo"
            /></a>
          `,
        ),
        Match.orElse(() => ''),
      )}
      ${club.description}

      <dl>
        <dt>${translate(locale, 'club-profile-page', 'clubLeads')()}</dt>
        <dd>
          ${pipe(
            club.leads,
            Array.map(
              lead =>
                html`<a
                  href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(lead.orcid) })}"
                  class="orcid"
                  >${lead.name}</a
                >`,
            ),
            formatList(locale),
          )}
        </dd>
      </dl>

      ${club.contact
        ? html`<a href="mailto:${club.contact}" class="button"
            >${translate(locale, 'club-profile-page', 'contactClub')()}</a
          >`
        : ''}
      ${club.joinLink
        ? html`<a href="${club.joinLink.href}" class="button"
            >${translate(locale, 'club-profile-page', 'joinClub')()}</a
          > `
        : ''}

      <h2>${translate(locale, 'club-profile-page', 'prereviews')()}</h2>

      ${Array.match(prereviews, {
        onEmpty: () => html`
          <div class="inset">
            <p>${translate(locale, 'club-profile-page', 'noResults')({ name: club.name })}</p>

            <p>${translate(locale, 'club-profile-page', 'appearHere')()}</p>
          </div>
        `,
        onNonEmpty: prereviews => html`
          <ol class="cards">
            ${prereviews.map(
              prereview => html`
                <li>
                  <article>
                    <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                      ${rawHtml(
                        translate(
                          locale,
                          'reviews-list',
                          'reviewText',
                        )({
                          numberOfReviewers: prereview.reviewers.named.length + prereview.reviewers.anonymous,
                          reviewers: pipe(
                            prereview.reviewers.named,
                            Array.appendAll(
                              prereview.reviewers.anonymous > 0
                                ? [
                                    translate(
                                      locale,
                                      'reviews-list',
                                      'otherAuthors',
                                    )({ number: prereview.reviewers.anonymous }),
                                  ]
                                : [],
                            ),
                            Array.map(name => html`<b>${name}</b>`),
                            formatList(locale),
                            list => list.toString(),
                          ),
                          preprint: html`
                            <cite
                              dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                              lang="${prereview.preprint.language}"
                              >${prereview.preprint.title}</cite
                            >
                          `.toString(),
                        }),
                      )}
                    </a>

                    ${prereview.subfields.length > 0
                      ? html`
                          <ul class="categories">
                            ${prereview.subfields.map(
                              subfield => html`<li><span>${getSubfieldName(subfield, locale)}</span></li>`,
                            )}
                          </ul>
                        `
                      : ''}

                    <dl>
                      <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                      <dd>${renderDate(locale)(prereview.published)}</dd>
                      <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                      <dd>${PreprintServers.getName(prereview.preprint.id)}</dd>
                    </dl>
                  </article>
                </li>
              `,
            )}
          </ol>
        `,
      })}
    `,
    canonical: Routes.ClubProfile.href({ id }),
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

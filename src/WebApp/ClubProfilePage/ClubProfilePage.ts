import { Array, flow, Match, pipe, String } from 'effect'
import { format } from 'fp-ts-routing'
import type { Club, ClubId } from '../../Clubs/index.ts'
import { html, plainText, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import assets from '../../manifest.json' with { type: 'json' }
import * as Preprints from '../../Preprints/index.ts'
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
      <h1 dir="auto">${club.name}</h1>

      ${pipe(
        Match.value(id),
        Match.when(
          String.startsWith('asapbio-'),
          () => html`
            <img
              src="${assets['asapbio.svg'].path}"
              width="${assets['asapbio.svg'].width}"
              height="${assets['asapbio.svg'].height}"
              alt="ASAPbio"
              class="club-logo"
            />
          `,
        ),
        Match.when(
          'jmir-publications',
          () => html`
            <a href="https://jmirpublications.com/"
              ><img
                src="${assets['jmir.svg'].path}"
                width="${assets['jmir.svg'].width}"
                height="${assets['jmir.svg'].height}"
                alt="JMIR Publications"
                class="club-logo"
            /></a>
          `,
        ),
        Match.when(
          'kone-consult',
          () =>
            html`<img
              src="${assets['kone-consult.svg'].path}"
              width="${assets['kone-consult.svg'].width}"
              height="${assets['kone-consult.svg'].height}"
              alt=""
              class="club-logo"
            />`,
        ),
        Match.when(
          'translate-science',
          () =>
            html`<img
              src="${assets['translate-science.png'].path}"
              width="${assets['translate-science.png'].width}"
              height="${assets['translate-science.png'].height}"
              alt=""
              class="club-logo"
            />`,
        ),
        Match.orElse(() => ''),
      )}

      <div ${languageAttributesFor(club.description.language)}>${club.description.text}</div>

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
                  dir="auto"
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
            <p>${translate(locale, 'club-profile-page', 'noResults')({ name: html`<bdi>${club.name}</bdi>` })}</p>

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
                      ${translate(
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
                          Array.map(name => html`<b dir="auto">${name}</b>`),
                          formatList(locale),
                        ),
                        preprint: html`
                          <cite ${languageAttributesFor(prereview.preprint.language)}>${prereview.preprint.title}</cite>
                        `,
                      })}
                    </a>

                    ${prereview.subfields.length > 0
                      ? html`
                          <ul class="categories">
                            ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`)}
                          </ul>
                        `
                      : ''}

                    <dl>
                      <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                      <dd>${renderDate(locale)(prereview.published)}</dd>
                      <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                      <dd>${Preprints.getServerName(prereview.preprint.id)}</dd>
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

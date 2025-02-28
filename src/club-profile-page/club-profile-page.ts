import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import rtlDetect from 'rtl-detect'
import { P, match } from 'ts-pattern'
import type { Club } from '../club-details.js'
import { html, plainText, rawHtml, type Html } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import assets from '../manifest.json' with { type: 'json' }
import { PageResponse } from '../response.js'
import { clubProfileMatch, profileMatch, reviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import type { ClubId } from '../types/club-id.js'
import { ProfileId } from '../types/index.js'
import { getSubfieldName } from '../types/subfield.js'
import type { Prereviews } from './prereviews.js'

export function createPage({
  club,
  id,
  prereviews,
  locale,
}: {
  club: Club
  id: ClubId
  prereviews: Prereviews
  locale: SupportedLocale
}) {
  return PageResponse({
    title: plainText`${club.name}`,
    main: html`
      <h1>${club.name}</h1>

      ${match(id)
        .with(
          P.string.startsWith('asapbio-'),
          () => html`
            <img src="${assets['asapbio.svg']}" width="1851" height="308" alt="ASAPbio" class="club-logo" />
          `,
        )
        .with(
          'jmir-publications',
          () => html`
            <a href="https://jmirpublications.com/"
              ><img src="${assets['jmir.svg']}" width="537" height="86" alt="JMIR Publications" class="club-logo"
            /></a>
          `,
        )
        .otherwise(() => '')}
      ${club.description}

      <dl>
        <dt>${translate(locale, 'club-profile-page', 'clubLeads')()}</dt>
        <dd>
          ${pipe(
            club.leads,
            RNEA.map(
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

      ${pipe(
        prereviews,
        RA.match(
          () => html`
            <div class="inset">
              <p>${translate(locale, 'club-profile-page', 'noResults')({ name: club.name })}</p>

              <p>${translate(locale, 'club-profile-page', 'appearHere')()}</p>
            </div>
          `,
          prereviews => html`
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
                            reviewers: pipe(
                              prereview.reviewers,
                              RNEA.map(name => html`<b>${name}</b>`),
                              formatList(locale),
                              String,
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
                        <dd>
                          ${match(prereview.preprint.id.type)
                            .with('advance', () => 'Advance')
                            .with('africarxiv', () => 'AfricArXiv Preprints')
                            .with('arcadia-science', () => 'Arcadia Science')
                            .with('arxiv', () => 'arXiv')
                            .with('authorea', () => 'Authorea')
                            .with('biorxiv', () => 'bioRxiv')
                            .with('chemrxiv', () => 'ChemRxiv')
                            .with('curvenote', () => 'Curvenote')
                            .with('eartharxiv', () => 'EarthArXiv')
                            .with('ecoevorxiv', () => 'EcoEvoRxiv')
                            .with('edarxiv', () => 'EdArXiv')
                            .with('engrxiv', () => 'engrXiv')
                            .with('jxiv', () => 'Jxiv')
                            .with('medrxiv', () => 'medRxiv')
                            .with('metaarxiv', () => 'MetaArXiv')
                            .with('osf', () => 'OSF')
                            .with('osf-preprints', () => 'OSF Preprints')
                            .with('philsci', () => 'PhilSci-Archive')
                            .with('preprints.org', () => 'Preprints.org')
                            .with('psyarxiv', () => 'PsyArXiv')
                            .with('psycharchives', () => 'PsychArchives')
                            .with('research-square', () => 'Research Square')
                            .with('scielo', () => 'SciELO Preprints')
                            .with('science-open', () => 'ScienceOpen Preprints')
                            .with('socarxiv', () => 'SocArXiv')
                            .with('techrxiv', () => 'TechRxiv')
                            .with('verixiv', () => 'VeriXiv')
                            .with('zenodo', () => 'Zenodo')
                            .exhaustive()}
                        </dd>
                      </dl>
                    </article>
                  </li>
                `,
              )}
            </ol>
          `,
        ),
      )}
    `,
    canonical: format(clubProfileMatch.formatter, { id }),
  })
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

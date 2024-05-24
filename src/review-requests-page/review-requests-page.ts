import { format } from 'fp-ts-routing'
import iso6391 from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { html, plainText } from '../html'
import { PageResponse } from '../response'
import { reviewRequestsMatch, writeReviewMatch } from '../routes'
import { renderDate } from '../time'
import { getSubfieldName } from '../types/subfield'
import type { ReviewRequests } from './review-requests'

export const createPage = ({ currentPage, totalPages, language, reviewRequests }: ReviewRequests) =>
  PageResponse({
    title: plainText`Recent review requests (${language ? `${iso6391.getName(language)}, ` : ''}page ${currentPage})`,
    main: html`
      <h1>Recent review requests</h1>

      <ol class="cards">
        ${reviewRequests.map(
          (request, index) => html`
            <li>
              <article aria-labelledby="request-${index}-title">
                <h2 id="request-${index}-title" class="visually-hidden">
                  Review request for
                  <cite dir="${getLangDir(request.preprint.language)}" lang="${request.preprint.language}"
                    >${request.preprint.title}</cite
                  >
                </h2>

                <a
                  href="${format(writeReviewMatch.formatter, {
                    id: request.preprint.id,
                  })}"
                >
                  A review was requested for
                  <cite dir="${getLangDir(request.preprint.language)}" lang="${request.preprint.language}"
                    >${request.preprint.title}</cite
                  >
                </a>

                ${request.subfields.length > 0
                  ? html`
                      <ul class="categories">
                        ${request.subfields.map(subfield => html`<li>${getSubfieldName(subfield)}</li>`)}
                      </ul>
                    `
                  : ''}

                <dl>
                  <dt>Review published</dt>
                  <dd>${renderDate(request.published)}</dd>
                  <dt>Preprint server</dt>
                  <dd>
                    ${match(request.preprint.id.type)
                      .with('africarxiv', () => 'AfricArXiv Preprints')
                      .with('arxiv', () => 'arXiv')
                      .with('authorea', () => 'Authorea')
                      .with('biorxiv', () => 'bioRxiv')
                      .with('chemrxiv', () => 'ChemRxiv')
                      .with('eartharxiv', () => 'EarthArXiv')
                      .with('ecoevorxiv', () => 'EcoEvoRxiv')
                      .with('edarxiv', () => 'EdArXiv')
                      .with('engrxiv', () => 'engrXiv')
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
                      .with('zenodo', () => 'Zenodo')
                      .exhaustive()}
                  </dd>
                </dl>
              </article>
            </li>
          `,
        )}
      </ol>

      <nav class="pager">
        ${currentPage > 1
          ? html`<a href="${format(reviewRequestsMatch.formatter, { page: currentPage - 1, language })}" rel="prev"
              >Newer</a
            >`
          : ''}
        ${currentPage < totalPages
          ? html`<a href="${format(reviewRequestsMatch.formatter, { page: currentPage + 1, language })}" rel="next"
              >Older</a
            >`
          : ''}
      </nav>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: currentPage, language }),
    current: 'review-requests',
  })

export const createEmptyPage = ({ language }: Pick<ReviewRequests, 'language'>) =>
  PageResponse({
    title: plainText`Recent review requests (${language ? `${iso6391.getName(language)}, ` : ''}page 1)`,
    main: html`
      <h1>Recent review requests</h1>

      <div class="inset">
        <p>No review requests have been published yet.</p>

        <p>When they do, they’ll appear here.</p>
      </div>
    `,
    canonical: format(reviewRequestsMatch.formatter, { page: 1, language }),
    current: 'review-requests',
  })

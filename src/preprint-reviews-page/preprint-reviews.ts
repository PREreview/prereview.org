import textClipper from '@arendjr/text-clipper'
import { isDoi, toUrl } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as I from 'fp-ts/lib/Identity.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import type { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import type { Orcid } from 'orcid-id-ts'
import rtlDetect from 'rtl-detect'
import { get } from 'spectacles-ts'
import { match, P as p } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../html.js'
import { DefaultLocale } from '../locales/index.js'
import type { Preprint } from '../preprint.js'
import { TwoUpPageResponse } from '../response.js'
import { isReviewRequestPreprintId } from '../review-request.js'
import { preprintReviewsMatch, profileMatch, requestReviewMatch, reviewMatch, writeReviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { isPseudonym } from '../types/pseudonym.js'
import type { Prereview } from './prereviews.js'
import type { RapidPrereview } from './rapid-prereviews.js'

export const createPage = ({
  canRequestReviews,
  preprint,
  reviews,
  rapidPrereviews,
}: {
  canRequestReviews: boolean
  preprint: Preprint
  reviews: ReadonlyArray<Prereview>
  rapidPrereviews: ReadonlyArray<RapidPrereview>
}) =>
  TwoUpPageResponse({
    title: plainText`PREreviews of “${preprint.title.text}”`,
    description: plainText`Authored by ${pipe(preprint.authors, RNEA.map(displayAuthor), formatList(DefaultLocale))}.
    ${
      preprint.abstract
        ? plainText`
            Abstract

            ${preprint.abstract.text}
          `
        : ''
    }
    `,
    h1: html`PREreviews of
      <cite lang="${preprint.title.language}" dir="${rtlDetect.getLangDir(preprint.title.language)}"
        >${preprint.title.text}</cite
      >`,
    aside: html`
      <article aria-labelledby="preprint-title">
        <header>
          <h2
            lang="${preprint.title.language}"
            dir="${rtlDetect.getLangDir(preprint.title.language)}"
            id="preprint-title"
          >
            ${preprint.title.text}
          </h2>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(preprint.authors, RNEA.map(displayAuthor), formatList(DefaultLocale))}
          </div>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>${renderDate(DefaultLocale)(preprint.posted)}</dd>
            </div>
            <div>
              <dt>Server</dt>
              <dd>
                ${match(preprint.id.type)
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
            </div>
            ${match(preprint.id)
              .with(
                { type: 'philsci' },
                id => html`
                  <div>
                    <dt>Item ID</dt>
                    <dd>${id.value}</dd>
                  </div>
                `,
              )
              .with(
                { value: p.when(isDoi) },
                id => html`
                  <div>
                    <dt>DOI</dt>
                    <dd><a href="${toUrl(id.value).href}" class="doi" translate="no">${id.value}</a></dd>
                  </div>
                `,
              )
              .exhaustive()}
          </dl>
        </header>

        ${preprint.abstract
          ? html`
              <h3>Abstract</h3>

              <div lang="${preprint.abstract.language}" dir="${rtlDetect.getLangDir(preprint.abstract.language)}">
                ${fixHeadingLevels(3, preprint.abstract.text)}
              </div>
            `
          : ''}

        <a href="${preprint.url.href}" class="button">Read the preprint</a>
      </article>
    `,
    main: html`
      ${pipe(
        rapidPrereviews,
        RA.matchW(
          () => '',
          rapidPrereviews => showRapidPrereviews(rapidPrereviews, preprint),
        ),
      )}

      <h2>${reviews.length} PREreview${reviews.length !== 1 ? 's' : ''}</h2>

      <div class="button-group" role="group">
        <a href="${format(writeReviewMatch.formatter, { id: preprint.id })}" class="button">Write a PREreview</a>

        ${canRequestReviews && isReviewRequestPreprintId(preprint.id)
          ? html`<a href="${format(requestReviewMatch.formatter, { id: preprint.id })}">Request a PREreview</a>`
          : ''}
      </div>

      <ol class="cards">
        ${reviews.map(showReview)}
      </ol>
    `,
    canonical: format(preprintReviewsMatch.formatter, { id: preprint.id }),
  })

function showReview(review: Prereview) {
  return html`
    <li>
      <article aria-labelledby="prereview-${review.id}-title">
        <header>
          <h3 class="visually-hidden" id="prereview-${review.id}-title">
            PREreview by ${review.authors.named[0].name}
            ${review.authors.named.length + review.authors.anonymous > 1 ? 'et al.' : ''}
            ${review.club ? html`of the ${getClubName(review.club)}` : ''}
          </h3>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(
              review.authors.named,
              RNEA.map(get('name')),
              RNEA.concatW(
                review.authors.anonymous > 0
                  ? [`${review.authors.anonymous} other author${review.authors.anonymous !== 1 ? 's' : ''}`]
                  : [],
              ),
              formatList(DefaultLocale),
            )}
            ${review.club ? html`of the ${getClubName(review.club)}` : ''}
          </div>
        </header>

        <div ${review.language ? html`lang="${review.language}" dir="${rtlDetect.getLangDir(review.language)}"` : ''}>
          ${fixHeadingLevels(
            3,
            rawHtml(textClipper(review.text.toString(), 300, { html: true, maxLines: 5, stripTags: ['a'] })),
          )}
        </div>

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          Read
          <span class="visually-hidden">
            the PREreview by ${review.authors.named[0].name}
            ${review.authors.named.length + review.authors.anonymous > 1 ? 'et al.' : ''}
            ${review.club ? html`of the ${getClubName(review.club)}` : ''}
          </span>
        </a>
      </article>
    </li>
  `
}

function showRapidPrereviews(rapidPrereviews: ReadonlyNonEmptyArray<RapidPrereview>, preprint: Preprint): Html {
  return html`
    <h2>${rapidPrereviews.length} Rapid PREreview${rapidPrereviews.length !== 1 ? 's' : ''}</h2>

    <div class="byline">
      <span class="visually-hidden">Authored</span> by
      ${pipe(rapidPrereviews, RNEA.map(flow(get('author'), displayAuthor)), formatList(DefaultLocale))}
    </div>

    <details>
      <summary><span>Where can I fill out a Rapid PREreview?</span></summary>

      <div>
        <p>
          We’ve recently replaced Rapid PREreviews with
          <a href="https://content.prereview.org/introducing-structured-prereviews-on-prereview-org/"
            >Structured PREreviews</a
          >.
        </p>

        <p>
          You can
          <a href="${format(writeReviewMatch.formatter, { id: preprint.id })}">write a Structured PREreview</a> now.
        </p>

        <p>We’ll be updating older Rapid PREreviews like these soon.</p>
      </div>
    </details>

    <div role="region" aria-labelledby="rapid-prereviews-caption" tabindex="0">
      <table>
        <caption id="rapid-prereviews-caption" class="visually-hidden">
          Aggregated Rapid PREreviews
        </caption>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">Question</span></th>
            <th scope="col">Yes</th>
            <th scope="col">Unsure</th>
            <th scope="col">N/A</th>
            <th scope="col">No</th>
          </tr>
        </thead>
        <tbody>
          ${pipe(
            [
              'novel',
              'future',
              'reproducibility',
              'methods',
              'coherent',
              'limitations',
              'ethics',
              'newData',
              'availableData',
              'availableCode',
              'recommend',
              'peerReview',
            ] as ReadonlyNonEmptyArray<keyof RapidPrereview['questions']>,
            RNEA.map(
              flow(
                I.bindTo('question'),
                I.bind('answers', ({ question }) => ({
                  yes: countRapidPrereviewResponses(rapidPrereviews, question, 'yes'),
                  unsure: countRapidPrereviewResponses(rapidPrereviews, question, 'unsure'),
                  na: countRapidPrereviewResponses(rapidPrereviews, question, 'na'),
                  no: countRapidPrereviewResponses(rapidPrereviews, question, 'no'),
                })),
              ),
            ),
            RNEA.map(
              ({ question, answers }) => html`
                <tr>
                  <th scope="row">${displayRapidPrereviewQuestion(question)}</th>
                  <td class="numeric">
                    ${(answers.yes / rapidPrereviews.length).toLocaleString(DefaultLocale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td class="numeric">
                    ${(answers.unsure / rapidPrereviews.length).toLocaleString(DefaultLocale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td class="numeric">
                    ${(answers.na / rapidPrereviews.length).toLocaleString(DefaultLocale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td class="numeric">
                    ${(answers.no / rapidPrereviews.length).toLocaleString(DefaultLocale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              `,
            ),
          )}
        </tbody>
      </table>
    </div>
  `
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: name } })}"
      >${name}</a
    >`
  }

  return name
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

function displayRapidPrereviewQuestion(question: keyof RapidPrereview['questions']): Html {
  return match(question)
    .with('availableCode', () => html`Is the code used in the manuscript available?`)
    .with('availableData', () => html`Are the data used in the manuscript available?`)
    .with('coherent', () => html`Are the principal conclusions supported by the data and analysis?`)
    .with('ethics', () => html`Have the authors adequately discussed ethical concerns?`)
    .with('future', () => html`Are the results likely to lead to future research?`)
    .with('limitations', () => html`Does the manuscript discuss limitations?`)
    .with('methods', () => html`Are the methods and statistics appropriate for the analysis?`)
    .with('newData', () => html`Does the manuscript include new data?`)
    .with('novel', () => html`Are the findings novel?`)
    .with('peerReview', () => html`Do you recommend this manuscript for peer review?`)
    .with('recommend', () => html`Would you recommend this manuscript to others?`)
    .with('reproducibility', () => html`Is sufficient detail provided to allow reproduction of the study?`)
    .exhaustive()
}

function countRapidPrereviewResponses<Q extends keyof RapidPrereview['questions']>(
  rapidPrereviews: ReadonlyArray<RapidPrereview>,
  question: Q,
  response: RapidPrereview['questions'][Q],
) {
  return rapidPrereviews.reduce(
    (total, rapidPrereview) => total + (rapidPrereview.questions[question] === response ? 1 : 0),
    0,
  )
}

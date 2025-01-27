import { isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import rtlDetect from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../../html.js'
import { DefaultLocale } from '../../locales/index.js'
import type { Preprint } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { preprintReviewsMatch, writeReviewMatch, writeReviewStartMatch } from '../../routes.js'
import { renderDate } from '../../time.js'
import type { User } from '../../user.js'

export const startPage = (preprint: Preprint, user?: User) =>
  StreamlinePageResponse({
    title: plainText`Write a PREreview`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>Back to preprint</span></a
      >
    `,
    main: html`
      <h1>Write a PREreview</h1>

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
            <span class="visually-hidden">Authored</span> by
            ${pipe(
              preprint.authors,
              RNEA.map(author => author.name),
              formatList(DefaultLocale),
            )}
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
        You can write a PREreview of
        <cite lang="${preprint.title.language}" dir="${rtlDetect.getLangDir(preprint.title.language)}"
          >${preprint.title.text}</cite
        >. A PREreview is a review of a preprint and can vary from a few sentences to a lengthy report, similar to a
        journal-organized peer-review report.
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

      <a href="${format(writeReviewStartMatch.formatter, { id: preprint.id })}" role="button" draggable="false"
        >Start now</a
      >
    `,
    canonical: format(writeReviewMatch.formatter, { id: preprint.id }),
  })

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

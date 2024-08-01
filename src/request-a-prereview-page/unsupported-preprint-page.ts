import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'
import type { PreprintId } from '../types/preprint-id.js'

export const unsupportedPreprintPage = (preprint: PreprintId) =>
  PageResponse({
    status: Status.BadRequest,
    title: plainText`Sorry, we don’t support requests for this preprint`,
    main: html`
      <h1>Sorry, we don’t support requests for this preprint</h1>

      <p>
        We don’t support requests for this
        ${match(preprint.type)
          .with('africarxiv', () => 'AfricArXiv')
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
          .with('osf', 'osf-preprints', () => 'OSF')
          .with('philsci', () => 'PhilSci-Archive')
          .with('preprints.org', () => 'Preprints.org')
          .with('psyarxiv', () => 'PsyArXiv')
          .with('psycharchives', () => 'PsychArchives')
          .with('research-square', () => 'Research Square')
          .with('scielo', () => 'SciELO')
          .with('science-open', () => 'ScienceOpen')
          .with('socarxiv', () => 'SocArXiv')
          .with('techrxiv', () => 'TechRxiv')
          .with('zenodo', () => 'Zenodo')
          .exhaustive()}
        preprint yet.
      </p>

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button">Back</a>
    `,
  })

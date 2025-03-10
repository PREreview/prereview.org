import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'

export function createUnknownPreprintWithDoiPage(preprint: Extract<IndeterminatePreprintId, { value: Doi }>) {
  return PageResponse({
    status: Status.BadRequest,
    title: plainText`Sorry, we don’t know this preprint`,
    main: html`
      <h1>Sorry, we don’t know this preprint</h1>

      <p>
        We think the DOI <q class="select-all" translate="no">${preprint.value}</q> could be
        ${match(preprint.type)
          .with('advance', () => 'an Advance')
          .with('africarxiv', () => 'an AfricArXiv')
          .with('arcadia-science', () => 'an Arcadia Science')
          .with('arxiv', () => 'an arXiv')
          .with('authorea', () => 'an Authorea')
          .with('biorxiv', () => 'a bioRxiv')
          .with('biorxiv-medrxiv', () => 'a bioRxiv or medRxiv')
          .with('chemrxiv', () => 'a ChemRxiv')
          .with('curvenote', () => 'a Curvenote')
          .with('eartharxiv', () => 'an EarthArXiv')
          .with('ecoevorxiv', () => 'an EcoEvoRxiv')
          .with('edarxiv', () => 'an EdArXiv')
          .with('engrxiv', () => 'an engrXiv')
          .with('jxiv', () => 'a Jxiv')
          .with('medrxiv', () => 'a medRxiv')
          .with('metaarxiv', () => 'a MetaArXiv')
          .with('osf', 'osf-preprints', () => 'an OSF')
          .with('preprints.org', () => 'a Preprints.org')
          .with('psyarxiv', () => 'a PsyArXiv')
          .with('psycharchives', () => 'a PsychArchives')
          .with('research-square', () => 'a Research Square')
          .with('scielo', () => 'a SciELO')
          .with('science-open', () => 'a ScienceOpen')
          .with('socarxiv', () => 'a SocArXiv')
          .with('techrxiv', () => 'a TechRxiv')
          .with('verixiv', () => 'a VeriXiv')
          .with('zenodo', () => 'a Zenodo')
          .with('zenodo-africarxiv', () => 'a Zenodo or AfricArXiv')
          .exhaustive()}
        preprint, but we can’t find any details.
      </p>

      <p>If you typed the DOI, check it is correct.</p>

      <p>If you pasted the DOI, check you copied the entire address.</p>

      <p>If the DOI is correct, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
    `,
  })
}

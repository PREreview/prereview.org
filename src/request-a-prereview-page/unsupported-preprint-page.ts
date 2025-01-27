import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { html, plainText } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'
import type { PreprintId } from '../types/preprint-id.js'

export const unsupportedPreprintPage = (preprint: PreprintId, locale: SupportedLocale) =>
  PageResponse({
    status: Status.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'unsupportedPreprintTitle')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'unsupportedPreprintTitle')()}</h1>

      <p>
        ${translate(
          locale,
          'request-a-prereview-page',
          'unsupportedPreprintMessage',
        )({
          server: match(preprint.type)
            .with('advance', () => 'Advance')
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
            .with('jxiv', () => 'Jxiv')
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
            .with('verixiv', () => 'VeriXiv')
            .with('zenodo', () => 'Zenodo')
            .exhaustive(),
        })}
      </p>

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button"
        >${translate(locale, 'request-a-prereview-page', 'back')()}</a
      >
    `,
  })

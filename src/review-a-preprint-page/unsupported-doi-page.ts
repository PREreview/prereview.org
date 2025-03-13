import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const unsupportedDoiPage = (locale: SupportedLocale) =>
  PageResponse({
    status: Status.BadRequest,
    title: plainText`Sorry, we don’t support this DOI`,
    main: html`
      <h1>Sorry, we don’t support this DOI</h1>

      <p>
        We support preprints from Advance, AfricArXiv, Arcadia&nbsp;Science, arXiv, Authorea, bioRxiv, ChemRxiv,
        Curvenote, EarthArXiv, EcoEvoRxiv, EdArXiv, engrXiv, Jxiv, medRxiv, MetaArXiv, OSF, PhilSci-Archive,
        Preprints.org, PsyArXiv, PsychArchives, Research&nbsp;Square, SciELO, ScienceOpen, SocArXiv, TechRxiv, VeriXiv
        and Zenodo.
      </p>

      <p>
        If this DOI is for a preprint on a server we don’t support, please
        <a href="mailto:help@prereview.org">get in touch</a>.
      </p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
    `,
  })

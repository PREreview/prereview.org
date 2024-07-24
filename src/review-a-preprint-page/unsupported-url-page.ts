import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'

export const unsupportedUrlPage = PageResponse({
  status: Status.BadRequest,
  title: plainText`Sorry, we don’t support this URL`,
  main: html`
    <h1>Sorry, we don’t support this URL</h1>

    <p>
      We support preprints from AfricArXiv, Arcadia&nbsp;Science, arXiv, Authorea, bioRxiv, ChemRxiv, EarthArXiv,
      EcoEvoRxiv, EdArXiv, engrXiv, medRxiv, MetaArXiv, OSF, PhilSci-Archive, Preprints.org, PsyArXiv, PsychArchives,
      Research&nbsp;Square, SciELO, ScienceOpen, SocArXiv, TechRxiv and Zenodo.
    </p>

    <p>
      If this URL is for a preprint on a server we don’t support, please
      <a href="mailto:help@prereview.org">get in touch</a>.
    </p>

    <p>Otherwise, if the preprint has a DOI, please try using that instead.</p>

    <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
  `,
})

import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html'
import { PageResponse } from '../response'
import { reviewAPreprintMatch } from '../routes'

export const unsupportedDoiPage = PageResponse({
  status: Status.BadRequest,
  title: plainText`Sorry, we don’t support this DOI`,
  main: html`
    <h1>Sorry, we don’t support this DOI</h1>

    <p>
      We support preprints from AfricArXiv, arXiv, Authorea, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv,
      engrXiv, medRxiv, MetaArXiv, OSF, PhilSci-Archive, Preprints.org, PsyArXiv, PsychArchives, Research&nbsp;Square,
      SciELO, ScienceOpen, SocArXiv, TechRxiv and Zenodo.
    </p>

    <p>
      If this DOI is for a preprint on a server we don’t support, please
      <a href="mailto:help@prereview.org">get in touch</a>.
    </p>

    <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
  `,
})

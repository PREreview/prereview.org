import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'

export const notAPreprintPage = PageResponse({
  status: Status.BadRequest,
  title: plainText`Sorry, we only support preprints`,
  main: html`
    <h1>Sorry, we only support preprints</h1>

    <p>
      We support preprints from Advance, AfricArXiv, Arcadia&nbsp;Science, arXiv, Authorea, bioRxiv, ChemRxiv,
      Curvenote, EarthArXiv, EcoEvoRxiv, EdArXiv, engrXiv, Jxiv, medRxiv, MetaArXiv, OSF, PhilSci-Archive,
      Preprints.org, PsyArXiv, PsychArchives, Research&nbsp;Square, SciELO, ScienceOpen, SocArXiv, TechRxiv, VeriXiv and
      Zenodo.
    </p>

    <p>If this is a preprint, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

    <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button">Back</a>
  `,
})

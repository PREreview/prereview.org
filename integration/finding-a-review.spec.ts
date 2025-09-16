import { Doi } from 'doi-ts'
import { Duration } from 'effect'
import { URL } from 'url'
import { type Record, RecordC, RecordsC } from 'zenodo-ts'
import { Orcid } from '../src/types/Orcid.js'
import { areLoggedIn, canLogIn, expect, prereviewWasRemoved, test } from './base.js'

test.extend(canLogIn).extend(areLoggedIn)('can see my own PREreviews', async ({ fetch, javaScriptEnabled, page }) => {
  const menu = page.getByRole('button', { name: 'Menu' }).or(page.getByRole('link', { name: 'Menu' }))

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  fetch.get(
    {
      name: 'profile-prereviews',
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: {
        q: 'metadata.creators.person_or_org.identifiers.identifier:0000-0002-1825-0097 metadata.creators.person_or_org.name:"Orange Panda"',
        size: 100,
        sort: 'publication-desc',
        resource_type: 'publication::publication-peerreview',
      },
    },
    {
      body: RecordsC.encode({
        hits: {
          total: 6,
          hits: [
            {
              conceptdoi: Doi('10.5281/zenodo.7820083'),
              conceptrecid: 7820083,
              files: [
                {
                  key: 'review.html',
                  links: {
                    self: new URL(
                      'https://zenodo.org/api/files/77ec063f-e37c-4739-8bc5-d7bba268bbd5/review.html/content',
                    ),
                  },
                  size: 2538,
                },
              ],
              id: 7820084,
              links: {
                latest: new URL('https://zenodo.org/api/records/7820084'),
                latest_html: new URL('https://zenodo.org/record/7820084'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Jaeyoung Oh', orcid: Orcid('0009-0008-9257-4728') }],
                description:
                  "<p>The main question that this preprint seeks to answer is whether or not Nirmatrelvir plus ritonavir, used as a treatment for non-hospitalized vaccinated patients, was effective at preventing long COVID symptoms. Overall, the paper found that NMV-r was indeed associated with a reduction in symptoms of long COVID. The findings of this paper are novel, as there has been research conducted on NMV-r's effect on COVID symptoms, but this is the first time its effect on long COVID has been investigated. The results are likely to lead to future research, as the findings are novel and relevant to helping solve a large issue in long COVID. I would say that sufficient detail is provided to allow reproduction of the study. Where the data was taken from and how it was analyzed is described in great detail. I do not have the expertise needed to determine if the methods and statistics are appropriate for the analysis, so I am unsure but they seem logical and is an area that other reviewers could check. The principal conclusions are supported by the data and analysis. The manuscript does discuss limitations. It highlights that there could be significant biases in the data due to differences between the groups receiving and not receiving treatment. The authors claim that they used propensity matching to control for these limitations in the data, but admit that there could still be residual confounding. In addition, the authors also point out that the findings could change depending on the definition of long COVID used. The authors say that their definitions of long COVID may have lacked precision and been too inclusive. The authors say that a more accurate result could be obtained from data from original placebo-controlled trials. The authors have not discussed ethical concerns.  The manuscript does not include new data. It gets its data from the TriNetX Analytics Network. The authors say that more can be found about this database online. I would recommend this manuscript to others due to its novel findings and its potential contributions to finding effective treatments for long COVID. I highly recommend this manuscript for peer review.</p><p>My only concerns with this manuscript would be that the data does not come from placebo-controlled trials and only from electronic health records. However, the authors have already addressed this concern. </p><p>I do not have any competing interests.</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>",
                doi: Doi('10.5281/zenodo.7820084'),
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2023-04-12'),
                related_identifiers: [
                  {
                    identifier: '10.1101/2022.01.13.476201',
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                    scheme: 'doi',
                  },
                ],
                resource_type: { type: 'publication', subtype: 'peerreview' },
                title:
                  'PREreview of "Incidence of Symptoms Associated with Post-Acute Sequelae of SARS-CoV-2 infection in Non-Hospitalized Vaccinated Patients Receiving Nirmatrelvir-Ritonavir"',
              },
            },
            {
              conceptdoi: Doi('10.5281/zenodo.7747128'),
              conceptrecid: 7747128,
              files: [
                {
                  key: 'review.html',
                  links: {
                    self: new URL(
                      'https://zenodo.org/api/files/7ff8c56b-1755-40c7-800d-d64b886ae153/review.html/content',
                    ),
                  },
                  size: 7043,
                },
              ],
              id: 7747129,
              links: {
                latest: new URL('https://zenodo.org/api/records/7747129'),
                latest_html: new URL('https://zenodo.org/record/7747129'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'CJ San Felipe', orcid: Orcid('0000-0002-2695-5951') }],
                description:
                  '<p>PTP1b has been an attractive target for drug development due to its essential role in several cellular pathways and diseases such as type 2 diabetes. Focus has been paid to identifying allosteric sites that regulate catalytic activity via altering the dynamics of the active site WPD loop. However, the structural mechanisms underlying the WPD loop opening and closing (which is relatively slow by NMR) remains unclear.\u00a0</p><p>In this paper, the authors sought to identify the structural mechanisms underlying PTP1b loop motion by performing long time scale molecular dynamics (MD) simulations. Starting from existing structures with the WPD loop either open or closed, they are able to derive reasonable estimations of the kinetics of loop opening and closing. They address the question of what structural changes need to occur for the loop to remain open or closed as it fluctuates. Using a random forest approach, they narrow their focus down to the PDFG motifs backbone dihedrals as a set of features sufficient for describing and predicting loop movement between states. The major strength of this paper is reducing the WPD loop conformation (including transient states) down to a set of reaction coordinates in the PDFG motif dihedral angles. Based on this minimum set of features, the committor probabilities provide a strong statistical argument for the transition between open, closed, and transient states along the loop trajectory.</p><p>The major weakness of this paper is that the visualizations describing the PDFG motif switch model are insufficient and confusing and lack an atomic explanation of how these dihedral changes occur in the context of surrounding residues to complement their statistical explanations. This makes it difficult to interpret what the actual transitions look like. We understand that the atomic explanation of this mechanism can be complicated but refer the authors to this paper as an example even though it is a different target and may not be specifically relevant to their work: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/</a> (Fig 3)</p><p>The reaction coordinates alone do not provide a clear direction for envisioning future experiments. Given that this motif is conserved (as the authors explained), other PTP members likely have different structural environments surrounding the motif which likely affects kinetic rates and thermodynamics.\u00a0</p><p>Major Points:</p><ol><li><p>Previous structural studies of PTP\'s have identified atypical open loop conformations in GLEPP1, STEP, and Lyp: <a href="https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub">https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub</a> Fig 3A. These loops adopt a novel loop conformation that is more open compared to PTP1B. Further, the presence of catalytic water molecules that are tightly bound in closed states and absent in open states have been suggested to play a role in the closing of the WPD loop.\u00a0</p><ol><li><p>Can the authors provide comments on how the PDFG motif factors into the novel open loop conformation (would the motif dihedrals still predict loop states in these family members)?\u00a0</p></li><li><p>Were water molecules detected in the binding site and do they play a role during loop closure?</p></li><li><p>Is it possible to include within these simulations mixed solvent MD with a PTP1B substrate to explore their roles in the loop transition?</p></li></ol></li><li><p>"We note that although the PD[F/H]G BLAST search did return matches in other protein families, there was not the structural information corresponding to those matches that would be needed to draw further conclusions on the conformational significance of PD[F/H]G motifs in those families." - We feel this is a missed opportunity to at least do some exploration and cataloging using the alphafold structures of these other families.</p></li><li><p>The authors describe the backbone dihedrals of the PDFG motif as being sufficient and necessary for predicting WPD loop conformation but do not mention the side chain conformations. We feel that the explanation and visualization of the side chain conformations in both open and closed states is unclear as there is no analysis of how these transitions and conformations affect the populations and rate movement of the loop.\u00a0</p><ol><li><p>What do the rotamer conformations and transitions look like for the PDFG during open, closed, and transient WPD loop states?\u00a0</p></li><li><p>How do these rotamer conformations affect loop movements and populations within the simulation?\u00a0</p></li></ol></li></ol><p>It would be insightful if the authors could provide an explanation of the rotamer transitions during loop opening and closing. Understanding these structural changes during substrate binding and catalysis could yield targets for drug development.\u00a0</p><p>Minor Points:</p><ol><li><p>Supplementary figures S2, S3, S4, and S5 have little to no information to adequately explain what is being illustrated. The authors should be more clear in describing what these figures represent. A description of axes, experimental set up, and legends would be helpful.\u00a0</p></li><li><p>The observation that loop fluctuations without long term stability unless the PDFG motif switches is reminiscent of the population shuffling model of conformational changes put forward by Colin Smith - <a href="https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890">https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890</a>. Given the previous NMR data on PTP1B, how does this view alter the interpretation away from a strict two state model?</p></li><li><p>"The free energy estimate from these AWE simulations was \u0394Gclosed-to-open = \u22122.6 \u00b1 0.1 kcal mol-1, indicating that the transition from closed to open states is spontaneous (<a href="https://www.biorxiv.org/content/10.1101/2023.02.28.529746v1.full#F2"><b>Figure 2b</b></a>), a finding that is again consistent with experimental data" We are a bit confused by the language here: is this a thermodynamic or kinetic argument? Secondarily, how do the populations compare to those derived from NMR?</p></li></ol><ol><li><p>As previously discussed in a twitter thread with the authors, the backbone ramachandran regions of the 1SUG structure (closed WPD loop conformation) is not in a region previously known for kinases. It would be helpful if the authors could provide validation that the backbone ramachandran regions of the WPD loop are in agreement with what is known about kinases states and whether this would affect their interpretations.\u00a0</p></li></ol><p><a href="https://twitter.com/RolandDunbrack/status/1632284368650530816">https://twitter.com/RolandDunbrack/status/1632284368650530816</a></p><p>Review by - CJ San Felipe (UCSF) and James Fraser (UCSF)</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>',
                doi: Doi('10.5281/zenodo.7747129'),
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2023-03-17'),
                related_identifiers: [
                  {
                    identifier: '10.1101/2023.02.28.529746',
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                    scheme: 'doi',
                  },
                  { identifier: '10.5281/zenodo.7747128', relation: 'isVersionOf', scheme: 'doi' },
                ],
                resource_type: { type: 'publication', subtype: 'peerreview' },
                title: 'PREreview of "A conserved local structural motif controls the kinetics of PTP1B catalysis"',
              },
            },
          ],
        },
      }),
    },
  )

  await menu.click()
  await page.getByRole('link', { name: 'My PREreviews' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My PREreviews')

  if (javaScriptEnabled) {
    await menu.click()

    await expect(page.getByRole('link', { name: 'My PREreviews' })).toHaveAttribute('aria-current', 'page')
  }

  fetch
    .getOnce('http://zenodo.test/api/records/7747129', {
      body: RecordC.encode({
        conceptdoi: Doi('10.5281/zenodo.7747128'),
        conceptrecid: 7747128,
        files: [
          {
            key: 'review.html',
            links: {
              self: new URL('https://zenodo.org/api/files/7ff8c56b-1755-40c7-800d-d64b886ae153/review.html/content'),
            },
            size: 7043,
          },
        ],
        id: 7747129,
        links: {
          latest: new URL('https://zenodo.org/api/records/7747129'),
          latest_html: new URL('https://zenodo.org/record/7747129'),
        },
        metadata: {
          access_right: 'open',
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'CJ San Felipe', orcid: Orcid('0000-0002-2695-5951') }],
          description:
            '<p>PTP1b has been an attractive target for drug development due to its essential role in several cellular pathways and diseases such as type 2 diabetes. Focus has been paid to identifying allosteric sites that regulate catalytic activity via altering the dynamics of the active site WPD loop. However, the structural mechanisms underlying the WPD loop opening and closing (which is relatively slow by NMR) remains unclear.\u00a0</p><p>In this paper, the authors sought to identify the structural mechanisms underlying PTP1b loop motion by performing long time scale molecular dynamics (MD) simulations. Starting from existing structures with the WPD loop either open or closed, they are able to derive reasonable estimations of the kinetics of loop opening and closing. They address the question of what structural changes need to occur for the loop to remain open or closed as it fluctuates. Using a random forest approach, they narrow their focus down to the PDFG motifs backbone dihedrals as a set of features sufficient for describing and predicting loop movement between states. The major strength of this paper is reducing the WPD loop conformation (including transient states) down to a set of reaction coordinates in the PDFG motif dihedral angles. Based on this minimum set of features, the committor probabilities provide a strong statistical argument for the transition between open, closed, and transient states along the loop trajectory.</p><p>The major weakness of this paper is that the visualizations describing the PDFG motif switch model are insufficient and confusing and lack an atomic explanation of how these dihedral changes occur in the context of surrounding residues to complement their statistical explanations. This makes it difficult to interpret what the actual transitions look like. We understand that the atomic explanation of this mechanism can be complicated but refer the authors to this paper as an example even though it is a different target and may not be specifically relevant to their work: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/</a> (Fig 3)</p><p>The reaction coordinates alone do not provide a clear direction for envisioning future experiments. Given that this motif is conserved (as the authors explained), other PTP members likely have different structural environments surrounding the motif which likely affects kinetic rates and thermodynamics.\u00a0</p><p>Major Points:</p><ol><li><p>Previous structural studies of PTP\'s have identified atypical open loop conformations in GLEPP1, STEP, and Lyp: <a href="https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub">https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub</a> Fig 3A. These loops adopt a novel loop conformation that is more open compared to PTP1B. Further, the presence of catalytic water molecules that are tightly bound in closed states and absent in open states have been suggested to play a role in the closing of the WPD loop.\u00a0</p><ol><li><p>Can the authors provide comments on how the PDFG motif factors into the novel open loop conformation (would the motif dihedrals still predict loop states in these family members)?\u00a0</p></li><li><p>Were water molecules detected in the binding site and do they play a role during loop closure?</p></li><li><p>Is it possible to include within these simulations mixed solvent MD with a PTP1B substrate to explore their roles in the loop transition?</p></li></ol></li><li><p>"We note that although the PD[F/H]G BLAST search did return matches in other protein families, there was not the structural information corresponding to those matches that would be needed to draw further conclusions on the conformational significance of PD[F/H]G motifs in those families." - We feel this is a missed opportunity to at least do some exploration and cataloging using the alphafold structures of these other families.</p></li><li><p>The authors describe the backbone dihedrals of the PDFG motif as being sufficient and necessary for predicting WPD loop conformation but do not mention the side chain conformations. We feel that the explanation and visualization of the side chain conformations in both open and closed states is unclear as there is no analysis of how these transitions and conformations affect the populations and rate movement of the loop.\u00a0</p><ol><li><p>What do the rotamer conformations and transitions look like for the PDFG during open, closed, and transient WPD loop states?\u00a0</p></li><li><p>How do these rotamer conformations affect loop movements and populations within the simulation?\u00a0</p></li></ol></li></ol><p>It would be insightful if the authors could provide an explanation of the rotamer transitions during loop opening and closing. Understanding these structural changes during substrate binding and catalysis could yield targets for drug development.\u00a0</p><p>Minor Points:</p><ol><li><p>Supplementary figures S2, S3, S4, and S5 have little to no information to adequately explain what is being illustrated. The authors should be more clear in describing what these figures represent. A description of axes, experimental set up, and legends would be helpful.\u00a0</p></li><li><p>The observation that loop fluctuations without long term stability unless the PDFG motif switches is reminiscent of the population shuffling model of conformational changes put forward by Colin Smith - <a href="https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890">https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890</a>. Given the previous NMR data on PTP1B, how does this view alter the interpretation away from a strict two state model?</p></li><li><p>"The free energy estimate from these AWE simulations was \u0394Gclosed-to-open = \u22122.6 \u00b1 0.1 kcal mol-1, indicating that the transition from closed to open states is spontaneous (<a href="https://www.biorxiv.org/content/10.1101/2023.02.28.529746v1.full#F2"><b>Figure 2b</b></a>), a finding that is again consistent with experimental data" We are a bit confused by the language here: is this a thermodynamic or kinetic argument? Secondarily, how do the populations compare to those derived from NMR?</p></li></ol><ol><li><p>As previously discussed in a twitter thread with the authors, the backbone ramachandran regions of the 1SUG structure (closed WPD loop conformation) is not in a region previously known for kinases. It would be helpful if the authors could provide validation that the backbone ramachandran regions of the WPD loop are in agreement with what is known about kinases states and whether this would affect their interpretations.\u00a0</p></li></ol><p><a href="https://twitter.com/RolandDunbrack/status/1632284368650530816">https://twitter.com/RolandDunbrack/status/1632284368650530816</a></p><p>Review by - CJ San Felipe (UCSF) and James Fraser (UCSF)</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>',
          doi: Doi('10.5281/zenodo.7747129'),
          license: { id: 'cc-by-4.0' },
          publication_date: new Date('2023-03-17'),
          related_identifiers: [
            {
              identifier: '10.1101/2023.02.28.529746',
              relation: 'reviews',
              resource_type: 'publication-preprint',
              scheme: 'doi',
            },
            { identifier: '10.5281/zenodo.7747128', relation: 'isVersionOf', scheme: 'doi' },
          ],
          resource_type: { type: 'publication', subtype: 'peerreview' },
          title: 'PREreview of "A conserved local structural motif controls the kinetics of PTP1B catalysis"',
        },
      }),
    })
    .getOnce('https://zenodo.org/api/files/7ff8c56b-1755-40c7-800d-d64b886ae153/review.html/content', {
      body: '<p>PTP1b has been an attractive target for drug development due to ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5281/zenodo.7747129" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page
    .getByRole('link', {
      name: 'CJ San Felipe reviewed A conserved local structural motif controls the kinetics of PTP1B catalysis',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('an attractive target for drug development')
})

test.extend(canLogIn).extend(areLoggedIn)('might not load my PREreviews in time', async ({ fetch, page }) => {
  fetch.get(
    {
      name: 'profile-prereviews',
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: {
        q: 'metadata.creators.person_or_org.identifiers.identifier:0000-0002-1825-0097 metadata.creators.person_or_org.name:"Orange Panda"',
        size: 100,
        sort: 'publication-desc',
        resource_type: 'publication::publication-peerreview',
      },
    },
    {
      body: RecordsC.encode({
        hits: {
          total: 6,
          hits: [
            {
              conceptdoi: Doi('10.5281/zenodo.7820083'),
              conceptrecid: 7820083,
              files: [
                {
                  key: 'review.html',
                  links: {
                    self: new URL(
                      'https://zenodo.org/api/files/77ec063f-e37c-4739-8bc5-d7bba268bbd5/review.html/content',
                    ),
                  },
                  size: 2538,
                },
              ],
              id: 7820084,
              links: {
                latest: new URL('https://zenodo.org/api/records/7820084'),
                latest_html: new URL('https://zenodo.org/record/7820084'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Jaeyoung Oh', orcid: Orcid('0009-0008-9257-4728') }],
                description:
                  "<p>The main question that this preprint seeks to answer is whether or not Nirmatrelvir plus ritonavir, used as a treatment for non-hospitalized vaccinated patients, was effective at preventing long COVID symptoms. Overall, the paper found that NMV-r was indeed associated with a reduction in symptoms of long COVID. The findings of this paper are novel, as there has been research conducted on NMV-r's effect on COVID symptoms, but this is the first time its effect on long COVID has been investigated. The results are likely to lead to future research, as the findings are novel and relevant to helping solve a large issue in long COVID. I would say that sufficient detail is provided to allow reproduction of the study. Where the data was taken from and how it was analyzed is described in great detail. I do not have the expertise needed to determine if the methods and statistics are appropriate for the analysis, so I am unsure but they seem logical and is an area that other reviewers could check. The principal conclusions are supported by the data and analysis. The manuscript does discuss limitations. It highlights that there could be significant biases in the data due to differences between the groups receiving and not receiving treatment. The authors claim that they used propensity matching to control for these limitations in the data, but admit that there could still be residual confounding. In addition, the authors also point out that the findings could change depending on the definition of long COVID used. The authors say that their definitions of long COVID may have lacked precision and been too inclusive. The authors say that a more accurate result could be obtained from data from original placebo-controlled trials. The authors have not discussed ethical concerns.  The manuscript does not include new data. It gets its data from the TriNetX Analytics Network. The authors say that more can be found about this database online. I would recommend this manuscript to others due to its novel findings and its potential contributions to finding effective treatments for long COVID. I highly recommend this manuscript for peer review.</p><p>My only concerns with this manuscript would be that the data does not come from placebo-controlled trials and only from electronic health records. However, the authors have already addressed this concern. </p><p>I do not have any competing interests.</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>",
                doi: Doi('10.5281/zenodo.7820084'),
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2023-04-12'),
                related_identifiers: [
                  {
                    identifier: '10.1101/2022.01.13.476201',
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                    scheme: 'doi',
                  },
                ],
                resource_type: { type: 'publication', subtype: 'peerreview' },
                title:
                  'PREreview of "Incidence of Symptoms Associated with Post-Acute Sequelae of SARS-CoV-2 infection in Non-Hospitalized Vaccinated Patients Receiving Nirmatrelvir-Ritonavir"',
              },
            },
            {
              conceptdoi: Doi('10.5281/zenodo.7747128'),
              conceptrecid: 7747128,
              files: [
                {
                  key: 'review.html',
                  links: {
                    self: new URL(
                      'https://zenodo.org/api/files/7ff8c56b-1755-40c7-800d-d64b886ae153/review.html/content',
                    ),
                  },
                  size: 7043,
                },
              ],
              id: 7747129,
              links: {
                latest: new URL('https://zenodo.org/api/records/7747129'),
                latest_html: new URL('https://zenodo.org/record/7747129'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'CJ San Felipe', orcid: Orcid('0000-0002-2695-5951') }],
                description:
                  '<p>PTP1b has been an attractive target for drug development due to its essential role in several cellular pathways and diseases such as type 2 diabetes. Focus has been paid to identifying allosteric sites that regulate catalytic activity via altering the dynamics of the active site WPD loop. However, the structural mechanisms underlying the WPD loop opening and closing (which is relatively slow by NMR) remains unclear.\u00a0</p><p>In this paper, the authors sought to identify the structural mechanisms underlying PTP1b loop motion by performing long time scale molecular dynamics (MD) simulations. Starting from existing structures with the WPD loop either open or closed, they are able to derive reasonable estimations of the kinetics of loop opening and closing. They address the question of what structural changes need to occur for the loop to remain open or closed as it fluctuates. Using a random forest approach, they narrow their focus down to the PDFG motifs backbone dihedrals as a set of features sufficient for describing and predicting loop movement between states. The major strength of this paper is reducing the WPD loop conformation (including transient states) down to a set of reaction coordinates in the PDFG motif dihedral angles. Based on this minimum set of features, the committor probabilities provide a strong statistical argument for the transition between open, closed, and transient states along the loop trajectory.</p><p>The major weakness of this paper is that the visualizations describing the PDFG motif switch model are insufficient and confusing and lack an atomic explanation of how these dihedral changes occur in the context of surrounding residues to complement their statistical explanations. This makes it difficult to interpret what the actual transitions look like. We understand that the atomic explanation of this mechanism can be complicated but refer the authors to this paper as an example even though it is a different target and may not be specifically relevant to their work: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/</a> (Fig 3)</p><p>The reaction coordinates alone do not provide a clear direction for envisioning future experiments. Given that this motif is conserved (as the authors explained), other PTP members likely have different structural environments surrounding the motif which likely affects kinetic rates and thermodynamics.\u00a0</p><p>Major Points:</p><ol><li><p>Previous structural studies of PTP\'s have identified atypical open loop conformations in GLEPP1, STEP, and Lyp: <a href="https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub">https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub</a> Fig 3A. These loops adopt a novel loop conformation that is more open compared to PTP1B. Further, the presence of catalytic water molecules that are tightly bound in closed states and absent in open states have been suggested to play a role in the closing of the WPD loop.\u00a0</p><ol><li><p>Can the authors provide comments on how the PDFG motif factors into the novel open loop conformation (would the motif dihedrals still predict loop states in these family members)?\u00a0</p></li><li><p>Were water molecules detected in the binding site and do they play a role during loop closure?</p></li><li><p>Is it possible to include within these simulations mixed solvent MD with a PTP1B substrate to explore their roles in the loop transition?</p></li></ol></li><li><p>"We note that although the PD[F/H]G BLAST search did return matches in other protein families, there was not the structural information corresponding to those matches that would be needed to draw further conclusions on the conformational significance of PD[F/H]G motifs in those families." - We feel this is a missed opportunity to at least do some exploration and cataloging using the alphafold structures of these other families.</p></li><li><p>The authors describe the backbone dihedrals of the PDFG motif as being sufficient and necessary for predicting WPD loop conformation but do not mention the side chain conformations. We feel that the explanation and visualization of the side chain conformations in both open and closed states is unclear as there is no analysis of how these transitions and conformations affect the populations and rate movement of the loop.\u00a0</p><ol><li><p>What do the rotamer conformations and transitions look like for the PDFG during open, closed, and transient WPD loop states?\u00a0</p></li><li><p>How do these rotamer conformations affect loop movements and populations within the simulation?\u00a0</p></li></ol></li></ol><p>It would be insightful if the authors could provide an explanation of the rotamer transitions during loop opening and closing. Understanding these structural changes during substrate binding and catalysis could yield targets for drug development.\u00a0</p><p>Minor Points:</p><ol><li><p>Supplementary figures S2, S3, S4, and S5 have little to no information to adequately explain what is being illustrated. The authors should be more clear in describing what these figures represent. A description of axes, experimental set up, and legends would be helpful.\u00a0</p></li><li><p>The observation that loop fluctuations without long term stability unless the PDFG motif switches is reminiscent of the population shuffling model of conformational changes put forward by Colin Smith - <a href="https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890">https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890</a>. Given the previous NMR data on PTP1B, how does this view alter the interpretation away from a strict two state model?</p></li><li><p>"The free energy estimate from these AWE simulations was \u0394Gclosed-to-open = \u22122.6 \u00b1 0.1 kcal mol-1, indicating that the transition from closed to open states is spontaneous (<a href="https://www.biorxiv.org/content/10.1101/2023.02.28.529746v1.full#F2"><b>Figure 2b</b></a>), a finding that is again consistent with experimental data" We are a bit confused by the language here: is this a thermodynamic or kinetic argument? Secondarily, how do the populations compare to those derived from NMR?</p></li></ol><ol><li><p>As previously discussed in a twitter thread with the authors, the backbone ramachandran regions of the 1SUG structure (closed WPD loop conformation) is not in a region previously known for kinases. It would be helpful if the authors could provide validation that the backbone ramachandran regions of the WPD loop are in agreement with what is known about kinases states and whether this would affect their interpretations.\u00a0</p></li></ol><p><a href="https://twitter.com/RolandDunbrack/status/1632284368650530816">https://twitter.com/RolandDunbrack/status/1632284368650530816</a></p><p>Review by - CJ San Felipe (UCSF) and James Fraser (UCSF)</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>',
                doi: Doi('10.5281/zenodo.7747129'),
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2023-03-17'),
                related_identifiers: [
                  {
                    identifier: '10.1101/2023.02.28.529746',
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                    scheme: 'doi',
                  },
                  { identifier: '10.5281/zenodo.7747128', relation: 'isVersionOf', scheme: 'doi' },
                ],
                resource_type: { type: 'publication', subtype: 'peerreview' },
                title: 'PREreview of "A conserved local structural motif controls the kinetics of PTP1B catalysis"',
              },
            },
          ],
        },
      }),
    },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/my-prereviews', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test('can find and view a review', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 1, hits: [record] } }) },
  )

  fetch
    .getOnce('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
    .get('http://example.com/review.html/content', {
      body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Jingfang Hao et al.' })
    .getByRole('link', { name: 'Read the PREreview by Jingfang Hao et al.' })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test('can find and view a question-based review', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      keywords: ['Structured PREreview'],
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 1, hits: [record] } }) },
  )

  fetch
    .getOnce('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
    .get('http://example.com/review.html/content', {
      body: `
        <dl>
          <div>
            <dt>Does the introduction explain the objective of the research presented in the preprint?</dt>
            <dd>Yes</dd>
            <dd>The aim is clearly explained, and it matches up with what follows.</dd>
          </div>
          <div>
            <dt>Would it benefit from language editing?</dt>
            <dd>No</dd>
          </div>
          <div>
            <dt>Would you recommend this preprint to others?</dt>
            <dd>Yes, but it needs to be improved</dd>
          </div>
          <div>
            <dt>Is it ready for attention from an editor, publisher or broader audience?</dt>
            <dd>Yes, after minor changes</dd>
            <dd>They effectively convey the necessary information, employ appropriate labeling, and utilize suitable visual elements to enhance comprehension.</dd>
          </div>
        </dl>
      `,
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Jingfang Hao et al.' })
    .getByRole('link', { name: 'Read the PREreview by Jingfang Hao et al.' })
    .click()

  await expect(page.getByRole('main')).toContainText(
    'Does the introduction explain the objective of the research presented in the preprint?',
  )
})

test('can find and view comments to a review', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 1, hits: [record] } }) },
  )

  fetch
    .getOnce('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
    .get('http://example.com/review.html/content', {
      body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      {
        body: RecordsC.encode({
          hits: {
            total: 1,
            hits: [
              {
                conceptdoi: Doi('10.5072/zenodo.1061865'),
                conceptrecid: 1061863,
                files: [
                  {
                    links: {
                      self: new URL('http://example.com/comment.html/content'),
                    },
                    key: 'comment.html',
                    size: 58,
                  },
                ],
                id: 1061864,
                links: {
                  latest: new URL('http://example.com/latest'),
                  latest_html: new URL('http://example.com/latest_html'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'PREreviewer' }],
                  description: 'Description',
                  doi: Doi('10.5281/zenodo.1061866'),
                  language: 'eng',
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2022-07-04'),
                  related_identifiers: [
                    {
                      scheme: 'doi',
                      identifier: Doi('10.5072/zenodo.1061864'),
                      relation: 'references',
                      resource_type: 'publication-peerreview',
                    },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'other',
                  },
                  title: 'Title',
                },
              },
            ],
          },
        }),
      },
    )
    .get('http://example.com/comment.html/content', {
      body: '<h1>Some title in the comment</h1><p>... some comment text ...</p>',
    })

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Jingfang Hao et al.' })
    .getByRole('link', { name: 'Read the PREreview by Jingfang Hao et al.' })
    .click()

  await expect(page.getByRole('article', { name: 'Comments', exact: true })).toContainText('some comment text')
})

test("can find and view a review that's part of a club", async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      contributors: [{ type: 'ResearchGroup', name: 'ASAPbio Metabolism Crowd' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.get(
    {
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { q: 'related.identifier:"10.1101/2022.01.13.476201"' },
    },
    { body: RecordsC.encode({ hits: { total: 1, hits: [record] } }) },
  )

  fetch
    .getOnce('http://zenodo.test/api/records/1061864', { body: RecordC.encode(record) })
    .get('http://example.com/review.html/content', {
      body: '<h1>Some title</h1><p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page.goto('/preprints/doi-10.1101-2022.01.13.476201', { waitUntil: 'commit' })
  await page
    .getByRole('article', { name: 'PREreview by Jingfang Hao et al. of ASAPbio Metabolism Crowd' })
    .getByRole('link', { name: 'Read the PREreview by Jingfang Hao et al. of ASAPbio Metabolism Crowd' })
    .click()

  await expect(page.getByRole('main')).toContainText('of ASAPbio Metabolism Crowd')
})

test('can view a recent review', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch
    .getOnce('http://zenodo.test/api/records/7747129', { body: RecordC.encode(record) })
    .getOnce('http://example.com/review.html/content', {
      body: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page.goto('/', { waitUntil: 'commit' })
  await page
    .getByRole('region', { name: 'Recent PREreviews' })
    .getByRole('link', {
      name: 'CJ San Felipe reviewed A conserved local structural motif controls the kinetics of PTP1B catalysis',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test("can view a recent review that's part of a club", async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      contributors: [{ type: 'ResearchGroup', name: 'ASAPbio Metabolism Crowd' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch
    .getOnce('http://zenodo.test/api/records/7820084', { body: RecordC.encode(record) })
    .getOnce('http://example.com/review.html/content', {
      body: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page.goto('/', { waitUntil: 'commit' })
  await page
    .getByRole('region', { name: 'Recent PREreviews' })
    .getByRole('link', {
      name: 'Jaeyoung Oh of ASAPbio Metabolism Crowd reviewed The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('of ASAPbio Metabolism Crowd')
  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test('can view an older review', async ({ fetch, javaScriptEnabled, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      notes: '<p>Some change.</p>',
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch
    .getOnce('http://zenodo.test/api/records/7747129', { body: RecordC.encode(record) })
    .getOnce('http://example.com/review.html/content', {
      body: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  await expect(page).toHaveTitle('Recent PREreviews (page 1) | PREreview')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recent PREreviews')
  await expect(page.getByRole('link', { name: 'Older' })).toHaveAttribute('rel', 'next')

  if (javaScriptEnabled) {
    await page.getByRole('button', { name: 'Menu' }).click()

    await expect(page.getByRole('link', { name: 'Reviews', exact: true })).toHaveAttribute('aria-current', 'page')
  }

  await page.getByRole('link', { name: 'Older' }).click()

  await expect(page).toHaveTitle('Recent PREreviews (page 2) | PREreview')
  await expect(page.getByRole('link', { name: 'Newer' })).toHaveAttribute('rel', 'prev')

  await page
    .getByRole('link', {
      name: 'CJ San Felipe reviewed A conserved local structural motif controls the kinetics of PTP1B catalysis',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
  await expect(page.getByRole('main')).toContainText('Addendum Some change.')
})

test("can view an older review that's part of a club", async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      contributors: [{ type: 'ResearchGroup', name: 'ASAPbio Metabolism Crowd' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch
    .getOnce('http://zenodo.test/api/records/7820084', { body: RecordC.encode(record) })
    .getOnce('http://example.com/review.html/content', {
      body: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
    })
    .getOnce(
      {
        name: 'comments',
        url: 'http://zenodo.test/api/communities/prereview-reviews/records',
        query: { q: 'related.identifier:"10.5072/zenodo.1061864" AND related.relation:"references"' },
      },
      { body: RecordsC.encode({ hits: { total: 0, hits: [] } }) },
    )

  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recent PREreviews')

  await page
    .getByRole('link', {
      name: 'Jaeyoung Oh of ASAPbio Metabolism Crowd reviewed The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    })
    .click()

  await expect(page.getByRole('main')).toContainText('of ASAPbio Metabolism Crowd')
  await expect(page.getByRole('main')).toContainText('This work enriches the knowledge')
})

test('can find an older review of a certain preprint', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  const filters = page.getByRole('search', { name: 'Filter' })

  await expect(page).toHaveTitle('Recent PREreviews (page 1) | PREreview')
  await expect(filters.getByLabel('Title or author')).toHaveValue('')

  await filters.getByLabel('Title or author').fill('Chlamydomonas reinhardtii')
  await filters.getByRole('button', { name: 'Filter results' }).click()

  await expect(page).toHaveTitle('Recent PREreviews (Chlamydomonas reinhardtii, page 1) | PREreview')
  await expect(filters.getByLabel('Title or author')).toHaveValue('Chlamydomonas reinhardtii')
})

test('can view an older review in a specific language', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  const filters = page.getByRole('search', { name: 'Filter' })

  await expect(page).toHaveTitle('Recent PREreviews (page 1) | PREreview')
  await expect(filters.getByLabel('Language').locator('[selected]')).toHaveText('Any')

  await filters.getByLabel('Language').selectOption('English')
  await filters.getByRole('button', { name: 'Filter results' }).click()

  await expect(page).toHaveTitle('Recent PREreviews (English, page 1) | PREreview')
  await expect(filters.getByLabel('Language').locator('[selected]')).toHaveText('English')
})

test('can view an older review in a specific field', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' })
  await page.getByRole('link', { name: 'See all reviews' }).click()

  const filters = page.getByRole('search', { name: 'Filter' })

  await expect(page).toHaveTitle('Recent PREreviews (page 1) | PREreview')
  await expect(filters.getByLabel('Field').locator('[selected]')).toHaveText('Any')

  await filters.getByLabel('Field').selectOption('Immunology and Microbiology')
  await filters.getByRole('button', { name: 'Filter results' }).click()

  await expect(page).toHaveTitle('Recent PREreviews (Immunology and Microbiology, page 1) | PREreview')
  await expect(filters.getByLabel('Field').locator('[selected]')).toHaveText('Immunology and Microbiology')
})

test('might not load the older reviews in time', async ({ fetch, page }) => {
  fetch.get(
    {
      name: 'recent-prereviews',
      url: 'http://zenodo.test/api/communities/prereview-reviews/records',
      query: { size: 5, sort: 'publication-desc', resource_type: 'publication::publication-peerreview' },
    },
    {
      body: RecordsC.encode({
        hits: {
          total: 6,
          hits: [
            {
              conceptdoi: Doi('10.5281/zenodo.7820083'),
              conceptrecid: 7820083,
              files: [
                {
                  key: 'review.html',
                  links: {
                    self: new URL(
                      'https://zenodo.org/api/files/77ec063f-e37c-4739-8bc5-d7bba268bbd5/review.html/content',
                    ),
                  },
                  size: 2538,
                },
              ],
              id: 7820084,
              links: {
                latest: new URL('https://zenodo.org/api/records/7820084'),
                latest_html: new URL('https://zenodo.org/record/7820084'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Jaeyoung Oh', orcid: Orcid('0009-0008-9257-4728') }],
                description:
                  "<p>The main question that this preprint seeks to answer is whether or not Nirmatrelvir plus ritonavir, used as a treatment for non-hospitalized vaccinated patients, was effective at preventing long COVID symptoms. Overall, the paper found that NMV-r was indeed associated with a reduction in symptoms of long COVID. The findings of this paper are novel, as there has been research conducted on NMV-r's effect on COVID symptoms, but this is the first time its effect on long COVID has been investigated. The results are likely to lead to future research, as the findings are novel and relevant to helping solve a large issue in long COVID. I would say that sufficient detail is provided to allow reproduction of the study. Where the data was taken from and how it was analyzed is described in great detail. I do not have the expertise needed to determine if the methods and statistics are appropriate for the analysis, so I am unsure but they seem logical and is an area that other reviewers could check. The principal conclusions are supported by the data and analysis. The manuscript does discuss limitations. It highlights that there could be significant biases in the data due to differences between the groups receiving and not receiving treatment. The authors claim that they used propensity matching to control for these limitations in the data, but admit that there could still be residual confounding. In addition, the authors also point out that the findings could change depending on the definition of long COVID used. The authors say that their definitions of long COVID may have lacked precision and been too inclusive. The authors say that a more accurate result could be obtained from data from original placebo-controlled trials. The authors have not discussed ethical concerns.  The manuscript does not include new data. It gets its data from the TriNetX Analytics Network. The authors say that more can be found about this database online. I would recommend this manuscript to others due to its novel findings and its potential contributions to finding effective treatments for long COVID. I highly recommend this manuscript for peer review.</p><p>My only concerns with this manuscript would be that the data does not come from placebo-controlled trials and only from electronic health records. However, the authors have already addressed this concern. </p><p>I do not have any competing interests.</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>",
                doi: Doi('10.5281/zenodo.7820084'),
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2023-04-12'),
                related_identifiers: [
                  {
                    identifier: '10.1101/2022.01.13.476201',
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                    scheme: 'doi',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'peerreview',
                },
                title:
                  'PREreview of "Incidence of Symptoms Associated with Post-Acute Sequelae of SARS-CoV-2 infection in Non-Hospitalized Vaccinated Patients Receiving Nirmatrelvir-Ritonavir"',
              },
            },
            {
              conceptdoi: Doi('10.5281/zenodo.7747128'),
              conceptrecid: 7747128,
              files: [
                {
                  key: 'review.html',
                  links: {
                    self: new URL(
                      'https://zenodo.org/api/files/7ff8c56b-1755-40c7-800d-d64b886ae153/review.html/content',
                    ),
                  },
                  size: 7043,
                },
              ],
              id: 7747129,
              links: {
                latest: new URL('https://zenodo.org/api/records/7747129'),
                latest_html: new URL('https://zenodo.org/record/7747129'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'CJ San Felipe', orcid: Orcid('0000-0002-2695-5951') }],
                description:
                  '<p>PTP1b has been an attractive target for drug development due to its essential role in several cellular pathways and diseases such as type 2 diabetes. Focus has been paid to identifying allosteric sites that regulate catalytic activity via altering the dynamics of the active site WPD loop. However, the structural mechanisms underlying the WPD loop opening and closing (which is relatively slow by NMR) remains unclear.\u00a0</p><p>In this paper, the authors sought to identify the structural mechanisms underlying PTP1b loop motion by performing long time scale molecular dynamics (MD) simulations. Starting from existing structures with the WPD loop either open or closed, they are able to derive reasonable estimations of the kinetics of loop opening and closing. They address the question of what structural changes need to occur for the loop to remain open or closed as it fluctuates. Using a random forest approach, they narrow their focus down to the PDFG motifs backbone dihedrals as a set of features sufficient for describing and predicting loop movement between states. The major strength of this paper is reducing the WPD loop conformation (including transient states) down to a set of reaction coordinates in the PDFG motif dihedral angles. Based on this minimum set of features, the committor probabilities provide a strong statistical argument for the transition between open, closed, and transient states along the loop trajectory.</p><p>The major weakness of this paper is that the visualizations describing the PDFG motif switch model are insufficient and confusing and lack an atomic explanation of how these dihedral changes occur in the context of surrounding residues to complement their statistical explanations. This makes it difficult to interpret what the actual transitions look like. We understand that the atomic explanation of this mechanism can be complicated but refer the authors to this paper as an example even though it is a different target and may not be specifically relevant to their work: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1450098/</a> (Fig 3)</p><p>The reaction coordinates alone do not provide a clear direction for envisioning future experiments. Given that this motif is conserved (as the authors explained), other PTP members likely have different structural environments surrounding the motif which likely affects kinetic rates and thermodynamics.\u00a0</p><p>Major Points:</p><ol><li><p>Previous structural studies of PTP\'s have identified atypical open loop conformations in GLEPP1, STEP, and Lyp: <a href="https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub">https://www.sciencedirect.com/science/article/pii/S0092867408015134?via%3Dihub</a> Fig 3A. These loops adopt a novel loop conformation that is more open compared to PTP1B. Further, the presence of catalytic water molecules that are tightly bound in closed states and absent in open states have been suggested to play a role in the closing of the WPD loop.\u00a0</p><ol><li><p>Can the authors provide comments on how the PDFG motif factors into the novel open loop conformation (would the motif dihedrals still predict loop states in these family members)?\u00a0</p></li><li><p>Were water molecules detected in the binding site and do they play a role during loop closure?</p></li><li><p>Is it possible to include within these simulations mixed solvent MD with a PTP1B substrate to explore their roles in the loop transition?</p></li></ol></li><li><p>"We note that although the PD[F/H]G BLAST search did return matches in other protein families, there was not the structural information corresponding to those matches that would be needed to draw further conclusions on the conformational significance of PD[F/H]G motifs in those families." - We feel this is a missed opportunity to at least do some exploration and cataloging using the alphafold structures of these other families.</p></li><li><p>The authors describe the backbone dihedrals of the PDFG motif as being sufficient and necessary for predicting WPD loop conformation but do not mention the side chain conformations. We feel that the explanation and visualization of the side chain conformations in both open and closed states is unclear as there is no analysis of how these transitions and conformations affect the populations and rate movement of the loop.\u00a0</p><ol><li><p>What do the rotamer conformations and transitions look like for the PDFG during open, closed, and transient WPD loop states?\u00a0</p></li><li><p>How do these rotamer conformations affect loop movements and populations within the simulation?\u00a0</p></li></ol></li></ol><p>It would be insightful if the authors could provide an explanation of the rotamer transitions during loop opening and closing. Understanding these structural changes during substrate binding and catalysis could yield targets for drug development.\u00a0</p><p>Minor Points:</p><ol><li><p>Supplementary figures S2, S3, S4, and S5 have little to no information to adequately explain what is being illustrated. The authors should be more clear in describing what these figures represent. A description of axes, experimental set up, and legends would be helpful.\u00a0</p></li><li><p>The observation that loop fluctuations without long term stability unless the PDFG motif switches is reminiscent of the population shuffling model of conformational changes put forward by Colin Smith - <a href="https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890">https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201408890</a>. Given the previous NMR data on PTP1B, how does this view alter the interpretation away from a strict two state model?</p></li><li><p>"The free energy estimate from these AWE simulations was \u0394Gclosed-to-open = \u22122.6 \u00b1 0.1 kcal mol-1, indicating that the transition from closed to open states is spontaneous (<a href="https://www.biorxiv.org/content/10.1101/2023.02.28.529746v1.full#F2"><b>Figure 2b</b></a>), a finding that is again consistent with experimental data" We are a bit confused by the language here: is this a thermodynamic or kinetic argument? Secondarily, how do the populations compare to those derived from NMR?</p></li></ol><ol><li><p>As previously discussed in a twitter thread with the authors, the backbone ramachandran regions of the 1SUG structure (closed WPD loop conformation) is not in a region previously known for kinases. It would be helpful if the authors could provide validation that the backbone ramachandran regions of the WPD loop are in agreement with what is known about kinases states and whether this would affect their interpretations.\u00a0</p></li></ol><p><a href="https://twitter.com/RolandDunbrack/status/1632284368650530816">https://twitter.com/RolandDunbrack/status/1632284368650530816</a></p><p>Review by - CJ San Felipe (UCSF) and James Fraser (UCSF)</p>\n\n    Competing interests\n\n    <p>\n      The author declares that they have no competing interests.\n    </p>',
                doi: Doi('10.5281/zenodo.7747129'),
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2023-03-17'),
                related_identifiers: [
                  {
                    identifier: '10.1101/2023.02.28.529746',
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                    scheme: 'doi',
                  },
                  { identifier: '10.5281/zenodo.7747128', relation: 'isVersionOf', scheme: 'doi' },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'peerreview',
                },
                title: 'PREreview of "A conserved local structural motif controls the kinetics of PTP1B catalysis"',
              },
            },
          ],
        },
      }),
    },
    { delay: Duration.toMillis('2.5 seconds'), overwriteRoutes: true },
  )

  await page.goto('/reviews', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test('might not load the PREreview in time', async ({ fetch, page }) => {
  const record: Record = {
    conceptdoi: Doi('10.5072/zenodo.1061863'),
    conceptrecid: 1061863,
    files: [
      {
        links: {
          self: new URL('http://example.com/review.html/content'),
        },
        key: 'review.html',
        size: 58,
      },
    ],
    id: 1061864,
    links: {
      latest: new URL('http://example.com/latest'),
      latest_html: new URL('http://example.com/latest_html'),
    },
    metadata: {
      access_right: 'open',
      communities: [{ id: 'prereview-reviews' }],
      creators: [
        { name: 'Jingfang Hao', orcid: Orcid('0000-0003-4436-3420') },
        { name: 'Pierrick Bru', orcid: Orcid('0000-0001-5854-0905') },
        { name: 'Alizée Malnoë', orcid: Orcid('0000-0002-8777-3174') },
        { name: 'Aurélie Crepin', orcid: Orcid('0000-0002-4754-6823') },
        { name: 'Jack Forsman', orcid: Orcid('0000-0002-5111-8901') },
        { name: 'Domenica Farci', orcid: Orcid('0000-0002-3691-2699') },
      ],
      description: '<p>... its quenching capacity. This work enriches the knowledge about the impact ...</p>',
      doi: Doi('10.5072/zenodo.1061864'),
      license: { id: 'cc-by-4.0' },
      publication_date: new Date('2022-07-05'),
      related_identifiers: [
        {
          identifier: '10.1101/2022.01.13.476201',
          relation: 'reviews',
          resource_type: 'publication-preprint',
          scheme: 'doi',
        },
        {
          identifier: '10.5072/zenodo.1061863',
          relation: 'isVersionOf',
          scheme: 'doi',
        },
      ],
      resource_type: {
        type: 'publication',
        subtype: 'peerreview',
      },
      title: 'PREreview of The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii',
    },
  }

  fetch.getOnce(
    'http://zenodo.test/api/records/1061864',
    { body: RecordC.encode(record) },
    { delay: Duration.toMillis('2.5 seconds') },
  )

  await page.goto('/reviews/1061864', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorry, we’re having problems')
})

test.extend(prereviewWasRemoved)('when the PREreview was removed', async ({ page }) => {
  await page.goto('/reviews/12345678', { waitUntil: 'commit' })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PREreview removed')
})

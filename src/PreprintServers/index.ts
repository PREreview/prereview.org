import { match } from 'ts-pattern'
import type { PreprintId } from '../types/preprint-id.js'

export const getName = (preprintId: PreprintId) =>
  match(preprintId.type)
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
    .with('neurolibre', () => 'NeuroLibre')
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
    .with('ssrn', () => 'SSRN')
    .with('techrxiv', () => 'TechRxiv')
    .with('verixiv', () => 'VeriXiv')
    .with('zenodo', () => 'Zenodo')
    .exhaustive()

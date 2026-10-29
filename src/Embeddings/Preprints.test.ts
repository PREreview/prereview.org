import { Effect } from 'effect'
import type { SqlClient } from '@effect/sql'
import { describe, expect, it } from 'vitest'
import { findExistingDois, storeEmbeddings } from './Preprints.ts'
import type { Embedding } from './Shared.ts'
import type { LanguageCode } from 'iso-639-1'
import { Doi } from '../types/Doi.ts'
import { OrcidId } from '../types/OrcidId.ts'

const makeFakeSql = (rows: ReadonlyArray<Record<string, unknown>> = []) => {
  const queries: Array<{ sql: string; params: ReadonlyArray<unknown> }> = []

  const render = (value: unknown): string => {
    if (value !== null && typeof value === 'object' && '__text' in value) {
      return (value as { __text: string }).__text
    }
    if (Array.isArray(value)) return `[${value.map(render).join(', ')}]`
    return String(value)
  }

  const statement = (strings: TemplateStringsArray, ...args: Array<unknown>) => {
    const text = strings.reduce((acc, part, i) => acc + part + (i < args.length ? render(args[i]) : ''), '')
    queries.push({ sql: text, params: args })
    return Object.assign(Effect.succeed(rows), { __text: text })
  }

  const sql = Object.assign(statement as unknown as SqlClient.SqlClient, {
    in: (column: string, values: ReadonlyArray<unknown>) => ({
      __text: `${column} IN (${values.map(render).join(', ')})`,
    }),
    join:
      (separator: string, addParens = true) =>
      (clauses: ReadonlyArray<unknown>) => {
        const joined = clauses.map(render).join(separator)
        return { __text: addParens ? `(${joined})` : joined }
      },
  })

  return { sql, queries }
}

describe('findExistingDois', () => {
  it('returns the lowercased DOIs already present in one batched query', async () => {
    const { sql, queries } = makeFakeSql([{ doi: '10.1/ALREADY' }, { doi: '10.1/stored' }])

    const result = await Effect.runPromise(
      findExistingDois([Doi('10.1/already'), Doi('10.1/missing'), Doi('10.1/Stored')], sql),
    )

    expect(result).toEqual(new Set(['10.1/already', '10.1/stored']))
    expect(queries).toHaveLength(1)
    expect(queries[0]!.sql).toContain('SELECT doi FROM preprints')
    expect(queries[0]!.sql).toContain('WHERE doi IN (10.1/already, 10.1/missing, 10.1/stored)')
  })

  it('returns an empty set without querying when given no DOIs', async () => {
    const { sql, queries } = makeFakeSql()

    const result = await Effect.runPromise(findExistingDois([], sql))

    expect(result.size).toBe(0)
    expect(queries).toHaveLength(0)
  })
})

describe('storeEmbeddings', () => {
  interface EmbeddingRow {
    doi: Doi
    language: LanguageCode
    authors: ReadonlyArray<OrcidId>
    embedding: Embedding
  }

  const row = (
    doi: Doi,
    language: LanguageCode = 'en',
    authors: ReadonlyArray<OrcidId> = [OrcidId('0000-0001-1111-1111')],
  ): EmbeddingRow => ({
    doi,
    language,
    authors,
    embedding: new Float32Array([1, 2, 3]),
  })

  it('inserts all rows in one multi-row statement with lowercased DOIs', async () => {
    const { sql, queries } = makeFakeSql()

    await Effect.runPromise(storeEmbeddings([row(Doi('10.1/A')), row(Doi('10.1/B'))], sql))

    const insert = queries.at(-1)!
    expect(insert.sql).toContain('INSERT INTO preprints (doi, language, authors, embedding)')
    expect(insert.sql).toContain('(10.1/a, en, [0000-0001-1111-1111], [1,2,3]::halfvec)')
    expect(insert.sql).toContain('(10.1/b, en, [0000-0001-1111-1111], [1,2,3]::halfvec)')
    expect(insert.sql).toContain('ON CONFLICT (doi) DO NOTHING')
  })

  it('does nothing for an empty list', async () => {
    const { sql, queries } = makeFakeSql()

    await Effect.runPromise(storeEmbeddings([], sql))

    expect(queries).toHaveLength(0)
  })
})

import { Effect } from 'effect'
import type { SqlClient } from '@effect/sql'
import { describe, expect, it } from 'vitest'
import { findExistingDois, storeEmbeddings } from '../../src/Embeddings/WorksWithRequests.ts'
import type { Embedding } from '../../src/Embeddings/Shared.ts'
import type { LanguageCode } from 'iso-639-1'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'

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
    const text = strings
      .reduce((acc, part, i) => acc + part + (i < args.length ? render(args[i]) : ''), '')
      .replaceAll(/\s+/g, ' ')
      .replaceAll('( ', '(')
      .replaceAll(' )', ')')
      .trim()
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
    const { sql, queries } = makeFakeSql([{ doi: '10.10/ALREADY' }, { doi: '10.10/stored' }])

    const result = await Effect.runPromise(
      findExistingDois([Doi('10.10/already'), Doi('10.10/missing'), Doi('10.10/Stored')], sql),
    )

    expect(result).toEqual(new Set(['10.10/already', '10.10/stored']))
    expect(queries).toHaveLength(1)
    expect(queries[0]!.sql).toContain('SELECT doi FROM request_embeddings')
    expect(queries[0]!.sql).toContain('WHERE doi IN (10.10/already, 10.10/missing, 10.10/stored)')
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
    authors: ReadonlyArray<OrcidId> = [OrcidId('0000-0002-1825-0097')],
  ): EmbeddingRow => ({
    doi,
    language,
    authors,
    embedding: new Float32Array([1, 2, 3]),
  })

  it('inserts all rows in one multi-row statement with lowercased DOIs', async () => {
    const { sql, queries } = makeFakeSql()

    await Effect.runPromise(storeEmbeddings([row(Doi('10.10/A')), row(Doi('10.10/B'))], sql))

    const insert = queries.at(-1)!
    expect(insert.sql).toContain('INSERT INTO request_embeddings (doi, language, authors, embedding)')
    expect(insert.sql).toContain('(10.10/a, en, [0000-0002-1825-0097], [1,2,3]::halfvec)')
    expect(insert.sql).toContain('(10.10/b, en, [0000-0002-1825-0097], [1,2,3]::halfvec)')
    expect(insert.sql).toContain('ON CONFLICT (doi) DO NOTHING')
  })

  it('does nothing for an empty list', async () => {
    const { sql, queries } = makeFakeSql()

    await Effect.runPromise(storeEmbeddings([], sql))

    expect(queries).toHaveLength(0)
  })
})

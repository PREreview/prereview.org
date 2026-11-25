import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const isModule = new Map()

const isModuleDirectory = directory => {
  let known = isModule.get(directory)

  if (known === undefined) {
    known = existsSync(path.join(directory, 'index.ts'))
    isModule.set(directory, known)
  }

  return known
}

const contains = (directory, file) => {
  const relative = path.relative(directory, file)

  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

const moduleBoundaryCrossedBy = (importer, target, groups) => {
  let crossed
  let directory = path.dirname(target)

  while (contains(root, directory)) {
    const isGroup = groups.has(path.relative(root, directory))

    if (
      isModuleDirectory(directory) &&
      !contains(directory, importer) &&
      (!isGroup || directory === path.dirname(target))
    ) {
      crossed = directory
    }

    directory = path.dirname(directory)
  }

  return crossed
}

export default {
  meta: { name: 'module-boundaries' },
  rules: {
    'use-index': {
      meta: {
        schema: [
          {
            type: 'object',
            properties: {
              allow: { type: 'array', items: { type: 'string' } },
              groups: { type: 'array', items: { type: 'string' } },
            },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        const allow = new Set(context.options[0]?.allow ?? [])
        const groups = new Set(context.options[0]?.groups ?? [])
        const importer = context.filename

        const check = node => {
          const specifier = node.source?.value

          if (typeof specifier !== 'string' || !specifier.startsWith('.')) {
            return
          }

          const target = path.resolve(path.dirname(importer), specifier)
          const module = moduleBoundaryCrossedBy(importer, target, groups)

          if (module === undefined || target === path.join(module, 'index.ts')) {
            return
          }

          const name = path.relative(root, module)

          if (allow.has(name)) {
            return
          }

          context.report({
            node: node.source,
            message: `'${path.relative(root, target)}' is internal to '${name}'; import from '${name}/index.ts' instead.`,
          })
        }

        return {
          ImportDeclaration: check,
          ImportExpression: check,
          ExportAllDeclaration: check,
          ExportNamedDeclaration: check,
        }
      },
    },
  },
}

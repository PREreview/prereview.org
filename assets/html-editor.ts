import boldIcon from 'remixicon/icons/Editor/bold.svg'
import heading1Icon from 'remixicon/icons/Editor/h-1.svg'
import heading2Icon from 'remixicon/icons/Editor/h-2.svg'
import heading3Icon from 'remixicon/icons/Editor/h-3.svg'
import italicIcon from 'remixicon/icons/Editor/italic.svg'
import linkIcon from 'remixicon/icons/Editor/link.svg'
import numberedListIcon from 'remixicon/icons/Editor/list-ordered.svg'
import bulletedListIcon from 'remixicon/icons/Editor/list-unordered.svg'
import subscriptIcon from 'remixicon/icons/Editor/subscript.svg'
import superscriptIcon from 'remixicon/icons/Editor/superscript.svg'
import { disableButton, enableButton, getLocale, preventDefault } from './dom.ts'

const translateDep = import('./locales/index.ts')

const deps = Promise.all([
  import('@tiptap/core'),
  import('@tiptap/extension-subscript'),
  import('@tiptap/extension-superscript'),
  import('@tiptap/extension-typography'),
  import('@tiptap/starter-kit'),
])

export class HtmlEditor extends HTMLElement {
  static element = 'html-editor' as const

  async connectedCallback() {
    const textArea = this.firstElementChild

    if (!(textArea instanceof HTMLTextAreaElement)) {
      throw new Error('No text area')
    }

    const form = textArea.form

    if (!(form instanceof HTMLFormElement)) {
      throw new Error('No form')
    }

    const buttons = form.querySelectorAll('button')
    buttons.forEach(disableButton)
    form.addEventListener('submit', preventDefault)

    const container = document.createElement('div')
    container.setAttribute('aria-busy', 'true')
    container.append(...this.children)
    this.append(container)

    textArea.readOnly = true

    const { translate } = await translateDep

    const locale = getLocale(this)

    const status = document.createElement('div')
    status.classList.add('loading', 'visually-hidden')
    const statusText = document.createElement('span')
    statusText.textContent = translate(locale, 'html-editor', 'loading')()
    status.append(statusText)
    this.append(status)

    setTimeout(() => status.classList.remove('visually-hidden'), 100)

    const toolbarButtons = Promise.all([
      createButton(translate(locale, 'html-editor', 'bold')(), boldIcon),
      createButton(translate(locale, 'html-editor', 'italic')(), italicIcon),
      createButton(translate(locale, 'html-editor', 'subscript')(), subscriptIcon),
      createButton(translate(locale, 'html-editor', 'superscript')(), superscriptIcon),
      createButton(translate(locale, 'html-editor', 'link')(), linkIcon),
      createButton(translate(locale, 'html-editor', 'headingLevel1')(), heading1Icon),
      createButton(translate(locale, 'html-editor', 'headingLevel2')(), heading2Icon),
      createButton(translate(locale, 'html-editor', 'headingLevel3')(), heading3Icon),
      createButton(translate(locale, 'html-editor', 'bulletedList')(), bulletedListIcon),
      createButton(translate(locale, 'html-editor', 'numberedList')(), numberedListIcon),
    ])

    const toolbar = document.createElement('editor-toolbar')
    toolbar.setAttribute('aria-controls', textArea.id)
    toolbar.setAttribute('aria-label', translate(locale, 'html-editor', 'formatting')())

    const formatting = document.createElement('div')
    formatting.setAttribute('role', 'group')

    const styles = document.createElement('div')
    styles.setAttribute('role', 'group')

    const input = textArea.nextElementSibling instanceof HTMLTextAreaElement ? textArea.nextElementSibling : textArea

    const [{ Editor }, { Subscript }, { Superscript }, { Typography }, { StarterKit }] = await deps

    const [bold, italic, subscript, superscript, link, heading1, heading2, heading3, bulletedList, numberedList] =
      await toolbarButtons

    formatting.append(bold, italic, subscript, superscript)
    styles.append(heading1, heading2, heading3, bulletedList, numberedList)
    toolbar.append(formatting, link, styles)

    const editor = new Editor({
      editorProps: {
        attributes: {
          'aria-labelledby': replaceLabels(textArea)
            .map(label => label.id)
            .join(' '),
          'aria-multiline': 'true',
          id: textArea.id,
          role: 'textbox',
          ...extractAttributes(textArea, ['aria-describedby', 'aria-errormessage', 'aria-invalid']),
        },
      },
      element: container,
      extensions: [
        StarterKit.configure({
          blockquote: false,
          code: false,
          codeBlock: false,
          hardBreak: false,
          heading: {
            levels: [1, 2, 3],
          },
          horizontalRule: false,
          link: {
            openOnClick: false,
          },
          strike: false,
        }),
        Subscript.extend({
          excludes: 'superscript',
        }),
        Superscript.extend({
          excludes: 'subscript',
        }),
        Typography,
      ],
      content: new DOMParser().parseFromString(input.innerHTML, 'text/html').documentElement.textContent,
    })

    editor.on('create', () => {
      status.hidden = true
      container.setAttribute('aria-busy', 'false')
      form.removeEventListener('submit', preventDefault)
      buttons.forEach(enableButton)
    })

    editor.on('transaction', () => {
      bold.setAttribute('aria-pressed', editor.isActive('bold') ? 'true' : 'false')
      bold.setAttribute('aria-disabled', editor.can().toggleBold() ? 'false' : 'true')
      italic.setAttribute('aria-pressed', editor.isActive('italic') ? 'true' : 'false')
      italic.setAttribute('aria-disabled', editor.can().toggleItalic() ? 'false' : 'true')
      subscript.setAttribute('aria-pressed', editor.isActive('subscript') ? 'true' : 'false')
      subscript.setAttribute(
        'aria-disabled',
        editor.can().toggleSubscript() || editor.can().toggleSuperscript() ? 'false' : 'true',
      )
      superscript.setAttribute('aria-pressed', editor.isActive('superscript') ? 'true' : 'false')
      superscript.setAttribute(
        'aria-disabled',
        editor.can().toggleSuperscript() || editor.can().toggleSubscript() ? 'false' : 'true',
      )
      link.setAttribute('aria-pressed', editor.isActive('link') ? 'true' : 'false')
      link.setAttribute(
        'aria-disabled',
        editor.can().toggleLink({ href: '' }) && (!editor.state.selection.empty || editor.isActive('link'))
          ? 'false'
          : 'true',
      )
      heading1.setAttribute('aria-pressed', editor.isActive('heading', { level: 1 }) ? 'true' : 'false')
      heading1.setAttribute('aria-disabled', editor.can().toggleHeading({ level: 1 }) ? 'false' : 'true')
      heading2.setAttribute('aria-pressed', editor.isActive('heading', { level: 2 }) ? 'true' : 'false')
      heading2.setAttribute('aria-disabled', editor.can().toggleHeading({ level: 2 }) ? 'false' : 'true')
      heading3.setAttribute('aria-pressed', editor.isActive('heading', { level: 3 }) ? 'true' : 'false')
      heading3.setAttribute('aria-disabled', editor.can().toggleHeading({ level: 3 }) ? 'false' : 'true')
      bulletedList.setAttribute('aria-pressed', editor.isActive('bulletList') ? 'true' : 'false')
      bulletedList.setAttribute(
        'aria-disabled',
        editor.can().toggleBulletList() || editor.can().toggleOrderedList() ? 'false' : 'true',
      )
      numberedList.setAttribute('aria-pressed', editor.isActive('orderedList') ? 'true' : 'false')
      numberedList.setAttribute(
        'aria-disabled',
        editor.can().toggleOrderedList() || editor.can().toggleBulletList() ? 'false' : 'true',
      )
    })

    bold.addEventListener('click', () => {
      if (bold.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleBold().run()
    })

    italic.addEventListener('click', () => {
      if (italic.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleItalic().run()
    })

    subscript.addEventListener('click', () => {
      if (subscript.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleSubscript().run()
    })

    link.addEventListener('click', () => {
      if (link.getAttribute('aria-disabled') === 'true') {
        return
      }

      if (editor.isActive('link')) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }

      const href = window.prompt(translate(locale, 'html-editor', 'enterAUrl')())

      if (typeof href !== 'string' || href === '') {
        return
      }

      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    })

    heading1.addEventListener('click', () => {
      if (heading1.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleHeading({ level: 1 }).run()
    })

    heading2.addEventListener('click', () => {
      if (heading2.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleHeading({ level: 2 }).run()
    })

    heading3.addEventListener('click', () => {
      if (heading3.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleHeading({ level: 3 }).run()
    })

    bulletedList.addEventListener('click', () => {
      if (bulletedList.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleBulletList().run()
    })

    superscript.addEventListener('click', () => {
      if (superscript.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleSuperscript().run()
    })

    numberedList.addEventListener('click', () => {
      if (numberedList.getAttribute('aria-disabled') === 'true') {
        return
      }

      editor.chain().focus().toggleOrderedList().run()
    })

    editor.on('create', () => {
      const html = editor.getHTML()

      textArea.innerText = html !== '<p></p>' ? html : ''
    })

    editor.on('update', ({ editor }) => {
      const html = editor.getHTML()

      textArea.innerText = html !== '<p></p>' ? html : ''
    })

    if (textArea.isSameNode(document.activeElement)) {
      editor.commands.focus('start', { scrollIntoView: false })
    }

    container.insertBefore(toolbar, editor.view.dom)
    textArea.hidden = true
    removeAttributes(textArea, ['aria-describedby', 'aria-errormessage', 'aria-invalid', 'id'])
  }
}

window.customElements.define(HtmlEditor.element, HtmlEditor)

declare global {
  interface HTMLElementTagNameMap {
    [HtmlEditor.element]: HtmlEditor
  }
}

function replaceLabels(source: HTMLTextAreaElement) {
  return [...source.labels].map(label => {
    const replacement = document.createElement('span')
    replacement.append(...label.childNodes)
    replacement.id = label.id

    label.replaceWith(replacement)

    return replacement
  })
}

function extractAttributes(source: Element, qualifiedNames: ReadonlyArray<string>): Record<string, string> {
  return Object.fromEntries(
    qualifiedNames.flatMap(qualifiedName => {
      const value = source.getAttribute(qualifiedName)

      if (typeof value !== 'string') {
        return []
      }

      return [[qualifiedName, value]]
    }),
  )
}

function removeAttributes(source: Element, qualifiedNames: ReadonlyArray<string>) {
  qualifiedNames.forEach(qualifiedName => source.removeAttribute(qualifiedName))
}

function fetchSvg(path: string) {
  return fetch(path, { mode: 'same-origin' })
    .then(response => response.text())
    .then(body => {
      const svg = document.createRange().createContextualFragment(body).firstElementChild

      if (!(svg instanceof SVGSVGElement)) {
        throw new Error('Not an SVG')
      }

      svg.removeAttribute('xmlns')

      return svg
    })
}

async function createButton(label: string, icon: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-pressed', 'false')
  button.setAttribute('aria-disabled', 'true')

  const wrapper = document.createElement('span')
  wrapper.innerText = label
  button.append(wrapper)

  try {
    const svg = await fetchSvg(icon)
    svg.setAttribute('aria-hidden', 'true')
    button.append(svg)
    wrapper.classList.add('visually-hidden')
  } catch {
    // Do nothing
  }

  return button
}

import TurndownService from 'turndown'

const service = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
})

export function htmlToMarkdown(html: string): string {
  return service.turndown(html || '')
}

export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html || '', 'text/html')
}

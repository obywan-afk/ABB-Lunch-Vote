import { translate } from '@vitalets/google-translate-api'

const DAY_HEADER_PATTERN = /^(\s*---\s*)(Maanantai|Tiistai|Keskiviikko|Torstai|Perjantai)(\s*---\s*)$/i
const DAY_TRANSLATIONS: Record<string, string> = {
  maanantai: 'Monday',
  tiistai: 'Tuesday',
  keskiviikko: 'Wednesday',
  torstai: 'Thursday',
  perjantai: 'Friday',
}

const PROTECTED_TOKEN_PATTERNS = [
  /\((?:[A-Z]{1,5}(?:\s*,\s*[A-Z]{1,5})*)\)/g,
  /\b\d{1,2}[.,]\d{2}\b/g,
]

function protectTokens(input: string) {
  const tokens: string[] = []
  let protectedText = input

  for (const pattern of PROTECTED_TOKEN_PATTERNS) {
    protectedText = protectedText.replace(pattern, (match) => {
      const token = `ZXQTOKEN${tokens.length}ZXQ`
      tokens.push(match)
      return token
    })
  }

  return { protectedText, tokens }
}

function restoreTokens(input: string, tokens: string[]) {
  return tokens.reduce(
    (text, original, index) => text.replace(new RegExp(`ZXQTOKEN${index}ZXQ`, 'g'), original),
    input
  )
}

async function translateLine(line: string) {
  const dayHeaderMatch = line.match(DAY_HEADER_PATTERN)
  if (dayHeaderMatch) {
    const [, prefix, day, suffix] = dayHeaderMatch
    return `${prefix}${DAY_TRANSLATIONS[day.toLowerCase()]}${suffix}`.trimEnd()
  }

  if (!line.trim()) {
    return line
  }

  const { protectedText, tokens } = protectTokens(line)
  const { text } = await translate(protectedText, { from: 'fi', to: 'en' })
  return restoreTokens(text, tokens)
}

export async function translateMenuToEnglish(finnishMenu: string) {
  const lines = finnishMenu.split('\n')
  const translatedLines = await Promise.all(lines.map((line) => translateLine(line)))
  return translatedLines.join('\n')
}

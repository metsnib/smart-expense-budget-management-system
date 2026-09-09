import type { AppData, Category, Transaction } from '../types'
import { formatDate } from './format'

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvEscape(value: string | number): string {
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function exportTransactionsCsv(transactions: Transaction[], categories: Category[]) {
  const header = ['Date', 'Type', 'Category', 'Note', 'Amount']
  const rows = transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId)
    return [
      t.date,
      t.type,
      cat?.name ?? 'Uncategorized',
      t.note,
      t.amount.toFixed(2),
    ].map(csvEscape).join(',')
  })
  const csv = [header.join(','), ...rows].join('\n')
  download(`fintrack-transactions-${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}.csv`, csv, 'text/csv')
}

export function exportBackupJson(data: AppData) {
  const json = JSON.stringify(data, null, 2)
  download(`fintrack-backup-${formatDate(new Date().toISOString(), 'yyyy-MM-dd')}.json`, json, 'application/json')
}

export function parseBackupJson(text: string): AppData {
  const parsed = JSON.parse(text) as AppData
  if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) {
    throw new Error('Invalid backup file: missing transactions or categories.')
  }
  return parsed
}

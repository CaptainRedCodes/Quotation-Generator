const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertLessThanOneThousand(num: number): string {
  if (num < 20) {
    return ones[num]
  }
  const ten = Math.floor(num / 10)
  const one = num % 10
  return tens[ten] + (one ? ' ' + ones[one] : '')
}

export function amountToWords(amount: number): string {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  
  if (rupees === 0) {
    return 'Zero'
  }
  
  const crores = Math.floor(rupees / 10000000)
  const lakhs = Math.floor((rupees % 10000000) / 100000)
  const thousands = Math.floor((rupees % 100000) / 1000)
  const remaining = rupees % 1000
  
  let words = ''
  
  if (crores > 0) {
    words += convertLessThanOneThousand(crores) + ' Crore '
  }
  if (lakhs > 0) {
    words += convertLessThanOneThousand(lakhs) + ' Lakh '
  }
  if (thousands > 0) {
    words += convertLessThanOneThousand(thousands) + ' Thousand '
  }
  if (remaining > 0) {
    words += convertLessThanOneThousand(remaining)
  }
  
  let result = 'INDIAN RUPEES ' + words.trim()
  
  if (paise > 0) {
    result += ' and ' + convertLessThanOneThousand(paise) + ' Paise'
  }
  
  result += ' Only'
  
  return result
}

export function generateQuotationNo(lastNo: string | null, date: Date): string {
  const month = date.getMonth()
  const year = date.getFullYear()
  const fyStart = month >= 3 ? year : year - 1
  const fyEnd = fyStart + 1
  const fyString = `${fyStart}-${fyEnd}`

  if (!lastNo || !lastNo.includes(fyString)) {
    return `ATPL/${fyString}/001`
  }

  const lastNum = parseInt(lastNo.split('/').pop() || '0')
  const nextNum = String(lastNum + 1).padStart(3, '0')
  return `ATPL/${fyString}/${nextNum}`
}

export function formatIndianCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatDate(date: Date): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

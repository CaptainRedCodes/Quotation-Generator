export function validateGst(value: string | null | undefined): string {
    if (!value) return '' // optional field — blank is fine
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.toUpperCase())
        ? ''
        : 'Invalid GST number — must be 15 characters in format: 29ABCDE1234F1Z5'
}

export function validateMobile(value: string | null | undefined): string {
    if (!value) return '' // optional field — blank is fine
    return /^[6-9][0-9]{9}$/.test(value)
        ? ''
        : 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'
}

export function validateEmailRegex(value: string | null | undefined): string {
    if (!value) return '' // optional field — blank is fine
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? ''
        : 'Enter a valid email address'
}

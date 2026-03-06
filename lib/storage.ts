import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const LOGO_CACHE_DIR = path.join(process.cwd(), 'public', 'logos')

function ensureCacheDir(orgId: string): string {
  const orgDir = path.join(LOGO_CACHE_DIR, orgId)
  if (!fs.existsSync(orgDir)) {
    fs.mkdirSync(orgDir, { recursive: true })
  }
  return orgDir
}

export async function uploadCompanyLogo(
  organizationId: string,
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string | null> {
  try {
    const filePath = `${organizationId}/logo/${fileName}`
    
    const { data, error } = await supabaseAdmin.storage
      .from('company-logos')
      .upload(filePath, file, {
        contentType,
        upsert: true
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return null
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('company-logos')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    await downloadAndCacheLogo(organizationId, publicUrl)

    return publicUrl
  } catch (error) {
    console.error('Error uploading logo:', error)
    return null
  }
}

export async function downloadAndCacheLogo(
  organizationId: string,
  logoUrl: string
): Promise<string | null> {
  try {
    if (!logoUrl) return null

    const orgDir = ensureCacheDir(organizationId)
    const extension = path.extname(new URL(logoUrl).pathname) || '.png'
    const localFileName = `logo${extension}`
    const localPath = path.join(orgDir, localFileName)

    if (fs.existsSync(localPath)) {
      return localPath
    }

    const response = await fetch(logoUrl)
    if (!response.ok) {
      console.error('Failed to fetch logo:', response.status)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    fs.writeFileSync(localPath, buffer)
    console.log('Logo cached locally:', localPath)

    return localPath
  } catch (error) {
    console.error('Error caching logo:', error)
    return null
  }
}

export function getCachedLogoPath(organizationId: string): string | null {
  try {
    const orgDir = path.join(LOGO_CACHE_DIR, organizationId)
    if (!fs.existsSync(orgDir)) return null

    const files = fs.readdirSync(orgDir)
    const logoFiles = files.filter(f => /\.(png|jpg|jpeg|webp|svg)$/i.test(f))
    
    if (logoFiles.length === 0) return null
    
    return path.join(orgDir, logoFiles[0])
  } catch {
    return null
  }
}

export async function deleteCompanyLogo(organizationId: string, fileName: string): Promise<boolean> {
  try {
    const filePath = `${organizationId}/logo/${fileName}`
    
    const { error } = await supabaseAdmin.storage
      .from('company-logos')
      .remove([filePath])

    const orgDir = path.join(LOGO_CACHE_DIR, organizationId)
    if (fs.existsSync(orgDir)) {
      fs.rmSync(orgDir, { recursive: true, force: true })
    }

    return !error
  } catch (error) {
    console.error('Error deleting logo:', error)
    return false
  }
}

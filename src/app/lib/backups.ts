import fs from 'node:fs/promises'
import path from 'node:path'
import { EntityType, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/app/lib/prisma'

const BACKUP_DIR_NAME = 'backups'
const BACKUP_PREFIX = 'content-entities'
const ZIP_EOCD_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_SIGNATURE = 0x02014b50
const ZIP_LOCAL_SIGNATURE = 0x04034b50
const ZIP_UTF8_FLAG = 0x0800
const MAX_ZIP_UINT32 = 0xffffffff
const RETENTION_MS = 5 * 24 * 60 * 60 * 1000

const BACKUP_CONTENT_ENTITY_SELECT = {
    id: true,
    type: true,
    titlePublishedEN: true,
    titlePublishedZH: true,
    titleDraftEN: true,
    titleDraftZH: true,
    slug: true,
    contentPublishedEN: true,
    contentPublishedZH: true,
    contentDraftEN: true,
    contentDraftZH: true,
    categoryEN: true,
    categoryZH: true,
    shortContentDraftEN: true,
    shortContentDraftZH: true,
    shortContentPublishedEN: true,
    shortContentPublishedZH: true,
    createdAt: true,
    updatedAt: true,
    creatorId: true,
    coverImagePublishedId: true,
    coverImageDraftId: true
} satisfies Prisma.ContentEntitySelect

type BackupContentEntityRow = Prisma.ContentEntityGetPayload<{
    select: typeof BACKUP_CONTENT_ENTITY_SELECT
}>

type BackupContentEntity = Omit<BackupContentEntityRow, 'createdAt' | 'updatedAt'> & {
    createdAt: string
    updatedAt: string
}

type ZipEntry = {
    name: string
    data: Buffer
    modifiedAt: Date
}

export type BackupFile = {
    filename: string
    createdAt: string
    size: number
    downloadPath: string
    mode: 'automatic' | 'manual' | 'unknown'
}

export type BackupResult = {
    backup: BackupFile
    created: boolean
}

function getUploadPath(): string {
    const uploadPath = process.env.UPLOAD_PATH
    if (!uploadPath) {
        throw new Error('UPLOAD_PATH is not configured.')
    }
    return uploadPath
}

async function getBackupDir(): Promise<string> {
    const dir = path.join(getUploadPath(), BACKUP_DIR_NAME)
    await fs.mkdir(dir, { recursive: true })
    return dir
}

function isBackupFilename(filename: string): boolean {
    return new RegExp(`^${BACKUP_PREFIX}-(auto|manual)-[0-9TZ.-]+\\.zip$`).test(filename)
}

function getBackupMode(filename: string): BackupFile['mode'] {
    if (filename.startsWith(`${BACKUP_PREFIX}-auto-`)) return 'automatic'
    if (filename.startsWith(`${BACKUP_PREFIX}-manual-`)) return 'manual'
    return 'unknown'
}

function formatDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function formatTimestamp(date: Date): string {
    return date.toISOString().replace(/[:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function sanitizeFilenamePart(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'entity'
}

function getEntryName(entity: BackupContentEntity): string {
    return `${entity.id}-${entity.type}-${sanitizeFilenamePart(entity.slug)}.json`
}

function getDosDateTime(date: Date): { dosDate: number; dosTime: number } {
    const year = Math.max(1980, date.getFullYear())
    return {
        dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
        dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    }
}

const crcTable = new Uint32Array(256)
for (let i = 0; i < crcTable.length; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    crcTable[i] = c >>> 0
}

function crc32(buffer: Buffer): number {
    let crc = 0xffffffff
    for (const byte of buffer) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
}

function assertZipSize(size: number) {
    if (size > MAX_ZIP_UINT32) {
        throw new Error('Backup is too large for the ZIP writer.')
    }
}

function createZip(entries: ZipEntry[]): Buffer {
    const localParts: Buffer[] = []
    const centralParts: Buffer[] = []
    let offset = 0

    for (const entry of entries) {
        const nameBuffer = Buffer.from(entry.name, 'utf-8')
        const data = entry.data
        assertZipSize(offset)
        assertZipSize(data.length)

        const { dosDate, dosTime } = getDosDateTime(entry.modifiedAt)
        const crc = crc32(data)

        const localHeader = Buffer.alloc(30 + nameBuffer.length)
        localHeader.writeUInt32LE(ZIP_LOCAL_SIGNATURE, 0)
        localHeader.writeUInt16LE(20, 4)
        localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6)
        localHeader.writeUInt16LE(0, 8)
        localHeader.writeUInt16LE(dosTime, 10)
        localHeader.writeUInt16LE(dosDate, 12)
        localHeader.writeUInt32LE(crc, 14)
        localHeader.writeUInt32LE(data.length, 18)
        localHeader.writeUInt32LE(data.length, 22)
        localHeader.writeUInt16LE(nameBuffer.length, 26)
        localHeader.writeUInt16LE(0, 28)
        nameBuffer.copy(localHeader, 30)

        const centralHeader = Buffer.alloc(46 + nameBuffer.length)
        centralHeader.writeUInt32LE(ZIP_CENTRAL_SIGNATURE, 0)
        centralHeader.writeUInt16LE(20, 4)
        centralHeader.writeUInt16LE(20, 6)
        centralHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8)
        centralHeader.writeUInt16LE(0, 10)
        centralHeader.writeUInt16LE(dosTime, 12)
        centralHeader.writeUInt16LE(dosDate, 14)
        centralHeader.writeUInt32LE(crc, 16)
        centralHeader.writeUInt32LE(data.length, 20)
        centralHeader.writeUInt32LE(data.length, 24)
        centralHeader.writeUInt16LE(nameBuffer.length, 28)
        centralHeader.writeUInt16LE(0, 30)
        centralHeader.writeUInt16LE(0, 32)
        centralHeader.writeUInt16LE(0, 34)
        centralHeader.writeUInt16LE(0, 36)
        centralHeader.writeUInt32LE(0, 38)
        centralHeader.writeUInt32LE(offset, 42)
        nameBuffer.copy(centralHeader, 46)

        localParts.push(localHeader, data)
        centralParts.push(centralHeader)
        offset += localHeader.length + data.length
    }

    const centralOffset = offset
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
    assertZipSize(centralOffset)
    assertZipSize(centralSize)

    const end = Buffer.alloc(22)
    end.writeUInt32LE(ZIP_EOCD_SIGNATURE, 0)
    end.writeUInt16LE(0, 4)
    end.writeUInt16LE(0, 6)
    end.writeUInt16LE(entries.length, 8)
    end.writeUInt16LE(entries.length, 10)
    end.writeUInt32LE(centralSize, 12)
    end.writeUInt32LE(centralOffset, 16)
    end.writeUInt16LE(0, 20)

    return Buffer.concat([ ...localParts, ...centralParts, end ])
}

function readStoredZipEntries(buffer: Buffer): ZipEntry[] {
    let eocdOffset = -1
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
        if (buffer.readUInt32LE(i) === ZIP_EOCD_SIGNATURE) {
            eocdOffset = i
            break
        }
    }
    if (eocdOffset < 0) {
        throw new Error('Invalid ZIP file.')
    }

    const entryCount = buffer.readUInt16LE(eocdOffset + 10)
    let centralOffset = buffer.readUInt32LE(eocdOffset + 16)
    const entries: ZipEntry[] = []

    for (let i = 0; i < entryCount; i++) {
        if (buffer.readUInt32LE(centralOffset) !== ZIP_CENTRAL_SIGNATURE) {
            throw new Error('Invalid ZIP central directory.')
        }
        const method = buffer.readUInt16LE(centralOffset + 10)
        if (method !== 0) {
            throw new Error('Unsupported ZIP compression method.')
        }
        const compressedSize = buffer.readUInt32LE(centralOffset + 20)
        const nameLength = buffer.readUInt16LE(centralOffset + 28)
        const extraLength = buffer.readUInt16LE(centralOffset + 30)
        const commentLength = buffer.readUInt16LE(centralOffset + 32)
        const localOffset = buffer.readUInt32LE(centralOffset + 42)
        const name = buffer.toString('utf-8', centralOffset + 46, centralOffset + 46 + nameLength)

        if (buffer.readUInt32LE(localOffset) !== ZIP_LOCAL_SIGNATURE) {
            throw new Error('Invalid ZIP local file header.')
        }
        const localNameLength = buffer.readUInt16LE(localOffset + 26)
        const localExtraLength = buffer.readUInt16LE(localOffset + 28)
        const dataStart = localOffset + 30 + localNameLength + localExtraLength
        entries.push({
            name,
            data: buffer.subarray(dataStart, dataStart + compressedSize),
            modifiedAt: new Date()
        })
        centralOffset += 46 + nameLength + extraLength + commentLength
    }

    return entries
}

function serializeEntity(entity: BackupContentEntityRow): BackupContentEntity {
    return {
        ...entity,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
    }
}

function isNullableString(value: unknown): value is string | null {
    return typeof value === 'string' || value === null
}

function isNullableNumber(value: unknown): value is number | null {
    return typeof value === 'number' || value === null
}

function isBackupContentEntity(value: unknown): value is BackupContentEntity {
    if (value == null || typeof value !== 'object') return false
    const entity = value as Record<string, unknown>
    return typeof entity.id === 'number'
        && Object.values(EntityType).includes(entity.type as EntityType)
        && isNullableString(entity.titlePublishedEN)
        && isNullableString(entity.titlePublishedZH)
        && typeof entity.titleDraftEN === 'string'
        && typeof entity.titleDraftZH === 'string'
        && typeof entity.slug === 'string'
        && isNullableString(entity.contentPublishedEN)
        && isNullableString(entity.contentPublishedZH)
        && typeof entity.contentDraftEN === 'string'
        && typeof entity.contentDraftZH === 'string'
        && isNullableString(entity.categoryEN)
        && isNullableString(entity.categoryZH)
        && isNullableString(entity.shortContentDraftEN)
        && isNullableString(entity.shortContentDraftZH)
        && isNullableString(entity.shortContentPublishedEN)
        && isNullableString(entity.shortContentPublishedZH)
        && typeof entity.createdAt === 'string'
        && typeof entity.updatedAt === 'string'
        && typeof entity.creatorId === 'number'
        && isNullableNumber(entity.coverImagePublishedId)
        && isNullableNumber(entity.coverImageDraftId)
}

function toRestoreData(entity: BackupContentEntity): Prisma.ContentEntityCreateManyInput {
    return {
        ...entity,
        createdAt: new Date(entity.createdAt),
        updatedAt: new Date(entity.updatedAt)
    }
}

async function backupFileFromName(filename: string): Promise<BackupFile> {
    if (!isBackupFilename(filename)) {
        throw new Error('Invalid backup filename.')
    }
    const dir = await getBackupDir()
    const stat = await fs.stat(path.join(dir, filename))
    return {
        filename,
        createdAt: stat.mtime.toISOString(),
        size: stat.size,
        downloadPath: `/studio/backups/download/${encodeURIComponent(filename)}`,
        mode: getBackupMode(filename)
    }
}

export async function listBackups(): Promise<BackupFile[]> {
    const dir = await getBackupDir()
    const files = await fs.readdir(dir)
    const backups = await Promise.all(
        files
            .filter(isBackupFilename)
            .map(file => backupFileFromName(file))
    )
    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function readBackupFile(filename: string): Promise<Buffer> {
    if (!isBackupFilename(filename)) {
        throw new Error('Invalid backup filename.')
    }
    return fs.readFile(path.join(await getBackupDir(), filename))
}

export async function deleteBackupFile(filename: string): Promise<void> {
    if (!isBackupFilename(filename)) {
        throw new Error('Invalid backup filename.')
    }
    await fs.unlink(path.join(await getBackupDir(), filename))
}

export async function createContentBackup(mode: 'automatic' | 'manual'): Promise<BackupResult> {
    const now = new Date()
    const dir = await getBackupDir()
    const autoName = `${BACKUP_PREFIX}-auto-${formatDateStamp(now)}.zip`

    if (mode === 'automatic') {
        try {
            await fs.access(path.join(dir, autoName))
            return {
                backup: await backupFileFromName(autoName),
                created: false
            }
        } catch {
        }
    }

    const filename = mode === 'automatic'
        ? autoName
        : `${BACKUP_PREFIX}-manual-${formatTimestamp(now)}.zip`
    const entities = await prisma.contentEntity.findMany({
        orderBy: { id: 'asc' },
        select: BACKUP_CONTENT_ENTITY_SELECT
    })
    const entries = entities.map(entity => {
        const serialized = serializeEntity(entity)
        return {
            name: getEntryName(serialized),
            data: Buffer.from(JSON.stringify(serialized, null, 2), 'utf-8'),
            modifiedAt: now
        }
    })
    await fs.writeFile(path.join(dir, filename), createZip(entries))
    return {
        backup: await backupFileFromName(filename),
        created: true
    }
}

export async function pruneOldBackups(now = new Date()): Promise<string[]> {
    const dir = await getBackupDir()
    const cutoff = now.getTime() - RETENTION_MS
    const filenames = (await fs.readdir(dir)).filter(isBackupFilename)
    const deleted: string[] = []

    for (const filename of filenames) {
        const fullPath = path.join(dir, filename)
        const stat = await fs.stat(fullPath)
        if (stat.mtime.getTime() < cutoff) {
            await fs.unlink(fullPath)
            deleted.push(filename)
        }
    }

    return deleted
}

async function readBackupEntities(filename: string): Promise<BackupContentEntity[]> {
    const buffer = await readBackupFile(filename)
    const entries = readStoredZipEntries(buffer)
        .filter(entry => entry.name.endsWith('.json'))
    const entities = entries.map(entry => {
        const value = JSON.parse(entry.data.toString('utf-8')) as unknown
        if (!isBackupContentEntity(value)) {
            throw new Error(`Invalid content entity backup entry: ${entry.name}`)
        }
        return value
    })

    const ids = new Set<number>()
    const slugs = new Set<string>()
    for (const entity of entities) {
        if (ids.has(entity.id)) throw new Error(`Duplicate content entity id in backup: ${entity.id}`)
        if (slugs.has(entity.slug)) throw new Error(`Duplicate content entity slug in backup: ${entity.slug}`)
        if (Number.isNaN(new Date(entity.createdAt).getTime()) || Number.isNaN(new Date(entity.updatedAt).getTime())) {
            throw new Error(`Invalid date in content entity backup entry: ${entity.id}`)
        }
        ids.add(entity.id)
        slugs.add(entity.slug)
    }

    return entities
}

export async function restoreContentBackup(filename: string): Promise<number> {
    const entities = await readBackupEntities(filename)
    const creatorIds = Array.from(new Set(entities.map(entity => entity.creatorId)))
    const imageIds = Array.from(new Set(entities
        .flatMap(entity => [ entity.coverImageDraftId, entity.coverImagePublishedId ])
        .filter((id): id is number => id != null)))

    const [ existingUsers, existingImages ] = await Promise.all([
        creatorIds.length === 0 ? [] : prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true }
        }),
        imageIds.length === 0 ? [] : prisma.image.findMany({
            where: { id: { in: imageIds } },
            select: { id: true }
        })
    ])
    const existingUserIds = new Set(existingUsers.map(user => user.id))
    const missingUserId = creatorIds.find(id => !existingUserIds.has(id))
    if (missingUserId != null) {
        throw new Error(`Backup references a missing creator: ${missingUserId}`)
    }
    const existingImageIds = new Set(existingImages.map(image => image.id))
    const missingImageId = imageIds.find(id => !existingImageIds.has(id))
    if (missingImageId != null) {
        throw new Error(`Backup references a missing image: ${missingImageId}`)
    }

    await prisma.$transaction(async tx => {
        await tx.approval.deleteMany()
        await tx.entityLock.deleteMany()
        await tx.contentEntity.deleteMany()
        if (entities.length > 0) {
            await tx.contentEntity.createMany({
                data: entities.map(toRestoreData)
            })
            await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('"ContentEntity"', 'id'), ${Math.max(...entities.map(entity => entity.id))}, true)`
        }
    })

    return entities.length
}

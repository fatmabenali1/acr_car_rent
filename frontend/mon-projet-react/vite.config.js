import react from '@vitejs/plugin-react'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

const reviewPlatforms = ['google', 'tripadvisor', 'trustpilot', 'facebook', 'reviews-center']
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const virtualReviewsId = 'virtual:reviewsData.js'
const resolvedReviewsId = `\0${virtualReviewsId}`

function naturalCompare(left, right) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}

function getImageDimensions(filePath) {
  const buffer = readFileSync(filePath)
  const extension = path.extname(filePath).toLowerCase()

  if (extension === '.png' && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }

  if (extension === '.webp' && buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const format = buffer.toString('ascii', 12, 16)
    if (format === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      }
    }
    if (format === 'VP8L' && buffer[20] === 0x2f) {
      return {
        width: 1 + (((buffer[22] & 0x3f) << 8) | buffer[21]),
        height: 1 + (((buffer[23] & 0x0f) << 10) | (buffer[22] >> 6) | (buffer[24] << 2)),
      }
    }
  }

  if (extension === '.jpg' || extension === '.jpeg') {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break
      const marker = buffer[offset + 1]
      const segmentLength = buffer.readUInt16BE(offset + 2)
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        }
      }
      offset += 2 + segmentLength
    }
  }

  return { width: 800, height: 1000 }
}

function listReviews(root) {
  return reviewPlatforms.flatMap((platform) => {
    const directory = path.join(root, 'public', 'images', 'reviews', platform)
    let filenames = []
    try {
      filenames = readdirSync(directory)
        .filter((filename) => imageExtensions.has(path.extname(filename).toLowerCase()))
        .filter((filename) => statSync(path.join(directory, filename)).isFile())
        .sort(naturalCompare)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }

    return filenames.map((filename, index) => {
      const dimensions = getImageDimensions(path.join(directory, filename))
      const src = `/images/reviews/${platform}/${filename.split(path.sep).map(encodeURIComponent).join('/')}`
      const label = platform === 'reviews-center' ? 'Reviews Center' : platform === 'tripadvisor' ? 'TripAdvisor' : platform[0].toUpperCase() + platform.slice(1)
      return {
        id: `${platform}-${filename}`,
        platform,
        src,
        alt: `Customer review on ${label}, ${index + 1}`,
        ...dimensions,
      }
    })
  })
}

function listRatingBadges(root) {
  const directory = path.join(root, 'public', 'images', 'reviews', 'badges')
  let filenames = []
  try {
    filenames = readdirSync(directory)
      .filter((filename) => imageExtensions.has(path.extname(filename).toLowerCase()))
      .filter((filename) => statSync(path.join(directory, filename)).isFile())
      .sort(naturalCompare)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return filenames.map((filename) => {
    const normalizedName = path.parse(filename).name.toLowerCase().replace(/[_\s]+/g, '-')
    const platform = normalizedName.includes('google')
      ? 'google'
      : normalizedName.includes('tripadvisor')
        ? 'tripadvisor'
        : normalizedName.includes('trustpilot')
          ? 'trustpilot'
          : normalizedName.includes('facebook')
            ? 'facebook'
            : /review[- ]?(center|centre)|center[- ]?review/.test(normalizedName)
              ? 'reviews-center'
              : null

    return {
      src: `/images/reviews/badges/${filename.split(path.sep).map(encodeURIComponent).join('/')}`,
      alt: `${path.parse(filename).name} rating badge`,
      platform,
      ...getImageDimensions(path.join(directory, filename)),
    }
  })
}

function reviewsDataPlugin() {
  let projectRoot
  let server
  return {
    name: 'reviews-data',
    configResolved(config) {
      projectRoot = config.root
    },
    resolveId(id) {
      if (id === virtualReviewsId) return resolvedReviewsId
    },
    load(id) {
      if (id === resolvedReviewsId) {
        return [
          `export const reviews = ${JSON.stringify(listReviews(projectRoot))};`,
          `export const ratingBadges = ${JSON.stringify(listRatingBadges(projectRoot))};`,
        ].join('\n')
      }
    },
    configureServer(devServer) {
      server = devServer
      const reviewsRoot = path.join(projectRoot, 'public', 'images', 'reviews')
      devServer.watcher.add(reviewsRoot)
      const refreshReviews = (changedPath) => {
        const relativePath = path.relative(reviewsRoot, changedPath)
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return
        const module = server.moduleGraph.getModuleById(resolvedReviewsId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      devServer.watcher.on('add', refreshReviews)
      devServer.watcher.on('unlink', refreshReviews)
      devServer.watcher.on('change', refreshReviews)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), reviewsDataPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    restoreMocks: true,
  },
})

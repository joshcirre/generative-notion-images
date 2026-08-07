function download(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

/** Rasterize an SVG string to a PNG download at an exact pixel size. */
export function exportPNG(svg: string, w: number, h: number, name: string) {
  const sized = svg.replace('<svg ', `<svg width="${w}" height="${h}" `)
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    canvas.toBlob(blob => {
      if (!blob) return
      const pngUrl = URL.createObjectURL(blob)
      download(pngUrl, name)
      setTimeout(() => URL.revokeObjectURL(pngUrl), 5000)
    }, 'image/png')
  }
  img.src = url
}

export function exportSVG(svg: string, w: number, h: number, name: string) {
  const sized = svg.replace('<svg ', `<svg width="${w}" height="${h}" `)
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
  download(url, name)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export type OcrProgress = (progress: number, label: string) => void

async function prepare(file: File) {
  const bmp = await createImageBitmap(file)
  const long = Math.max(bmp.width, bmp.height)
  const scale = long > 2400 ? 2400 / long : long < 1400 ? 1400 / long : 1
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  // grayscale + contrast stretch: thermal receipts are often faded
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const hist = new Uint32Array(256)
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
    d[i] = g
    hist[g]++
  }
  const cut = (w * h) / 50
  let lo = 0
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < cut; lo++);
  let hi = 255
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < cut; hi--);
  const k = 255 / Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, (d[i] - lo) * k))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export async function readReceiptText(file: File, onProgress: OcrProgress) {
  onProgress(0.02, 'Preparing photo')
  const canvas = await prepare(file)
  const mod = await import('tesseract.js')
  const T = mod.default ?? mod
  onProgress(0.05, 'Loading reader')
  const worker = await T.createWorker(['rus', 'eng'], T.OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(0.35 + m.progress * 0.65, 'Reading receipt')
      else if (/loading|initializ/.test(m.status)) onProgress(0.05 + m.progress * 0.3, 'Loading reader')
    },
  })
  try {
    await worker.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_COLUMN, preserve_interword_spaces: '1' })
    const { data } = await worker.recognize(canvas, { rotateAuto: true })
    return data.text
  } finally {
    await worker.terminate()
  }
}

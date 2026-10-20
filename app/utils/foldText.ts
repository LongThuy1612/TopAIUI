// Text for loose matching: lower case, accents and đ dropped — "giong noi" finds
// "Giọng nói", "categoria" finds "Categoría".
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

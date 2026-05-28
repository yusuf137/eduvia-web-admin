/**
 * Yasal metinler yalnızca düz metin olarak saklanır (HTML render edilmez).
 * Kayıt öncesi HTML etiketleri kaldırılır; public tarafta React metin düğümleri kullanılır.
 */
export function sanitizeLegalPlainContent(raw) {
  let text = String(raw ?? '');
  // HTML yapıştırılmışsa etiketleri kaldır (XSS önlemi)
  text = text.replace(/<[^>]*>/g, '');
  // Kontrol karakterleri (satır sonu hariç)
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return text.replace(/\r\n/g, '\n').trim();
}

export function validateLegalDocumentPayload({ title, content }) {
  const titleTrim = String(title ?? '').trim();
  const contentTrim = sanitizeLegalPlainContent(content);

  if (!titleTrim) {
    throw new Error('Başlık boş olamaz.');
  }
  if (!contentTrim) {
    throw new Error('İçerik boş olamaz.');
  }

  return { title: titleTrim, content: contentTrim };
}

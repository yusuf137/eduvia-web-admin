/**
 * Düz metin yasal içeriği paragraflara ve başlıklara dönüştürür.
 * HTML kullanılmaz; dangerouslySetInnerHTML yok — XSS riski yoktur.
 * - Boş satır: yeni paragraf
 * - `# Başlık` → h2, `## Alt` → h3
 * - `- madde` → liste
 */
import { sanitizeLegalPlainContent } from './legalContentSanitize';
export function formatLegalUpdatedAt(updatedAt) {
  if (!updatedAt) {
    return null;
  }
  let date = null;
  if (typeof updatedAt.toDate === 'function') {
    date = updatedAt.toDate();
  } else if (updatedAt instanceof Date) {
    date = updatedAt;
  } else if (typeof updatedAt.seconds === 'number') {
    date = new Date(updatedAt.seconds * 1000);
  }
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function renderLegalContent(content) {
  const text = sanitizeLegalPlainContent(content);
  if (!text) {
    return null;
  }

  const blocks = text.split(/\n\n+/);
  return blocks.map((block, blockIndex) => {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const first = lines[0]?.trim() ?? '';

    if (first.startsWith('## ')) {
      return (
        <h3 key={`b-${blockIndex}`} className="legal-content__h3">
          {first.slice(3).trim()}
        </h3>
      );
    }
    if (first.startsWith('# ')) {
      return (
        <h2 key={`b-${blockIndex}`} className="legal-content__h2">
          {first.slice(2).trim()}
        </h2>
      );
    }

    const listLines = lines.filter((l) => l.trim().startsWith('- '));
    if (listLines.length === lines.length && listLines.length > 0) {
      return (
        <ul key={`b-${blockIndex}`} className="legal-content__ul">
          {listLines.map((line, li) => (
            <li key={`li-${blockIndex}-${li}`}>{line.trim().slice(2).trim()}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={`b-${blockIndex}`} className="legal-content__p">
        {lines.map((line, li) => (
          <span key={`ln-${blockIndex}-${li}`}>
            {li > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
    );
  });
}

export const formatTpsLabel = (
  tps_number?: string,
  tps_code?: string,
  address?: string,
  fallbackIndex?: number
): string => {
  let numPart = '';
  if (tps_number) {
    const raw = String(tps_number).trim();
    numPart = raw.toUpperCase().startsWith('TPS') ? raw : `TPS ${raw.padStart(2, '0')}`;
  } else if (tps_code) {
    // Extract numbers from tps_code if present (e.g. 3376011001001 or TPS-001)
    const digits = tps_code.replace(/\D/g, '');
    if (digits && digits.length >= 1) {
      numPart = `TPS ${digits.slice(-2).padStart(2, '0')}`;
    }
  }

  if (!numPart && fallbackIndex !== undefined) {
    numPart = `TPS ${String(fallbackIndex + 1).padStart(2, '0')}`;
  }

  if (!numPart) numPart = 'TPS';

  if (tps_code && address) {
    return `${numPart} - ${tps_code} (${address})`;
  } else if (tps_code) {
    return `${numPart} - ${tps_code}`;
  } else if (address) {
    return `${numPart} (${address})`;
  }
  return numPart;
};

export const formatPhotoUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  let pathStr = url.trim();
  if (!pathStr.startsWith('/')) {
    pathStr = '/' + pathStr;
  }
  if (!pathStr.startsWith('/uploads/')) {
    pathStr = '/uploads' + pathStr;
  }
  return pathStr;
};

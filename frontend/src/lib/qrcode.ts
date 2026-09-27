import QRCode from 'qrcode';

interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate QR code as data URL
 */
export const generateQRCode = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  const {
    width = 300,
    margin = 2,
    color = {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel = 'M'
  } = options;

  try {
    const url = await QRCode.toDataURL(data, {
      width,
      margin,
      color,
      errorCorrectionLevel
    });
    return url;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as SVG string
 */
export const generateQRCodeSVG = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  const {
    width = 300,
    margin = 2,
    color = {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel = 'M'
  } = options;

  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      width,
      margin,
      color,
      errorCorrectionLevel
    });
    return svg;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
};

/**
 * Generate QR code with Dumuwaks branding (gradient effect)
 */
export const generateBrandedQRCode = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  const {
    width = 400,
    margin = 2,
    color = {
      dark: '#14110c', // night ink: QR needs dark-on-light to scan
      light: '#ffffff'
    },
    errorCorrectionLevel = 'H' // High for logo embedding
  } = options;

  return generateQRCode(data, { width, margin, color, errorCorrectionLevel });
};

/**
 * Generate multiple QR codes for different purposes
 */
export const generateQRCodePack = async (data: string) => {
  return Promise.all([
    // Small for mobile sharing
    generateQRCode(data, { width: 200, errorCorrectionLevel: 'L' }),
    // Medium for printing
    generateQRCode(data, { width: 300, errorCorrectionLevel: 'M' }),
    // Large for posters
    generateQRCode(data, { width: 600, errorCorrectionLevel: 'H' }),
    // SVG for scaling
    generateQRCodeSVG(data, { width: 300, errorCorrectionLevel: 'M' })
  ]);
};

/**
 * Download QR code as image
 */
export const downloadQRCode = (dataUrl: string, filename = 'qrcode.png') => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
};

/**
 * Validate QR code data
 */
export const validateQRData = (data: string): boolean => {
  if (!data || data.trim().length === 0) return false;

  // Check if it's a valid URL or has minimum length
  try {
    if (data.startsWith('http')) {
      new URL(data);
    }
    return data.length >= 10;
  } catch {
    return data.length >= 10;
  }
};

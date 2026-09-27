import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { generateBrandedQRCode, downloadQRCode } from '@/lib/qrcode';
import { cn } from '@/lib/utils';

interface QRCodeDisplayProps {
  data: string;
  title?: string;
  description?: string;
  size?: number;
  showActions?: boolean;
  showLogo?: boolean;
  logoUrl?: string;
  className?: string;
  onDownload?: () => void;
  onShare?: () => void;
}

export const QRCodeDisplay = ({
  data,
  title = 'Scan to Connect',
  description,
  size = 300,
  showActions = true,
  showLogo = true,
  logoUrl = '/LOGO-square.png',
  className,
  onDownload,
  onShare
}: QRCodeDisplayProps) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      setLoading(true);
      try {
        const url = await generateBrandedQRCode(data, { width: size });
        setQrUrl(url);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [data, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    downloadQRCode(qrUrl, `dumuwaks-qrcode-${Date.now()}.png`);
    onDownload?.();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dumuwaks',
          text: description,
          url: data
        });
        onShare?.();
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className={cn("bg-surface-100 rounded-2xl p-6 shadow-lg", className)}>
      {/* QR Code Image */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* QR Code */}
          <div
            className="bg-surface-200 p-4 rounded-xl shadow-inner border-2 border-line"
            style={{ width: size + 32, height: size + 32 }}
          >
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-full h-full"
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>

          {/* Dumuwaks Logo Overlay */}
          {showLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-surface-100 p-2 rounded-lg shadow-lg">
                <img
                  src={logoUrl}
                  alt="Dumuwaks Logo"
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Title & Description */}
        {title && (
          <h3 className="mt-4 text-lg font-semibold text-ink dark:text-ink text-center">
            {title}
          </h3>
        )}

        {description && (
          <p className="mt-2 text-sm text-ink-muted text-center max-w-xs">
            {description}
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>

            {typeof navigator.share === 'function' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import { useState } from 'react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { User, Calendar, MessageCircle, Share2, Star, QrCode, Link } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ConnectionType = 'profile' | 'booking' | 'chat' | 'review' | 'referral';

interface QRConnectionCardProps {
  type: ConnectionType;
  data: {
    id: string;
    name: string;
    title?: string;
    rating?: number;
    service?: string;
  };
  onConnect?: (type: ConnectionType, data: any) => void;
}

export const QRConnectionCard = ({ type, data, onConnect }: QRConnectionCardProps) => {
  const [selectedAction, setSelectedAction] = useState<ConnectionType | null>(null);
  const [connectionUrl, setConnectionUrl] = useState<string>('');

  const connections = [
    {
      type: 'profile' as ConnectionType,
      icon: User,
      label: 'View Profile',
      color: 'from-blue-500 to-blue-600',
      description: `View ${data.name}'s profile and services`,
      generateUrl: () => `${window.location.origin}/technicians/${data.id}`
    },
    {
      type: 'booking' as ConnectionType,
      icon: Calendar,
      label: 'Book Now',
      color: 'from-primary-500 to-secondary-500',
      description: `Book ${data.name} for a service`,
      generateUrl: () => `${window.location.origin}/create-booking?technician=${data.id}`
    },
    {
      type: 'chat' as ConnectionType,
      icon: MessageCircle,
      label: 'Start Chat',
      color: 'from-green-500 to-green-600',
      description: `Message ${data.name} directly`,
      generateUrl: () => `${window.location.origin}/messages?with=${data.id}`
    },
    {
      type: 'review' as ConnectionType,
      icon: Star,
      label: 'Leave Review',
      color: 'from-yellow-500 to-orange-500',
      description: `Rate ${data.name}'s service`,
      generateUrl: () => `${window.location.origin}/technicians/${data.id}/review`
    },
    {
      type: 'referral' as ConnectionType,
      icon: Share2,
      label: 'Share & Earn',
      color: 'from-purple-500 to-pink-500',
      description: `Share ${data.name} and earn KES 500`,
      generateUrl: () => `${window.location.origin}/referrals?technician=${data.id}`
    }
  ];

  const handleActionSelect = (actionType: ConnectionType, url: string) => {
    setSelectedAction(actionType);
    setConnectionUrl(url);
  };

  const getActionConfig = (actionType: ConnectionType) => {
    return connections.find(c => c.type === actionType);
  };

  return (
    <div className="space-y-4">
      {!selectedAction ? (
        /* Action Selection Grid */
        <Card className="p-6 bg-primary-950">
          <div className="flex items-center gap-3 mb-4">
            <QrCode className="h-6 w-6 text-primary-400" />
            <h3 className="font-semibold text-lg text-ink dark:text-ink">
              Connect with {data.name}
            </h3>
          </div>

          <p className="text-sm text-ink-muted mb-6">
            Choose how you want to connect. We'll generate a QR code instantly.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {connections.map((connection) => {
              const Icon = connection.icon;
              return (
                <motion.button
                  key={connection.type}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleActionSelect(connection.type, connection.generateUrl())}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all",
                    "border-line hover:border-primary-500",
                    "bg-surface-100 hover:shadow-lg"
                  )}
                >
                  <div className={cn("absolute inset-0 opacity-0 hover:opacity-10 transition-opacity", connection.color)} />

                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", connection.color)}>
                    <Icon className="h-6 w-6 text-ink" />
                  </div>

                  <p className="font-medium text-sm text-ink dark:text-ink mb-1">
                    {connection.label}
                  </p>
                  <p className="text-xs text-ink-muted line-clamp-2">
                    {connection.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </Card>
      ) : (
        /* QR Code Display */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getActionConfig(selectedAction)?.icon || Link;
                  const color = getActionConfig(selectedAction)?.color || 'from-ink-faint to-surface-400';
                  return (
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
                      <Icon className="h-5 w-5 text-ink" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-semibold text-ink dark:text-ink">
                    {getActionConfig(selectedAction)?.label}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Scan to {getActionConfig(selectedAction)?.label.toLowerCase()}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedAction(null);
                  setConnectionUrl('');
                }}
              >
                ✕
              </Button>
            </div>

            <QRCodeDisplay
              data={connectionUrl}
              title={getActionConfig(selectedAction)?.label}
              description={getActionConfig(selectedAction)?.description}
              showLogo={true}
              showActions={true}
              onDownload={() => {
                console.log('QR downloaded for', selectedAction);
              }}
              onShare={() => {
                console.log('QR shared for', selectedAction);
              }}
            />

            <div className="mt-6 p-4 bg-surface-200 rounded-xl">
              <h4 className="font-medium text-sm text-ink dark:text-ink mb-2">
                How to use:
              </h4>
              <ol className="text-xs text-ink-muted space-y-1">
                <li>1. Download or screenshot this QR code</li>
                <li>2. Share with others or print it</li>
                <li>3. Scan to {getActionConfig(selectedAction)?.label.toLowerCase()}</li>
              </ol>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

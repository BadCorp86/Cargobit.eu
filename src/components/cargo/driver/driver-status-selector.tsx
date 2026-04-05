'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  User, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Navigation,
  Coffee,
  Moon,
  BatteryCharging
} from 'lucide-react';
import { useCargoBitStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type DriverStatusType = 'available' | 'en_route' | 'on_break' | 'offline' | 'resting';

interface DriverStatusOption {
  id: DriverStatusType;
  labelDe: string;
  labelEn: string;
  descriptionDe: string;
  descriptionEn: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const statusOptions: DriverStatusOption[] = [
  {
    id: 'available',
    labelDe: 'Verfügbar',
    labelEn: 'Available',
    descriptionDe: 'Bereit für neue Aufträge',
    descriptionEn: 'Ready for new assignments',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/30',
  },
  {
    id: 'en_route',
    labelDe: 'Unterwegs',
    labelEn: 'En Route',
    descriptionDe: 'Aktuell auf Lieferung',
    descriptionEn: 'Currently on delivery',
    icon: <Navigation className="h-5 w-5" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
  },
  {
    id: 'on_break',
    labelDe: 'Pause',
    labelEn: 'On Break',
    descriptionDe: 'Kurze Pause eingelegt',
    descriptionEn: 'Taking a short break',
    icon: <Coffee className="h-5 w-5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  {
    id: 'offline',
    labelDe: 'Offline',
    labelEn: 'Offline',
    descriptionDe: 'Nicht verfügbar',
    descriptionEn: 'Not available',
    icon: <Moon className="h-5 w-5" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10 border-gray-500/30',
  },
  {
    id: 'resting',
    labelDe: 'Ruhend',
    labelEn: 'Resting',
    descriptionDe: 'Ruhezeit / Feierabend',
    descriptionEn: 'Rest period / Off duty',
    icon: <BatteryCharging className="h-5 w-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
];

export function DriverStatusSelector() {
  const { language } = useCargoBitStore();
  const [currentStatus, setCurrentStatus] = useState<DriverStatusType>('available');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (status: DriverStatusType) => {
    setIsUpdating(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setCurrentStatus(status);
    setIsUpdating(false);
  };

  const currentStatusOption = statusOptions.find((s) => s.id === currentStatus)!;

  return (
    <Card className="border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <User className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {language === 'de' ? 'Fahrer-Status' : 'Driver Status'}
              </CardTitle>
              <CardDescription>
                {language === 'de' 
                  ? 'Aktualisieren Sie Ihren aktuellen Status'
                  : 'Update your current status'}
              </CardDescription>
            </div>
          </div>
          <Badge className={cn('text-sm font-medium border', currentStatusOption.bgColor, currentStatusOption.color)}>
            {language === 'de' ? currentStatusOption.labelDe : currentStatusOption.labelEn}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={currentStatus}
          onValueChange={(value) => handleStatusChange(value as DriverStatusType)}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          {statusOptions.map((status) => (
            <div key={status.id}>
              <RadioGroupItem
                value={status.id}
                id={status.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={status.id}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                  'hover:border-orange-300 hover:bg-orange-500/5',
                  currentStatus === status.id
                    ? `${status.bgColor} border-orange-500`
                    : 'border-border/50 bg-card/50'
                )}
              >
                <div className={cn('p-2 rounded-lg', currentStatus === status.id ? status.bgColor : 'bg-muted/50')}>
                  <div className={currentStatus === status.id ? status.color : 'text-muted-foreground'}>
                    {status.icon}
                  </div>
                </div>
                <div className="text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    currentStatus === status.id ? status.color : 'text-foreground'
                  )}>
                    {language === 'de' ? status.labelDe : status.labelEn}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                    {language === 'de' ? status.descriptionDe : status.descriptionEn}
                  </p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="mt-4 p-4 rounded-lg bg-muted/30">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {language === 'de' ? 'Status seit:' : 'Status since:'}
              </span>
              <span className="font-medium">08:30</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {language === 'de' ? 'Letzter Standort:' : 'Last location:'}
              </span>
              <span className="font-medium">München</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

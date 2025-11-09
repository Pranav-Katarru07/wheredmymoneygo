import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const NotificationSettings = () => {
  const [enabled, setEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = () => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    // Check current permission status
    if (Notification.permission === 'granted') {
      setEnabled(true);
    } else if (Notification.permission === 'denied') {
      setEnabled(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!isSupported) {
      toast({
        title: "Not supported",
        description: "Notifications are not supported in this browser",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (checked) {
        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          setEnabled(true);
          
          // Save preference to database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('push_subscriptions').upsert({
              user_id: user.id,
              subscription: { enabled: true, timestamp: Date.now() }
            });
          }

          toast({
            title: "Notifications enabled! 🔔",
            description: "You'll receive budget alerts and reminders",
          });

          // Show a test notification
          new Notification("Budget Tracker", {
            body: "Notifications are now enabled!",
            icon: "/favicon.ico"
          });
        } else if (permission === 'denied') {
          setEnabled(false);
          toast({
            title: "Permission denied",
            description: "Please enable notifications in your browser settings",
            variant: "destructive"
          });
        } else {
          setEnabled(false);
          toast({
            title: "Permission required",
            description: "Notifications require your permission",
          });
        }
      } else {
        // Disable notifications
        setEnabled(false);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }

        toast({
          title: "Notifications disabled",
          description: "You won't receive push notifications",
        });
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setEnabled(false);
      toast({
        title: "Error",
        description: "Could not update notification settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {enabled ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
          <div>
            <Label className="text-sm font-medium">Push Notifications</Label>
            <p className="text-xs text-muted-foreground">
              {Notification.permission === 'denied' 
                ? 'Blocked - Enable in browser settings'
                : 'Get alerts for budget limits'
              }
            </p>
          </div>
        </div>
        <Switch 
          checked={enabled} 
          onCheckedChange={handleToggle}
          disabled={isLoading || Notification.permission === 'denied'}
        />
      </div>
    </Card>
  );
};

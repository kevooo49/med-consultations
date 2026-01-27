import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { X, Bell, AlertTriangle } from "lucide-react";
import type { Backend, AppNotification } from "../../../services/backend";

interface Props {
  backend: Backend;
}

export function NotificationToast({ backend }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = backend.listenNotifications(user.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user, backend]);

  const handleDismiss = async (id: string) => {
    if (!user) return;
    await backend.dismissNotification(user.uid, id);
  };

  if (notifications.length === 0) return null;

  // Wyświetlamy max 3 powiadomienia na raz
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
      {visibleNotifications.map(n => (
        <div key={n.id} style={{
          background: 'white',
          borderLeft: `6px solid ${n.type === 'warning' ? '#ef4444' : '#3b82f6'}`,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: 16,
          minWidth: 300,
          maxWidth: 400,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ 
              background: n.type === 'warning' ? '#fef2f2' : '#eff6ff', 
              padding: 8, 
              borderRadius: '50%',
              height: 'fit-content'
            }}>
              {n.type === 'warning' 
                ? <AlertTriangle size={20} color="#ef4444" /> 
                : <Bell size={20} color="#3b82f6" />
              }
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '0.95rem' }}>
                {n.senderName}
              </h4>
              <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem' }}>
                {n.message}
              </p>
              <span style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: 4, display: 'block'}}>
                 {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
          <button 
            onClick={() => handleDismiss(n.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
            title="Oznacz jako przeczytane"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
import { useQuery } from '@tanstack/react-query';

export interface NotificationItem {
  id: string;
  type: 'payment' | 'order' | 'cluster';
  title: string;
  titleHi: string;
  body: string;
  bodyHi: string;
  timeAgo: string;
  isUnread: boolean;
  linkText?: string;
}

export const SEEDED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'payment',
    title: '₹1,400 credited to SBI DBT',
    titleHi: '₹1,400 सीधे बैंक खाते में जमा',
    body: 'Direct Benefit Transfer for 4 completed Kantha cushion covers under order KO-2026-0034.',
    bodyHi: 'आदेश KO-2026-0034 के 4 कुशन कवर का सीधा सरकारी बैंक भुगतान पूरा हुआ।',
    timeAgo: '10 min ago',
    isUnread: true,
    linkText: 'View Payout · पासबुक देखें',
  },
  {
    id: 'notif-2',
    type: 'order',
    title: 'Quality inspection passed',
    titleHi: 'गुणवत्ता जांच सफल रही',
    body: 'Coordinator Sunita approved 2 Banarasi silk stoles for dispatch.',
    bodyHi: 'समन्वयक सुनीता जी ने 2 बनारसी सिल्क स्टोल की गुणवत्ता स्वीकार कर ली।',
    timeAgo: '2 hours ago',
    isUnread: true,
    linkText: 'Order #KW-9012',
  },
  {
    id: 'notif-3',
    type: 'cluster',
    title: 'Raw cotton hanks restocked',
    titleHi: 'कच्चा सूत केंद्र पर उपलब्ध',
    body: 'Fresh natural dyed cotton yarn arrived at Bhagirathi cluster Kendra.',
    bodyHi: 'भागीरथी शिल्प केंद्र पर प्राकृतिक रंगा हुआ सूत प्राप्त हुआ है।',
    timeAgo: '1 day ago',
    isUnread: false,
    linkText: 'Kendra Shed A',
  },
];

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationItem[]> => {
      return SEEDED_NOTIFICATIONS;
    },
  });
}


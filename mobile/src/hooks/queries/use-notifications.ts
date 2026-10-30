import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface NotificationItem {
  id: string;
  type: 'payment' | 'order' | 'cluster' | 'feedback';
  title: string;
  titleHi: string;
  body: string;
  bodyHi: string;
  timeAgo: string;
  isUnread: boolean;
  linkText?: string;
  linkRoute?: string;
  audioText?: string;
}

export const SEEDED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-0',
    type: 'feedback',
    title: 'Sunita requested changes on cushion cover',
    titleHi: 'सुनीता दीदी ने कुशन कवर में बदलाव का अनुरोध किया',
    body: 'Please verify the dimensions and photo lighting for batch #4.',
    bodyHi: 'कृपया बैच #4 के लिए माप और फ़ोटो की रोशनी की जांच करें।',
    timeAgo: '5 min ago',
    isUnread: true,
    linkText: 'View Draft · ड्राफ़्ट देखें',
    linkRoute: '/artisan/review',
    audioText: 'सुनीता दीदी ने आपके कुशन कवर में बदलाव का अनुरोध किया। कृपया माप और फ़ोटो की रोशनी जांचें।',
  },
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
    linkRoute: '/(tabs)/artisan/earnings',
    audioText: 'चौदह सौ रुपये सीधे आपके बैंक खाते में जमा हो चुके हैं।',
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
    linkRoute: '/artisan/task/task-1',
    audioText: 'सुनीता जी ने आपके बनारसी सिल्क स्टोल की गुणवत्ता स्वीकार कर ली है।',
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
    audioText: 'भागीरथी शिल्प केंद्र पर नया सूत प्राप्त हुआ है।',
  },
];

let inMemoryNotifications = [...SEEDED_NOTIFICATIONS];

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationItem[]> => {
      return inMemoryNotifications;
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      inMemoryNotifications = inMemoryNotifications.map((n) => ({ ...n, isUnread: false }));
      return inMemoryNotifications;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useToggleNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      inMemoryNotifications = inMemoryNotifications.map((n) =>
        n.id === id ? { ...n, isUnread: false } : n
      );
      return inMemoryNotifications;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

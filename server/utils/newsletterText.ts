// The weekly newsletter's own words (server/utils/newsletter.ts), in the languages the
// site has pages in (i18n/settings.ts). Any other subscriber language gets English.
export interface NewsletterText {
  subject: (n: number) => string
  subjectNoTools: string
  heading: string
  intro: string
  toolsTitle: string
  newsTitle: string
  upvotes: (n: number) => string
  pricing: { FREE: string; FREEMIUM: string; PAID: string }
  seeAll: string
  insightsText: string
  insightsLink: string
  footer: string
  unsubscribe: string
}

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other)

export const NEWSLETTER_TEXT: Record<string, NewsletterText> = {
  en: {
    subject: n => `${n} new AI ${plural(n, 'tool', 'tools')} worth your time this week`,
    subjectNoTools: 'This week in AI — TopAICollection',
    heading: 'The best new AI tools this week',
    intro: 'Hand-picked from this week\'s launches on TopAICollection.',
    toolsTitle: 'New this week',
    newsTitle: 'AI News',
    upvotes: n => `▲ ${n} ${plural(n, 'upvote', 'upvotes')}`,
    pricing: { FREE: 'Free', FREEMIUM: 'Freemium', PAID: 'Paid' },
    seeAll: 'See all new AI tools',
    insightsText: 'Want traffic and growth data for these tools?',
    insightsLink: 'Open Website Insights',
    footer: 'You\'re getting this email because you subscribed on TopAICollection.',
    unsubscribe: 'Unsubscribe'
  },
  vi: {
    subject: n => `${n} công cụ AI mới đáng chú ý tuần này`,
    subjectNoTools: 'Tuần này trong thế giới AI — TopAICollection',
    heading: 'Những công cụ AI mới nổi bật tuần này',
    intro: 'Được chọn lọc từ các công cụ ra mắt trong tuần trên TopAICollection.',
    toolsTitle: 'Mới trong tuần',
    newsTitle: 'Tin AI',
    upvotes: n => `▲ ${n} lượt upvote`,
    pricing: { FREE: 'Miễn phí', FREEMIUM: 'Freemium', PAID: 'Trả phí' },
    seeAll: 'Xem tất cả công cụ AI mới',
    insightsText: 'Muốn xem dữ liệu lượt truy cập và tăng trưởng của các công cụ này?',
    insightsLink: 'Mở Website Insights',
    footer: 'Bạn nhận được email này vì đã đăng ký nhận tin trên TopAICollection.',
    unsubscribe: 'Hủy đăng ký'
  },
  zh: {
    subject: n => `本周值得关注的 ${n} 款新 AI 工具`,
    subjectNoTools: '本周 AI 动态 — TopAICollection',
    heading: '本周最佳新 AI 工具',
    intro: '精选自本周在 TopAICollection 上线的工具。',
    toolsTitle: '本周新品',
    newsTitle: 'AI 新闻',
    upvotes: n => `▲ ${n} 个赞`,
    pricing: { FREE: '免费', FREEMIUM: '免费增值', PAID: '付费' },
    seeAll: '查看所有新 AI 工具',
    insightsText: '想了解这些工具的流量和增长数据？',
    insightsLink: '打开 Website Insights',
    footer: '你收到这封邮件，是因为你在 TopAICollection 上订阅了我们的通讯。',
    unsubscribe: '退订'
  },
  es: {
    subject: n => `${n} ${plural(n, 'nueva herramienta', 'nuevas herramientas')} de IA que valen la pena esta semana`,
    subjectNoTools: 'Esta semana en IA — TopAICollection',
    heading: 'Las mejores herramientas de IA nuevas de la semana',
    intro: 'Seleccionadas entre los lanzamientos de esta semana en TopAICollection.',
    toolsTitle: 'Nuevas esta semana',
    newsTitle: 'Noticias de IA',
    upvotes: n => `▲ ${n} ${plural(n, 'voto', 'votos')}`,
    pricing: { FREE: 'Gratis', FREEMIUM: 'Freemium', PAID: 'De pago' },
    seeAll: 'Ver todas las herramientas de IA nuevas',
    insightsText: '¿Quieres datos de tráfico y crecimiento de estas herramientas?',
    insightsLink: 'Abrir Website Insights',
    footer: 'Recibes este correo porque te suscribiste en TopAICollection.',
    unsubscribe: 'Cancelar suscripción'
  },
  de: {
    subject: n => `${n} ${plural(n, 'neues KI-Tool', 'neue KI-Tools')}, die sich diese Woche lohnen`,
    subjectNoTools: 'Diese Woche in der KI — TopAICollection',
    heading: 'Die besten neuen KI-Tools der Woche',
    intro: 'Ausgewählt aus den Neuvorstellungen dieser Woche auf TopAICollection.',
    toolsTitle: 'Neu diese Woche',
    newsTitle: 'KI-News',
    upvotes: n => `▲ ${n} ${plural(n, 'Upvote', 'Upvotes')}`,
    pricing: { FREE: 'Kostenlos', FREEMIUM: 'Freemium', PAID: 'Kostenpflichtig' },
    seeAll: 'Alle neuen KI-Tools ansehen',
    insightsText: 'Du möchtest Traffic- und Wachstumsdaten zu diesen Tools?',
    insightsLink: 'Website Insights öffnen',
    footer: 'Du erhältst diese E-Mail, weil du dich auf TopAICollection angemeldet hast.',
    unsubscribe: 'Abmelden'
  },
  ja: {
    subject: n => `今週チェックしたい新しい AI ツール ${n} 選`,
    subjectNoTools: '今週の AI — TopAICollection',
    heading: '今週のおすすめ新着 AI ツール',
    intro: 'TopAICollection で今週公開されたツールから厳選しました。',
    toolsTitle: '今週の新着',
    newsTitle: 'AI ニュース',
    upvotes: n => `▲ ${n} 票`,
    pricing: { FREE: '無料', FREEMIUM: 'フリーミアム', PAID: '有料' },
    seeAll: '新着 AI ツールをすべて見る',
    insightsText: 'これらのツールのトラフィックや成長データを見たいですか？',
    insightsLink: 'Website Insights を開く',
    footer: 'このメールは、TopAICollection でニュースレターに登録された方にお送りしています。',
    unsubscribe: '配信停止'
  },
  fr: {
    subject: n => `${n} ${plural(n, 'nouvel outil', 'nouveaux outils')} d'IA à découvrir cette semaine`,
    subjectNoTools: 'Cette semaine dans l\'IA — TopAICollection',
    heading: 'Les meilleurs nouveaux outils d\'IA de la semaine',
    intro: 'Sélectionnés parmi les lancements de la semaine sur TopAICollection.',
    toolsTitle: 'Nouveautés de la semaine',
    newsTitle: 'Actus IA',
    upvotes: n => `▲ ${n} ${plural(n, 'vote', 'votes')}`,
    pricing: { FREE: 'Gratuit', FREEMIUM: 'Freemium', PAID: 'Payant' },
    seeAll: 'Voir tous les nouveaux outils d\'IA',
    insightsText: 'Envie des données de trafic et de croissance de ces outils ?',
    insightsLink: 'Ouvrir Website Insights',
    footer: 'Vous recevez cet e-mail parce que vous vous êtes abonné sur TopAICollection.',
    unsubscribe: 'Se désabonner'
  },
  ko: {
    subject: n => `이번 주 주목할 새 AI 도구 ${n}개`,
    subjectNoTools: '이번 주 AI 소식 — TopAICollection',
    heading: '이번 주 최고의 새 AI 도구',
    intro: '이번 주 TopAICollection에 출시된 도구 중에서 엄선했습니다.',
    toolsTitle: '이번 주 신규',
    newsTitle: 'AI 뉴스',
    upvotes: n => `▲ 추천 ${n}`,
    pricing: { FREE: '무료', FREEMIUM: '프리미엄', PAID: '유료' },
    seeAll: '새 AI 도구 모두 보기',
    insightsText: '이 도구들의 트래픽과 성장 데이터가 궁금하신가요?',
    insightsLink: 'Website Insights 열기',
    footer: 'TopAICollection에서 뉴스레터를 구독하셔서 이 이메일을 받으셨습니다.',
    unsubscribe: '구독 취소'
  },
  pt: {
    subject: n => `${n} ${plural(n, 'nova ferramenta', 'novas ferramentas')} de IA que valem a pena esta semana`,
    subjectNoTools: 'Esta semana em IA — TopAICollection',
    heading: 'As melhores novas ferramentas de IA da semana',
    intro: 'Selecionadas entre os lançamentos desta semana no TopAICollection.',
    toolsTitle: 'Novidades da semana',
    newsTitle: 'Notícias de IA',
    upvotes: n => `▲ ${n} ${plural(n, 'voto', 'votos')}`,
    pricing: { FREE: 'Grátis', FREEMIUM: 'Freemium', PAID: 'Pago' },
    seeAll: 'Ver todas as novas ferramentas de IA',
    insightsText: 'Quer dados de tráfego e crescimento dessas ferramentas?',
    insightsLink: 'Abrir Website Insights',
    footer: 'Você recebe este e-mail porque se inscreveu no TopAICollection.',
    unsubscribe: 'Cancelar inscrição'
  },
  id: {
    subject: n => `${n} alat AI baru yang layak dicoba minggu ini`,
    subjectNoTools: 'Minggu ini di dunia AI — TopAICollection',
    heading: 'Alat AI baru terbaik minggu ini',
    intro: 'Dipilih dari peluncuran minggu ini di TopAICollection.',
    toolsTitle: 'Baru minggu ini',
    newsTitle: 'Berita AI',
    upvotes: n => `▲ ${n} upvote`,
    pricing: { FREE: 'Gratis', FREEMIUM: 'Freemium', PAID: 'Berbayar' },
    seeAll: 'Lihat semua alat AI baru',
    insightsText: 'Ingin data trafik dan pertumbuhan alat-alat ini?',
    insightsLink: 'Buka Website Insights',
    footer: 'Anda menerima email ini karena berlangganan di TopAICollection.',
    unsubscribe: 'Berhenti berlangganan'
  }
}

// The language a subscriber's mail is written in: theirs when the site has it, else English
// (so the words, the tool descriptions and the links all agree).
export const mailLocale = (locale: unknown) => {
  const code = String(locale ?? '').toLowerCase()
  return code in NEWSLETTER_TEXT ? code : 'en'
}
export const newsletterText = (locale: string) => NEWSLETTER_TEXT[mailLocale(locale)]!

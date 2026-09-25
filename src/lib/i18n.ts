// Site chrome translations (nav, footer, global buttons). Page body content
// (services, blog, legal, case study) is intentionally NOT translated yet —
// see LanguageNotice.astro, which tells non-English visitors so. Detection
// is browser-language based (navigator.language), not geo-IP: this is a
// static site with no server to do IP lookups, and browser language is what
// the visitor actually asked their device to show them.
export const SUPPORTED_LOCALES = ['en', 'ar', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const localeMeta: Record<Locale, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  en: { label: 'English', flag: '🇬🇧', dir: 'ltr' },
  ar: { label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  pt: { label: 'Português', flag: '🇵🇹', dir: 'ltr' },
};

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    'nav.services': 'Services',
    'nav.caseStudies': 'Case Studies',
    'nav.about': 'About',
    'nav.blog': 'Blog',
    'nav.contact': 'Contact',
    'nav.book': 'Book a consultation',
    'footer.tagline': 'Protect. Build. Scale.',
    'footer.col.security': 'Security',
    'footer.col.build': 'Build',
    'footer.col.company': 'Company',
    'footer.col.legal': 'Legal',
    'footer.link.penetrationTesting': 'Penetration Testing',
    'footer.link.vulnerabilityAssessment': 'Vulnerability Assessment',
    'footer.link.networkCloudSecurity': 'Network & Cloud Security',
    'footer.link.complianceRisk': 'Compliance & Risk',
    'footer.link.incidentResponse': 'Incident Response',
    'footer.link.monitoringTraining': 'Monitoring & Training',
    'footer.link.websiteDevelopment': 'Website Development',
    'footer.link.softwareDevelopment': 'Software Development',
    'footer.link.aiAutomation': 'AI Automation',
    'footer.link.about': 'About',
    'footer.link.caseStudies': 'Case Studies',
    'footer.link.blog': 'Blog',
    'footer.link.contact': 'Contact',
    'footer.link.bookConsultation': 'Book a consultation',
    'footer.link.privacyPolicy': 'Privacy Policy',
    'footer.link.termsOfService': 'Terms of Service',
    'footer.link.responsibleDisclosure': 'Responsible Disclosure',
    'footer.rightsReserved': 'All rights reserved.',
    'langSwitcher.label': 'Language',
    'notice.translation': '',
    'notice.dismiss': 'Dismiss',
  },
  ar: {
    'nav.services': 'الخدمات',
    'nav.caseStudies': 'دراسات الحالة',
    'nav.about': 'من نحن',
    'nav.blog': 'المدونة',
    'nav.contact': 'اتصل بنا',
    'nav.book': 'احجز استشارة',
    'footer.tagline': 'احمِ. ابنِ. توسّع.',
    'footer.col.security': 'الأمن',
    'footer.col.build': 'التطوير',
    'footer.col.company': 'الشركة',
    'footer.col.legal': 'قانوني',
    'footer.link.penetrationTesting': 'اختبار الاختراق',
    'footer.link.vulnerabilityAssessment': 'تقييم الثغرات',
    'footer.link.networkCloudSecurity': 'أمن الشبكات والسحابة',
    'footer.link.complianceRisk': 'الامتثال والمخاطر',
    'footer.link.incidentResponse': 'الاستجابة للحوادث',
    'footer.link.monitoringTraining': 'المراقبة والتدريب',
    'footer.link.websiteDevelopment': 'تطوير المواقع',
    'footer.link.softwareDevelopment': 'تطوير البرمجيات',
    'footer.link.aiAutomation': 'أتمتة الذكاء الاصطناعي',
    'footer.link.about': 'من نحن',
    'footer.link.caseStudies': 'دراسات الحالة',
    'footer.link.blog': 'المدونة',
    'footer.link.contact': 'اتصل بنا',
    'footer.link.bookConsultation': 'احجز استشارة',
    'footer.link.privacyPolicy': 'سياسة الخصوصية',
    'footer.link.termsOfService': 'شروط الخدمة',
    'footer.link.responsibleDisclosure': 'الإفصاح المسؤول',
    'footer.rightsReserved': 'جميع الحقوق محفوظة.',
    'langSwitcher.label': 'اللغة',
    'notice.translation': 'المحتوى الرئيسي لهذه الصفحة معروض حاليًا باللغة الإنجليزية فقط.',
    'notice.dismiss': 'إغلاق',
  },
  pt: {
    'nav.services': 'Serviços',
    'nav.caseStudies': 'Estudos de Caso',
    'nav.about': 'Sobre',
    'nav.blog': 'Blog',
    'nav.contact': 'Contato',
    'nav.book': 'Agendar uma consulta',
    'footer.tagline': 'Proteja. Construa. Escale.',
    'footer.col.security': 'Segurança',
    'footer.col.build': 'Desenvolvimento',
    'footer.col.company': 'Empresa',
    'footer.col.legal': 'Legal',
    'footer.link.penetrationTesting': 'Teste de Invasão',
    'footer.link.vulnerabilityAssessment': 'Avaliação de Vulnerabilidades',
    'footer.link.networkCloudSecurity': 'Segurança de Rede e Nuvem',
    'footer.link.complianceRisk': 'Conformidade e Risco',
    'footer.link.incidentResponse': 'Resposta a Incidentes',
    'footer.link.monitoringTraining': 'Monitoramento e Treinamento',
    'footer.link.websiteDevelopment': 'Desenvolvimento de Sites',
    'footer.link.softwareDevelopment': 'Desenvolvimento de Software',
    'footer.link.aiAutomation': 'Automação com IA',
    'footer.link.about': 'Sobre',
    'footer.link.caseStudies': 'Estudos de Caso',
    'footer.link.blog': 'Blog',
    'footer.link.contact': 'Contato',
    'footer.link.bookConsultation': 'Agendar uma consulta',
    'footer.link.privacyPolicy': 'Política de Privacidade',
    'footer.link.termsOfService': 'Termos de Serviço',
    'footer.link.responsibleDisclosure': 'Divulgação Responsável',
    'footer.rightsReserved': 'Todos os direitos reservados.',
    'langSwitcher.label': 'Idioma',
    'notice.translation':
      'O conteúdo principal desta página está atualmente disponível apenas em inglês.',
    'notice.dismiss': 'Dispensar',
  },
};

export function detectLocale(browserLanguages: readonly string[]): Locale {
  for (const raw of browserLanguages) {
    const base = raw.slice(0, 2).toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) {
      return base as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

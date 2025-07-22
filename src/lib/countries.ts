export interface Country {
  code: string;
  name_en: string;
  name_ar: string;
}

export const countries: Country[] = [
  { code: 'IQ', name_en: 'Iraq', name_ar: 'العراق' },
  { code: 'US', name_en: 'United States', name_ar: 'الولايات المتحدة' },
  { code: 'EG', name_en: 'Egypt', name_ar: 'مصر' },
  { code: 'SA', name_en: 'Saudi Arabia', name_ar: 'المملكة العربية السعودية' },
  { code: 'TR', name_en: 'Turkey', name_ar: 'تركيا' },
  { code: 'JO', name_en: 'Jordan', name_ar: 'الأردن' },
  { code: 'LB', name_en: 'Lebanon', name_ar: 'لبنان' },
  { code: 'AE', name_en: 'United Arab Emirates', name_ar: 'الإمارات العربية المتحدة' },
  { code: 'GB', name_en: 'United Kingdom', name_ar: 'المملكة المتحدة' },
  { code: 'DE', name_en: 'Germany', name_ar: 'ألمانيا' },
  { code: 'FR', name_en: 'France', name_ar: 'فرنسا' },
  { code: 'JP', name_en: 'Japan', name_ar: 'اليابان' },
  { code: 'CN', name_en: 'China', name_ar: 'الصين' },
  { code: 'IN', name_en: 'India', name_ar: 'الهند' },
  { code: 'BR', name_en: 'Brazil', name_ar: 'البرازيل' },
];

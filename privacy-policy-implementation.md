# دليل تنفيذ سياسة الخصوصية لبيك أوي

## نظرة عامة
هذا الدليل يوضح كيفية تنفيذ صفحة سياسة الخصوصية لبيك أوي باستخدام Next.js 15 App Router. الصفحة ستكون متوفرة باللغة العربية مع دعم RTL.

## الخطوات

### 1. إنشاء الملفات
أنشئ الملفات التالية في مجلد `app/`:

```
app/
├── privacy-policy/
│   ├── page.tsx
│   └── layout.tsx (اختياري)
```

### 2. صفحة الخصوصية (app/privacy-policy/page.tsx)
```tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | بيك أوي',
  description: 'سياسة خصوصية بيك أوي - أداة إدارة المشاريع الذكية',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          سياسة الخصوصية
        </h1>
        
        <div className="prose prose-lg max-w-none text-right" dir="rtl">
          <p className="text-sm text-gray-600 mb-8">
            <strong>تاريخ السريان:</strong> 25 مارس 2026
          </p>
          
          <p className="mb-6">
            مرحباً بك في <strong>بيك أوي (pikAui)</strong>، أداة إدارة المشاريع الذكية من MiddleMind. نحن ملتزمون بحماية خصوصيتك ومعالجة بياناتك الشخصية بموجب قانون حماية البيانات الشخصية السعودي (PDPL).
          </p>

          {/* باقي المحتوى من ملف privacy-policy.md */}
          
          <div className="bg-gray-50 p-6 rounded-lg mt-8">
            <h2 className="text-xl font-semibold mb-4">الاتصال بنا</h2>
            <p>إذا كان لديك أسئلة حول خصوصيتك، اتصل بنا:</p>
            <ul className="list-disc list-inside mt-2">
              <li>البريد الإلكتروني: privacy@pikaui.middlemind.ai</li>
              <li>العنوان: الرياض، المملكة العربية السعودية</li>
            </ul>
          </div>
          
          <p className="mt-8 text-center text-gray-600">
            شكراً لثقتك بنا!
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 3. تحديث التخطيط الرئيسي (app/layout.tsx)
أضف دعم الخط العربي:

```tsx
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans antialiased bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}
```

### 4. ملف CSS العام (app/globals.css)
```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* خط عربي */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Noto Sans Arabic', sans-serif;
}

/* تخصيص prose للعربية */
.prose {
  font-family: 'Noto Sans Arabic', sans-serif;
}

.prose h1, .prose h2, .prose h3 {
  font-weight: 600;
  color: #1f2937;
}

.prose p {
  line-height: 1.7;
  margin-bottom: 1rem;
}

.prose strong {
  font-weight: 600;
}
```

### 5. إضافة رابط في التذييل
في مكون التذييل:

```tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-center space-x-6 rtl:space-x-reverse">
          <Link href="/privacy-policy" className="text-gray-600 hover:text-gray-900">
            سياسة الخصوصية
          </Link>
          <Link href="/terms" className="text-gray-600 hover:text-gray-900">
            شروط الاستخدام
          </Link>
        </div>
      </div>
    </footer>
  );
}
```

### 6. اختبار الصفحة
- تأكد من عرض الصفحة على `/privacy-policy`
- تحقق من دعم RTL
- اختبر على الأجهزة المحمولة

### 7. النشر
```bash
git add .
git commit -m "feat: add PDPL privacy policy page for pikAui"
git push origin master
```

## ملاحظات أمنية
- لا تقم بتخزين أي بيانات شخصية في الكود
- استخدم متغيرات البيئة لأي إعدادات حساسة
- تأكد من أن الصفحة محمية من XSS

## توافق PDPL
هذه التنفيذ يضمن:
- توفر السياسة باللغة العربية
- سهولة الوصول
- الامتثال لمتطلبات الشفافية
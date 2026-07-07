/**
 * 国际化支持 - 多语言
 */

export type Locale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR';

export interface TranslationKeys {
  // Common
  'common.save': string;
  'common.cancel': string;
  'common.confirm': string;
  'common.delete': string;
  'common.edit': string;
  'common.add': string;
  'common.search': string;
  'common.loading': string;
  'common.success': string;
  'common.error': string;
  
  // Navigation
  'nav.dashboard': string;
  'nav.contacts': string;
  'nav.calendar': string;
  'nav.fulfillment': string;
  'nav.finance': string;
  'nav.operations': string;
  'nav.privacy': string;
  
  // Dashboard
  'dashboard.title': string;
  'dashboard.subtitle': string;
  'dashboard.todayEscort': string;
  'dashboard.monthlyInsight': string;
  'dashboard.captureCenter': string;
  'dashboard.budgetProgress': string;
  'dashboard.recommendations': string;
  
  // Contacts
  'contacts.title': string;
  'contacts.subtitle': string;
  'contacts.addContact': string;
  'contacts.vipContacts': string;
  'contacts.allContacts': string;
  
  // Calendar
  'calendar.title': string;
  'calendar.subtitle': string;
  'calendar.upcoming': string;
  
  // Fulfillment
  'fulfillment.title': string;
  'fulfillment.subtitle': string;
  'fulfillment.birthdayPlan': string;
  'fulfillment.festivalPlan': string;
  'fulfillment.travelPlan': string;
  
  // Finance
  'finance.title': string;
  'finance.subtitle': string;
  'finance.recurringBills': string;
  'finance.budgetManagement': string;
  'finance.importSms': string;
  
  // Voice
  'voice.startRecording': string;
  'voice.stopRecording': string;
  'voice.listening': string;
  'voice.notSupported': string;
  
  // OCR
  'ocr.uploadImage': string;
  'ocr.analyzing': string;
  'ocr.businessCard': string;
  'ocr.smsScreenshot': string;
  'ocr.receipt': string;
}

const translations: Record<Locale, TranslationKeys> = {
  'zh-CN': {
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.add': '添加',
    'common.search': '搜索',
    'common.loading': '加载中...',
    'common.success': '操作成功',
    'common.error': '操作失败',
    
    'nav.dashboard': '看板',
    'nav.contacts': '人脉',
    'nav.calendar': '日历',
    'nav.fulfillment': '履约',
    'nav.finance': '账单',
    'nav.operations': '运营',
    'nav.privacy': '隐私',
    
    'dashboard.title': '我的看板',
    'dashboard.subtitle': '今日护航，一切就绪',
    'dashboard.todayEscort': '今日护航',
    'dashboard.monthlyInsight': '本月洞察',
    'dashboard.captureCenter': '采集中心',
    'dashboard.budgetProgress': '预算进度',
    'dashboard.recommendations': '推荐',
    
    'contacts.title': '人脉管理',
    'contacts.subtitle': '记录每一份重要关系',
    'contacts.addContact': '添加联系人',
    'contacts.vipContacts': 'VIP 联系人',
    'contacts.allContacts': '全部联系人',
    
    'calendar.title': '日历',
    'calendar.subtitle': '重要日期一目了然',
    'calendar.upcoming': '即将到来',
    
    'fulfillment.title': '履约',
    'fulfillment.subtitle': '让每一份心意都恰到好处',
    'fulfillment.birthdayPlan': '生日方案',
    'fulfillment.festivalPlan': '节日方案',
    'fulfillment.travelPlan': '差旅方案',
    
    'finance.title': '账单复盘',
    'finance.subtitle': '清晰掌握每一笔支出',
    'finance.recurringBills': '周期性账单',
    'finance.budgetManagement': '预算管理',
    'finance.importSms': '导入短信',
    
    'voice.startRecording': '开始录音',
    'voice.stopRecording': '停止录音',
    'voice.listening': '正在聆听...',
    'voice.notSupported': '您的浏览器不支持语音识别',
    
    'ocr.uploadImage': '上传图片',
    'ocr.analyzing': '正在分析...',
    'ocr.businessCard': '名片',
    'ocr.smsScreenshot': '短信截图',
    'ocr.receipt': '收据',
  },
  
  'en-US': {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    
    'nav.dashboard': 'Dashboard',
    'nav.contacts': 'Contacts',
    'nav.calendar': 'Calendar',
    'nav.fulfillment': 'Fulfillment',
    'nav.finance': 'Finance',
    'nav.operations': 'Operations',
    'nav.privacy': 'Privacy',
    
    'dashboard.title': 'My Dashboard',
    'dashboard.subtitle': 'Today\'s escort, all set',
    'dashboard.todayEscort': 'Today\'s Escort',
    'dashboard.monthlyInsight': 'Monthly Insight',
    'dashboard.captureCenter': 'Capture Center',
    'dashboard.budgetProgress': 'Budget Progress',
    'dashboard.recommendations': 'Recommendations',
    
    'contacts.title': 'Contacts',
    'contacts.subtitle': 'Record every important relationship',
    'contacts.addContact': 'Add Contact',
    'contacts.vipContacts': 'VIP Contacts',
    'contacts.allContacts': 'All Contacts',
    
    'calendar.title': 'Calendar',
    'calendar.subtitle': 'Important dates at a glance',
    'calendar.upcoming': 'Upcoming',
    
    'fulfillment.title': 'Fulfillment',
    'fulfillment.subtitle': 'Make every gesture perfect',
    'fulfillment.birthdayPlan': 'Birthday Plan',
    'fulfillment.festivalPlan': 'Festival Plan',
    'fulfillment.travelPlan': 'Travel Plan',
    
    'finance.title': 'Finance Review',
    'finance.subtitle': 'Track every expense clearly',
    'finance.recurringBills': 'Recurring Bills',
    'finance.budgetManagement': 'Budget Management',
    'finance.importSms': 'Import SMS',
    
    'voice.startRecording': 'Start Recording',
    'voice.stopRecording': 'Stop Recording',
    'voice.listening': 'Listening...',
    'voice.notSupported': 'Your browser does not support speech recognition',
    
    'ocr.uploadImage': 'Upload Image',
    'ocr.analyzing': 'Analyzing...',
    'ocr.businessCard': 'Business Card',
    'ocr.smsScreenshot': 'SMS Screenshot',
    'ocr.receipt': 'Receipt',
  },
  
  'zh-TW': {
    'common.save': '儲存',
    'common.cancel': '取消',
    'common.confirm': '確認',
    'common.delete': '刪除',
    'common.edit': '編輯',
    'common.add': '新增',
    'common.search': '搜尋',
    'common.loading': '載入中...',
    'common.success': '操作成功',
    'common.error': '操作失敗',
    
    'nav.dashboard': '看板',
    'nav.contacts': '人脈',
    'nav.calendar': '日曆',
    'nav.fulfillment': '履約',
    'nav.finance': '帳單',
    'nav.operations': '運營',
    'nav.privacy': '隱私',
    
    'dashboard.title': '我的看板',
    'dashboard.subtitle': '今日護航，一切就緒',
    'dashboard.todayEscort': '今日護航',
    'dashboard.monthlyInsight': '本月洞察',
    'dashboard.captureCenter': '採集中心',
    'dashboard.budgetProgress': '預算進度',
    'dashboard.recommendations': '推薦',
    
    'contacts.title': '人脈管理',
    'contacts.subtitle': '記錄每一份重要關係',
    'contacts.addContact': '新增聯絡人',
    'contacts.vipContacts': 'VIP 聯絡人',
    'contacts.allContacts': '全部聯絡人',
    
    'calendar.title': '日曆',
    'calendar.subtitle': '重要日期一目了然',
    'calendar.upcoming': '即將到來',
    
    'fulfillment.title': '履約',
    'fulfillment.subtitle': '讓每一份心意都恰到好處',
    'fulfillment.birthdayPlan': '生日方案',
    'fulfillment.festivalPlan': '節日方案',
    'fulfillment.travelPlan': '差旅方案',
    
    'finance.title': '帳單複盤',
    'finance.subtitle': '清晰掌握每一筆支出',
    'finance.recurringBills': '週期性帳單',
    'finance.budgetManagement': '預算管理',
    'finance.importSms': '匯入簡訊',
    
    'voice.startRecording': '開始錄音',
    'voice.stopRecording': '停止錄音',
    'voice.listening': '正在聆聽...',
    'voice.notSupported': '您的瀏覽器不支援語音辨識',
    
    'ocr.uploadImage': '上傳圖片',
    'ocr.analyzing': '正在分析...',
    'ocr.businessCard': '名片',
    'ocr.smsScreenshot': '簡訊截圖',
    'ocr.receipt': '收據',
  },
  
  'ja-JP': {
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.confirm': '確認',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.add': '追加',
    'common.search': '検索',
    'common.loading': '読み込み中...',
    'common.success': '成功',
    'common.error': 'エラー',
    
    'nav.dashboard': 'ダッシュボード',
    'nav.contacts': '連絡先',
    'nav.calendar': 'カレンダー',
    'nav.fulfillment': '履行',
    'nav.finance': '財務',
    'nav.operations': '運営',
    'nav.privacy': 'プライバシー',
    
    'dashboard.title': 'マイダッシュボード',
    'dashboard.subtitle': '今日のエスコート、準備完了',
    'dashboard.todayEscort': '今日のエスコート',
    'dashboard.monthlyInsight': '月間インサイト',
    'dashboard.captureCenter': 'キャプチャーセンター',
    'dashboard.budgetProgress': '予算進捗',
    'dashboard.recommendations': 'おすすめ',
    
    'contacts.title': '連絡先管理',
    'contacts.subtitle': '大切な関係を記録',
    'contacts.addContact': '連絡先を追加',
    'contacts.vipContacts': 'VIP連絡先',
    'contacts.allContacts': '全連絡先',
    
    'calendar.title': 'カレンダー',
    'calendar.subtitle': '重要な日付一目了然',
    'calendar.upcoming': '近日中',
    
    'fulfillment.title': '履行',
    'fulfillment.subtitle': 'すべての心を込めて',
    'fulfillment.birthdayPlan': '誕生日プラン',
    'fulfillment.festivalPlan': '祝日プラン',
    'fulfillment.travelPlan': '出張プラン',
    
    'finance.title': '財務レビュー',
    'finance.subtitle': 'すべての支出を明確に',
    'finance.recurringBills': '定期請求',
    'finance.budgetManagement': '予算管理',
    'finance.importSms': 'SMSインポート',
    
    'voice.startRecording': '録音開始',
    'voice.stopRecording': '録音停止',
    'voice.listening': '聴いています...',
    'voice.notSupported': 'お使いのブラウザは音声認識をサポートしていません',
    
    'ocr.uploadImage': '画像をアップロード',
    'ocr.analyzing': '分析中...',
    'ocr.businessCard': '名刺',
    'ocr.smsScreenshot': 'SMSスクリーンショット',
    'ocr.receipt': '領収書',
  },
  
  'ko-KR': {
    'common.save': '저장',
    'common.cancel': '취소',
    'common.confirm': '확인',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.add': '추가',
    'common.search': '검색',
    'common.loading': '로딩 중...',
    'common.success': '성공',
    'common.error': '오류',
    
    'nav.dashboard': '대시보드',
    'nav.contacts': '연락처',
    'nav.calendar': '캘린더',
    'nav.fulfillment': '이행',
    'nav.finance': '재무',
    'nav.operations': '운영',
    'nav.privacy': '개인정보',
    
    'dashboard.title': '내 대시보드',
    'dashboard.subtitle': '오늘의 호위, 준비 완료',
    'dashboard.todayEscort': '오늘의 호위',
    'dashboard.monthlyInsight': '월간 인사이트',
    'dashboard.captureCenter': '캡처 센터',
    'dashboard.budgetProgress': '예산 진행',
    'dashboard.recommendations': '추천',
    
    'contacts.title': '연락처 관리',
    'contacts.subtitle': '중요한 관계를 기록',
    'contacts.addContact': '연락처 추가',
    'contacts.vipContacts': 'VIP 연락처',
    'contacts.allContacts': '전체 연락처',
    
    'calendar.title': '캘린더',
    'calendar.subtitle': '중요한 날짜 한눈에',
    'calendar.upcoming': '다가오는',
    
    'fulfillment.title': '이행',
    'fulfillment.subtitle': '모든 마음을 담아',
    'fulfillment.birthdayPlan': '생일 플랜',
    'fulfillment.festivalPlan': '명절 플랜',
    'fulfillment.travelPlan': '출장 플랜',
    
    'finance.title': '재무 리뷰',
    'finance.subtitle': '모든 지출을 명확하게',
    'finance.recurringBills': '정기 청구',
    'finance.budgetManagement': '예산 관리',
    'finance.importSms': 'SMS 가져오기',
    
    'voice.startRecording': '녹음 시작',
    'voice.stopRecording': '녹음 중지',
    'voice.listening': '듣고 있습니다...',
    'voice.notSupported': '브라우저가 음성 인식을 지원하지 않습니다',
    
    'ocr.uploadImage': '이미지 업로드',
    'ocr.analyzing': '분석 중...',
    'ocr.businessCard': '명함',
    'ocr.smsScreenshot': 'SMS 스크린샷',
    'ocr.receipt': '영수증',
  },
};

export function t(key: keyof TranslationKeys, locale: Locale = 'zh-CN'): string {
  return translations[locale]?.[key] || translations['zh-CN'][key] || key;
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN';
  const stored = localStorage.getItem('liji-locale');
  if (stored && stored in translations) return stored as Locale;
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) return browserLang.includes('TW') ? 'zh-TW' : 'zh-CN';
  if (browserLang.startsWith('ja')) return 'ja-JP';
  if (browserLang.startsWith('ko')) return 'ko-KR';
  return 'en-US';
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('liji-locale', locale);
}

export const SUPPORTED_LOCALES: { code: Locale; name: string; nativeName: string }[] = [
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
];

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<string, { en: string; hi: string }> = {
  // Brand & Shell
  app_name: { en: 'JalDrishti', hi: 'जलदृष्टि' },
  app_subtitle: { en: 'Smart Multi-Village Water Intelligence System', hi: 'स्मार्ट बहु-ग्राम जल बुद्धिमत्ता एवं प्रबंधन प्रणाली' },
  three_villages_one_pump: { en: '3 Villages · 1 Common Central Pump', hi: 'तीन गाँव · एक साझा मुख्य पंप' },
  simulated_badge: { en: 'SIMULATION ACTIVE', hi: 'सिमुलेशन सक्रिय' },
  log_out: { en: 'Log out', hi: 'लॉग आउट' },
  log_in: { en: 'Log in', hi: 'लॉग इन' },
  demo_mode_banner: { en: 'DEMO MODE: Running synthetic physical telemetry. Controls are safely simulated and will not send hardware commands.', hi: 'डेमो मोड: वास्तविक समय सिमुलेशन सक्रिय। कोई वास्तविक हार्डवेयर कमांड नहीं भेजी जाती।' },

  // Navigation
  nav_overview: { en: 'Overview', hi: 'अवलोकन' },
  nav_villages: { en: 'Three Villages', hi: 'तीनों गाँव' },
  nav_network: { en: 'Distribution GIS', hi: 'वितरण नेटवर्क GIS' },
  nav_pump: { en: 'Central Main Pump', hi: 'मुख्य पंप स्टेशन' },
  nav_tanks: { en: 'Storage Tanks', hi: 'जल भंडारण टंकियाँ' },
  nav_leaks: { en: 'Leak Intelligence', hi: 'रिसाव बुद्धिमत्ता' },
  nav_sensors: { en: 'Sensors & Quality', hi: 'सेंसर व जल गुणवत्ता' },
  nav_alarms: { en: 'Alarm Centre', hi: 'अलार्म केंद्र' },
  nav_maintenance: { en: 'Work Orders', hi: 'मरम्मत कार्य आदेश' },
  nav_assets: { en: 'Asset Registry', hi: 'उपकरण व पाइपलाइन' },
  nav_users: { en: 'Users & Roles', hi: 'उपयोगकर्ता व भूमिकाएं' },
  nav_notices: { en: 'Notice Board', hi: 'गाँव सूचना बोर्ड' },
  nav_analytics: { en: 'Water Analytics', hi: 'जल संतुलन व विश्लेषण' },
  nav_audit: { en: 'Audit Trails', hi: 'सुरक्षा ऑडिट लॉग' },
  nav_home: { en: 'My Water Supply', hi: 'मेरी जल आपूर्ति' },
  nav_complaints: { en: 'Complaints', hi: 'जल शिकायतें' },
  nav_advice: { en: 'Water Conservation', hi: 'जल संरक्षण सलाह' },

  // Resident Portal
  resident_welcome: { en: 'Welcome to your village water service', hi: 'आपकी ग्राम जल सेवा में स्वागत है' },
  water_status: { en: 'Water Supply Status', hi: 'जल आपूर्ति की स्थिति' },
  status_normal: { en: 'Normal Supply', hi: 'सामान्य आपूर्ति' },
  status_warning: { en: 'Supply Affected / Low Pressure', hi: 'आपूर्ति प्रभावित / कम दबाव' },
  status_critical: { en: 'Emergency Interruption', hi: 'आपातकालीन जल बाधा' },
  next_supply_time: { en: 'Next Scheduled Water Supply', hi: 'अगली निर्धारित जल आपूर्ति' },
  tank_storage: { en: 'Village Storage Tank Reserve', hi: 'गाँव की टंकी का जल स्तर' },
  report_issue: { en: 'Report a Water Problem', hi: 'जल समस्या की शिकायत करें' },
  track_complaint: { en: 'Track Complaint Status', hi: 'शिकायत की स्थिति देखें' },
  latest_notices: { en: 'Important Village Announcements', hi: 'गाँव की महत्वपूर्ण सूचनाएं' },

  // Metrics
  pump_discharge: { en: 'Main Pump Discharge', hi: 'मुख्य पंप निकास' },
  flow_rate: { en: 'Flow Rate', hi: 'प्रवाह दर' },
  discharge_pressure: { en: 'Discharge Pressure', hi: 'निकास दबाव' },
  motor_temperature: { en: 'Motor Temperature', hi: 'मोटर तापमान' },
  motor_current: { en: '3-Phase Current', hi: '3-फेज विद्युत धारा' },
  power_kw: { en: 'Power Consumption', hi: 'विद्युत खपत' },
  run_hours: { en: 'Total Running Hours', hi: 'कुल चलने के घंटे' },
  total_water_supplied: { en: 'Total Water Supplied', hi: 'आपूर्ति किया गया कुल जल' },
  energy_intensity: { en: 'Energy Intensity', hi: 'ऊर्जा तीव्रता' },

  // Water Balance
  water_balance_diff: { en: 'Water Balance Difference', hi: 'जल संतुलन अंतर' },
  supplied_volume: { en: 'System Input Volume', hi: 'सिस्टम इनपुट जल' },
  authorized_consumption: { en: 'Authorized Consumption', hi: 'अधिकृत जल खपत' },
  estimated_physical_losses: { en: 'Estimated Physical Losses', hi: 'अनुमानित भौतिक रिसाव' },
  apparent_losses: { en: 'Apparent & Unbilled Losses', hi: 'अनुमानित मीटर व गैर-बिल हानि' },

  // Common Actions
  mark_read: { en: 'Mark as read', hi: 'पढ़ा हुआ चिह्नित करें' },
  mark_unread: { en: 'Mark as unread', hi: 'अपठित चिह्नित करें' },
  publish_notice: { en: 'Publish Notice', hi: 'सूचना प्रकाशित करें' },
  submit_complaint: { en: 'Submit Complaint', hi: 'शिकायत दर्ज करें' },
  save_changes: { en: 'Save Changes', hi: 'बदलाव सहेजें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  download_csv: { en: 'Download CSV Report', hi: 'CSV रिपोर्ट डाउनलोड करें' },
  print_report: { en: 'Print / Save PDF', hi: 'प्रिंट / PDF सहेजें' },
  acknowledge: { en: 'Acknowledge', hi: 'स्वीकार करें' },
  assign: { en: 'Assign', hi: 'जिम्मेदारी सौंपें' },
  resolve: { en: 'Resolve', hi: 'समाधान करें' },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('jaldrishti_lang') as Language;
    if (saved && (saved === 'en' || saved === 'hi')) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('jaldrishti_lang', newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'hi' : 'en');
  };

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][lang] || translations[key].en || key;
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

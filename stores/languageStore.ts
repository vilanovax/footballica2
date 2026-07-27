import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { writeLocaleCookie } from "@/lib/i18n/localeCookie";

type LanguageState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => {
        writeLocaleCookie(locale);
        set({ locale });
      },
    }),
    {
      name: "footballica:lang",
      onRehydrateStorage: () => (state) => {
        if (state?.locale) writeLocaleCookie(state.locale);
      },
    },
  ),
);

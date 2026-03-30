import { createElement } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  I18nProvider,
  detectBrowserLanguage,
  type I18nContextValue,
  localeFromLanguage,
  localeName,
  normalizeLanguage,
  pickLang,
  useI18n,
  type LangText,
} from "./i18n";

const ORIGINAL_LANGUAGE = window.navigator.language;
const ORIGINAL_LANGUAGES = window.navigator.languages;

describe("i18n helpers", () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: ORIGINAL_LANGUAGE,
    });
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ORIGINAL_LANGUAGES,
    });
  });

  it("normalizeLanguage는 다양한 locale 코드를 표준 언어코드로 정규화한다", () => {
    expect(normalizeLanguage("ko-KR")).toBe("ko");
    expect(normalizeLanguage("en_US")).toBe("en");
    expect(normalizeLanguage("ja-JP")).toBe("ja");
    expect(normalizeLanguage("zh-CN")).toBe("zh");
    expect(normalizeLanguage("pt-BR")).toBe("pt");
    expect(normalizeLanguage("pt")).toBe("pt");
    expect(normalizeLanguage("fr-FR")).toBe("en");
    expect(normalizeLanguage(undefined)).toBe("en");
  });

  it("detectBrowserLanguage는 navigator.languages 우선순위로 감지한다", () => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["ja-JP", "en-US"],
    });
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "ko-KR",
    });
    expect(detectBrowserLanguage()).toBe("ja");
  });

  it("localeName/pickLang/localeFromLanguage가 fallback 규칙을 지킨다", () => {
    const text: LangText = {
      ko: "안녕하세요",
      en: "hello",
    };
    expect(pickLang("ko", text)).toBe("안녕하세요");
    expect(pickLang("ja", text)).toBe("hello");
    expect(pickLang("zh", text)).toBe("hello");
    expect(pickLang("pt", text)).toBe("hello");
    expect(pickLang("pt", { ko: "안녕", en: "hello", pt: "olá" })).toBe("olá");

    expect(
      localeName("ko", {
        name: "Planning",
        name_ko: "기획",
      }),
    ).toBe("기획");
    expect(
      localeName("ja", {
        name: "Planning",
        name_ja: "",
      }),
    ).toBe("Planning");

    expect(localeFromLanguage("ko")).toBe("ko-KR");
    expect(localeFromLanguage("en")).toBe("en-US");
    expect(localeFromLanguage("ja")).toBe("ja-JP");
    expect(localeFromLanguage("zh")).toBe("zh-CN");
    expect(localeFromLanguage("pt")).toBe("pt-BR");

    expect(
      localeName("pt", {
        name: "Planning",
        name_pt: "Planejamento",
      }),
    ).toBe("Planejamento");
    expect(
      localeName("pt", {
        name: "Planning",
        name_pt: "",
      }),
    ).toBe("Planning");
  });

  it("useI18n은 override 언어가 있으면 Provider 언어보다 override를 우선한다", () => {
    let result: I18nContextValue = {
      language: "en",
      locale: "en-US",
      t: (text) => (typeof text === "string" ? text : text.en),
    };
    const Probe = ({ override }: { override?: string }) => {
      result = useI18n(override);
      return null;
    };

    const { rerender } = render(
      createElement(I18nProvider, {
        language: "ko",
        children: createElement(Probe, { override: "ja-JP" }),
      }),
    );

    expect(result.language).toBe("ja");
    expect(result.locale).toBe("ja-JP");
    expect(
      result.t({
        ko: "안녕하세요",
        en: "hello",
        ja: "こんにちは",
        zh: "你好",
      }),
    ).toBe("こんにちは");

    rerender(
      createElement(I18nProvider, {
        language: "ko",
        children: createElement(Probe, { override: undefined }),
      }),
    );

    expect(result.language).toBe("ko");
    expect(result.locale).toBe("ko-KR");
    expect(
      result.t({
        ko: "안녕하세요",
        en: "hello",
        ja: "こんにちは",
        zh: "你好",
      }),
    ).toBe("안녕하세요");
  });
});

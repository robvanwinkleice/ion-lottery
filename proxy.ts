import { NextResponse, type NextRequest } from "next/server";

const LOCALE_COOKIE = "ion-lottery-locale-choice";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const englishToChinese: Record<string, string> = {
  "/": "/zh",
  "/history": "/zh/history",
  "/winners": "/zh/winners",
  "/docs": "/zh/docs"
};

const chineseToEnglish: Record<string, string> = Object.fromEntries(Object.entries(englishToChinese).map(([englishPath, chinesePath]) => [chinesePath, englishPath]));

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const explicitLocale = searchParams.get("lang");

  if (explicitLocale === "en" || explicitLocale === "zh") {
    const response = redirectToLocalePath(request, explicitLocale);
    response.cookies.set(LOCALE_COOKIE, explicitLocale, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax"
    });
    return response;
  }

  const preferredLocale = request.cookies.get(LOCALE_COOKIE)?.value ?? localeFromAcceptLanguage(request.headers.get("accept-language"));
  const chinesePath = englishToChinese[pathname];

  if (preferredLocale === "zh" && chinesePath) {
    const url = request.nextUrl.clone();
    url.pathname = chinesePath;

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/history", "/winners", "/docs", "/zh", "/zh/history", "/zh/winners", "/zh/docs"]
};

function redirectToLocalePath(request: NextRequest, locale: "en" | "zh") {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.searchParams.delete("lang");

  if (locale === "zh" && englishToChinese[pathname]) {
    url.pathname = englishToChinese[pathname];
  }

  if (locale === "en" && chineseToEnglish[pathname]) {
    url.pathname = chineseToEnglish[pathname];
  }

  return NextResponse.redirect(url);
}

function localeFromAcceptLanguage(header: string | null) {
  if (!header) {
    return "en";
  }

  const preferredLanguage = header
    .split(",")
    .map((value, index) => {
      const [language, ...parameters] = value.trim().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;

      return {
        language: language.toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
        index
      };
    })
    .filter(({ language }) => language)
    .sort((left, right) => right.quality - left.quality || left.index - right.index)
    .find(({ language }) => language.startsWith("zh") || language.startsWith("en"));

  return preferredLanguage?.language.startsWith("zh") ? "zh" : "en";
}

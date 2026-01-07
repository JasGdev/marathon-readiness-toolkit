// translation dictionary 
const I18N = {
  en: {
    page_title: "Race Time Estimator",
    title: "Race Time Estimator",
    explain_title: "How this estimate is calculated",
    explain: "This estimate is based on the “5 × 10K minus 10 minutes” method, a long-standing marathon prediction approach originally proposed by British running coach Frank Horwill and later discussed by coaches at Runner’s World UK.\n\n" +
      "The idea is simple: take a recent 10K race effort, multiply the time by five, and subtract ten minutes. The result gives a realistic marathon reference based on current speed and aerobic fitness.\n\n" +
      "This method works best when the 10K was run at true race effort, achieved within the same training cycle, and supported by a basic endurance base.\n\n" +
      "This calculation is not a race-day prediction and does not account for fueling, weather, pacing errors, or fatigue resistance. It is best used as orientation rather than a fixed target."
      
  },
  zh: {
    page_title: "马拉松成绩预估",
    title: "马拉松成绩预估" 
  }
};

// detects language reading <html lang="">
function getLang() {
  const lang = document.documentElement.lang || "en";
  return lang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

// freeze language so not re-detecting language
const LANG = getLang();

// translation helper
// What it does
// 1. Look up translation for current language
// 2. If missing → fall back to English
// 3. If still missing → return empty string (safe failure)

function t(key){ return I18N[LANG]?.[key] ?? I18N.en[key] ?? ""; }

// To handle browser tab title handler 

function applyPageTitle(){ document.title = t("page_title"); }

// DOM translation engine
// finds every element that declares data-i18n and replace it with text using hte dictionary

function applyI18n(root=document){
  root.querySelectorAll("[data-i18n]").forEach(el=>{
    el.textContent = t(el.dataset.i18n);
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  applyPageTitle();
  applyI18n();
});
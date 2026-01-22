console.log("app.js loaded (Timeline Check)");

// ---------- DOM ----------
const formEl = document.querySelector("#tc-form");
const btnEl = document.querySelector("#tc-btn");

// Common timeline inputs (rename IDs to match your HTML)
const raceDateEl = document.querySelector("#tc-race-date"); // <input type="date">
const todayEl = document.querySelector("#tc-today");        // optional <input type="date">
const targetEl = document.querySelector("#tc-target");      // optional select (10k/half/full)
const consistencyEls = document.querySelectorAll('input[name="consistency"]'); // optional radios

function getCheckedValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
}

btnEl?.addEventListener("click", () => {
    const raceDateRaw = raceDateEl?.value ?? "";
    const todayRaw = todayEl?.value ?? ""; // optional
    const targetRaw = targetEl?.value ?? "";
    const consistency = getCheckedValue("consistency"); // optional

    console.log("=== Timeline Check Inputs ===");
    console.log("Race date:", raceDateRaw);
    console.log("Today:", todayRaw);
    console.log("Target:", targetRaw);
    console.log("Consistency:", consistency);
});

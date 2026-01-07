(function () {
  const root = document.getElementById("mrt-setup-test");
  if (!root) return;

  const btn = root.querySelector("#mrt-setup-test-btn");
  const out = root.querySelector("#mrt-setup-test-output");

  if (!btn || !out) return;

  let count = 0;

  btn.addEventListener("click", () => {
    count += 1;
    out.textContent = `Clicks: ${count}`;
  });
})();

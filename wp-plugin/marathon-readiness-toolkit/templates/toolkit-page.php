<div id="mrt-toolkit-page">
  <style>
    /* =========================================================
      MRT Toolkit Page (Scoped)
      - Designed to look clean inside any WP theme
      - Only affects elements inside #mrt-toolkit-page
    ========================================================== */

    #mrt-toolkit-page{
      --mrt-bg: #f8fafc;
      --mrt-card: #ffffff;
      --mrt-text: #0f172a;
      --mrt-muted: #475569;
      --mrt-border: #e2e8f0;
      --mrt-shadow: 0 8px 24px rgba(15, 23, 42, .08);
      --mrt-shadow-sm: 0 2px 10px rgba(15, 23, 42, .06);
      --mrt-radius: 18px;
      --mrt-radius-sm: 14px;
      --mrt-pad: 16px;
      --mrt-gap: 12px;
      --mrt-focus: rgba(59, 130, 246, .35);

      max-width: 980px;
      margin: 0 auto;
      padding: 18px 14px;
      color: var(--mrt-text);
      font-size: 16px;
      line-height: 1.75;
    }

    /* Soft backdrop wrapper */
    #mrt-toolkit-page .mrt-shell{
      background: var(--mrt-bg);
      border: 1px solid var(--mrt-border);
      border-radius: 22px;
      padding: 16px;
      box-shadow: var(--mrt-shadow-sm);
    }

    /* Mini reset (only inside toolkit) to avoid theme weirdness */
    #mrt-toolkit-page,
    #mrt-toolkit-page *{
      box-sizing: border-box;
    }
    #mrt-toolkit-page h1,
    #mrt-toolkit-page h2,
    #mrt-toolkit-page h3,
    #mrt-toolkit-page p{
      margin: 0;
    }
    #mrt-toolkit-page p{ margin-top: 8px; }
    #mrt-toolkit-page strong{ font-weight: 800; }

    /* Header card */
    #mrt-toolkit-page .mrt-hero{
      background: var(--mrt-card);
      border: 1px solid var(--mrt-border);
      border-radius: var(--mrt-radius);
      padding: 18px;
      box-shadow: var(--mrt-shadow-sm);
    }
    #mrt-toolkit-page .mrt-title{
      font-size: 24px;
      line-height: 1.25;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    #mrt-toolkit-page .mrt-sub{
      margin-top: 10px;
      color: var(--mrt-muted);
      font-size: 15px;
      line-height: 1.75;
    }

    /* Callout */
    #mrt-toolkit-page .mrt-callout{
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--mrt-border);
      background: #f1f5f9;
      color: #0f172a;
      font-size: 14px;
      line-height: 1.7;
    }

    /* Accordion stack */
    #mrt-toolkit-page .mrt-steps{
      margin-top: 14px;
      display: grid;
      gap: var(--mrt-gap);
    }

    #mrt-toolkit-page .mrt-step{
      background: var(--mrt-card);
      border: 1px solid var(--mrt-border);
      border-radius: var(--mrt-radius);
      overflow: hidden;
      box-shadow: var(--mrt-shadow-sm);
    }

    #mrt-toolkit-page .mrt-stepBtn{
      width: 100%;
      border: 0;
      background: transparent;
      padding: 14px 16px;
      cursor: pointer;
      text-align: left;

      display: grid;
      grid-template-columns: 1fr auto;
      gap: 14px;
      align-items: center;
    }

    #mrt-toolkit-page .mrt-stepBtn:hover{
      background: rgba(15, 23, 42, .02);
    }

    #mrt-toolkit-page .mrt-stepBtn:focus{
      outline: 2px solid var(--mrt-focus);
      outline-offset: 3px;
      border-radius: 14px;
      margin: 8px;
    }

    #mrt-toolkit-page .mrt-kicker{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #64748b;
      letter-spacing: .03em;
      text-transform: uppercase;
    }
    #mrt-toolkit-page .mrt-kickerDot{
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #94a3b8;
      display: inline-block;
    }

    #mrt-toolkit-page .mrt-stepTitle{
      margin-top: 6px;
      font-size: 18px;
      line-height: 1.35;
      font-weight: 900;
    }

    #mrt-toolkit-page .mrt-stepDesc{
      margin-top: 6px;
      color: var(--mrt-muted);
      font-size: 14px;
      line-height: 1.65;
    }

    #mrt-toolkit-page .mrt-chevron{
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid var(--mrt-border);
      display: grid;
      place-items: center;
      transition: transform .18s ease, background .18s ease;
      background: #fff;
      color: #0f172a;
      font-size: 18px;
      flex: 0 0 auto;
    }
    #mrt-toolkit-page .mrt-stepBtn[aria-expanded="true"] .mrt-chevron{
      transform: rotate(180deg);
      background: #f1f5f9;
    }

    #mrt-toolkit-page .mrt-panel{
      padding: 0 16px 16px 16px;
    }

    #mrt-toolkit-page .mrt-panelInner{
      border-top: 1px solid var(--mrt-border);
      padding-top: 14px;
    }

    #mrt-toolkit-page .mrt-helper{
      margin-top: 10px;
      font-size: 13px;
      color: #64748b;
    }

    #mrt-toolkit-page .mrt-panel[hidden]{
      display: none;
    }

    /* Make embedded module content breathe */
    #mrt-toolkit-page .mrt-moduleSlot{
      padding: 2px 0 0 0;
    }

    /* Responsive */
    @media (min-width: 768px){
      #mrt-toolkit-page{ padding: 22px 18px; }
      #mrt-toolkit-page .mrt-shell{ padding: 18px; }
      #mrt-toolkit-page .mrt-title{ font-size: 28px; }
      #mrt-toolkit-page .mrt-stepTitle{ font-size: 19px; }
    }

    /* Toolkit container: reduce padding on small screens */
@media (max-width: 640px){
  #mrt-toolkit-page{
    padding-left: 8px;
    padding-right: 8px;
  }

  #mrt-toolkit-page .mrt-shell{
    padding: 10px;
    border-radius: 16px;
  }
}

/* Allow embedded modules to breathe */
@media (max-width: 640px){
  #mrt-toolkit-page #race-time-estimator,
  #mrt-toolkit-page #goal-pace-converter,
  #mrt-toolkit-page #timeline-check{
    max-width: 100%;
    width: 100%;
    margin: 12px auto;
    padding-left: 0;
    padding-right: 0;
  }
}

/* Fix WP theme input min-width causing overflow */
#mrt-toolkit-page input,
#mrt-toolkit-page select{
  min-width: 0;
  max-width: 100%;
}

/* Grid inputs (HH : MM : SS etc.) must be shrinkable */
#mrt-toolkit-page .gpc-time-row,
#mrt-toolkit-page .rte-time-row{
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

#mrt-toolkit-page .gpc-time-box,
#mrt-toolkit-page .rte-time-box{
  min-width: 0;
}
  </style>

  <div class="mrt-shell">
    <!-- Header / Explanation -->
    <div class="mrt-hero">
      <h2 class="mrt-title">马拉松备赛目标校准工具</h2>
      <p class="mrt-sub">
        这里有 3 个小工具，按顺序使用效果最好：先看<strong>现状</strong>，再换算<strong>目标配速</strong>，最后做一次<strong>目标与时间的现实校准</strong>。
        它们<strong>不生成训练计划</strong>，也<strong>不承诺提升幅度或比赛成绩</strong>，只是帮助你理解「当前水平 × 目标 × 时间」的关系。
      </p>

      <div class="mrt-callout">
        <strong>怎么用最舒服：</strong>一次只打开一个模块；如果第 3 个模块显示差距很大，不代表“不可能”，只代表可能需要更多时间、更一致的训练结构，或需要调整目标预期。
      </div>
    </div>

    <!-- Accordion -->
    <div class="mrt-steps" role="region" aria-label="Marathon Readiness Toolkit Modules">
      <!-- Step 1 -->
      <section class="mrt-step">
        <button class="mrt-stepBtn" type="button" aria-expanded="true" aria-controls="mrt-panel-1" id="mrt-btn-1">
          <div>
            <div class="mrt-kicker"><span class="mrt-kickerDot"></span> 第一步｜了解现状</div>
            <h3 class="mrt-stepTitle">我目前的全马水平大概在哪？</h3>
            <p class="mrt-stepDesc">用近期 10K 或半马成绩，生成一个全马“参考区间”（不是承诺）。</p>
          </div>
          <div class="mrt-chevron" aria-hidden="true">⌄</div>
        </button>

        <div class="mrt-panel" id="mrt-panel-1">
          <div class="mrt-panelInner">
            <div class="mrt-moduleSlot">
              <?php echo do_shortcode('[race_time_estimator]'); ?>
            </div>
            <p class="mrt-helper">提示：如果你只想快速知道“合理完赛区间”，只用这个模块也可以。</p>
          </div>
        </div>
      </section>

      <!-- Step 2 -->
      <section class="mrt-step">
        <button class="mrt-stepBtn" type="button" aria-expanded="false" aria-controls="mrt-panel-2" id="mrt-btn-2">
          <div>
            <div class="mrt-kicker"><span class="mrt-kickerDot"></span> 第二步｜明确目标配速</div>
            <h3 class="mrt-stepTitle">如果我有目标，配速是多少？</h3>
            <p class="mrt-stepDesc">把目标完赛时间换算成每公里配速，方便你理解“目标速度”。</p>
          </div>
          <div class="mrt-chevron" aria-hidden="true">⌄</div>
        </button>

        <div class="mrt-panel" id="mrt-panel-2" hidden>
          <div class="mrt-panelInner">
            <div class="mrt-moduleSlot">
              <?php echo do_shortcode('[goal_pace_converter]'); ?>
            </div>
            <p class="mrt-helper">提示：配速只是“目标的语言”，不代表你现在已经具备该能力。</p>
          </div>
        </div>
      </section>

      <!-- Step 3 -->
      <section class="mrt-step">
        <button class="mrt-stepBtn" type="button" aria-expanded="false" aria-controls="mrt-panel-3" id="mrt-btn-3">
          <div>
            <div class="mrt-kicker"><span class="mrt-kickerDot"></span> 第三步｜校准目标与时间</div>
            <h3 class="mrt-stepTitle">在剩余时间内，这个目标现实吗？</h3>
            <p class="mrt-stepDesc">用“剩余周数”给差距一个时间背景，帮助你校准预期（不输出训练计划）。</p>
          </div>
          <div class="mrt-chevron" aria-hidden="true">⌄</div>
        </button>

        <div class="mrt-panel" id="mrt-panel-3" hidden>
          <div class="mrt-panelInner">
            <div class="mrt-moduleSlot">
              <?php echo do_shortcode('[timeline_check]'); ?>
            </div>
            <p class="mrt-helper">提示：这里的“提升区间”是理解尺度用的，不是保证；你可以把它当作“现实尺子”。</p>
          </div>
        </div>
      </section>
    </div>

    <script>
      (function () {
        const root = document.querySelector("#mrt-toolkit-page");
        if (!root) return;

        const buttons = Array.from(root.querySelectorAll(".mrt-stepBtn"));

        function closeAll(exceptId) {
          buttons.forEach((btn) => {
            const panelId = btn.getAttribute("aria-controls");
            const panel = root.querySelector("#" + panelId);
            const isExcept = btn.id === exceptId;

            if (!panel) return;

            if (isExcept) {
              btn.setAttribute("aria-expanded", "true");
              panel.hidden = false;
            } else {
              btn.setAttribute("aria-expanded", "false");
              panel.hidden = true;
            }
          });
        }

        buttons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const isOpen = btn.getAttribute("aria-expanded") === "true";
            if (isOpen) return;
            closeAll(btn.id);
          });
        });
      })();
    </script>
  </div>
</div>
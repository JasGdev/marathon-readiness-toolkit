# Marathon Readiness Toolkit

A modular set of runner-focused tools built with HTML, CSS, and vanilla JavaScript, designed to help marathon runners evaluate goal realism, understand training timeline context, and track progress — with WordPress integration.

This project does not provide training plans or coaching advice.  
Instead, it focuses on orientation, expectation-setting, and anxiety reduction during long marathon builds.

The tools are designed to run both as:
1. standalone demos (via GitHub Pages), and
2. integrated tools inside a WordPress / FluentCommunity site via a lightweight plugin wrapper.

## Why this project exists

Marathon training is long, uncertain, and emotionally noisy.

During training, runners repeatedly ask:

- Is my goal actually realistic right now?
- Am I behind, or is this phase supposed to feel like this?
- Am I improving, even if recent runs feel inconsistent?

Existing tools often fail to answer these questions clearly:

- articles are vague or generic
- training plans are prescriptive and assume perfect execution
- analytics platforms show data but offer little interpretation

This project aims to fill that gap by providing clear, contextual feedback without false precision or prescriptive instruction.

## How this differs from existing fitness & running apps

Many mainstream fitness and running apps already exist, including activity trackers, training platforms, and social fitness communities.

Those tools typically focus on:
- tracking what you did
- motivating behavior (challenges, rewards)
- prescribing workouts or training plans
- presenting performance metrics

**Marathon Readiness Toolkit focuses on a different layer:**

helping runners interpret what their current fitness means  
in the context of a specific marathon goal and timeline

Key differences:
- no workout prescriptions
- no single “guaranteed” race prediction
- no black-box scores without explanation
- no attempt to replace coaching or training platforms

The toolkit is designed to sit alongside existing apps, not compete with them, by providing context and reassurance that raw metrics alone cannot.

## Design principles

These principles guide all modules in this repo:

- **No false precision:** outputs are ranges and trends, not single numbers
- **Phase-aware context:** timeline matters as much as fitness snapshots
- **Low-anxiety language:** neutral framing instead of judgment or alarms
- **Modular by default:** each tool is useful on its own and composable later
- **Progress over perfection:** direction and consistency matter more than isolated results

## Localization & Language Strategy

This project is intentionally designed to support multiple languages without duplicating logic or maintaining separate codebases.

All modules are developed in English as the source language within this repository to keep the codebase readable, portable, and aligned with common developer workflows. Text content is separated from application logic and injected at runtime using a lightweight localization layer.

When integrated into WordPress, the same modules render a Chinese user interface by switching the presentation language based on the site’s language context. The underlying HTML structure, JavaScript logic, and calculation methods remain identical across languages.

## Planned Modules (each module answers one specific runner question)

**1. Race Time Estimator (“What marathon time range am I realistically capable of right now?”)**  
- Inputs: recent race result (5K / 10K / Half), optional training consistency  
- Output: realistic marathon time range  
- Purpose: foundation for all other modules  

**2. Goal Pace Converter (“What pace does my goal actually require?”)**  
- Inputs: goal time and race distance (10K / Half / Full)  
- Output: required pace per kilometer and mile  
- Purpose: establishes a concrete reference line for later comparisons  

**3. Goal–Timeline Expectation Check (“Given where I am now and how much time I have, what improvement ranges are realistic?”)**  
- Inputs:
  - current estimated marathon range
  - goal time
  - target race date
  - optional contextual factors (e.g. current weekly volume range, training consistency, time availability buckets)
- Output:
  - scenario-based improvement ranges over the remaining timeline (e.g. conservative / typical / optimistic)
  - neutral context labels describing how the goal aligns with those scenarios
- Purpose: expectation-setting and anxiety reduction  

**4. Progress Trendline (“Am I trending toward my goal over time?”)**  
- Inputs: periodic check-ins (race results or key efforts) with dates  
- Output: trendline of estimated capability compared against goal pace  
- Purpose: provide long-term perspective and encourage repeat check-ins  

## Purpose & Platform Impact

This project is designed not only to provide useful runner-focused tools, but to support long-term engagement and accountability within a community-based platform.

Marathon training spans months, and many runners disengage partway through a build when progress feels uncertain, uneven, or emotionally discouraging. The combined experience of this toolkit — particularly the periodic check-in and progress trendline — is intended to address that drop-off.

Rather than prescribing training plans or enforcing tasks, the tools encourage lightweight, voluntary check-ins. Users can revisit the site to update a recent race or key effort, observe how their estimated readiness has changed, and place that change in the context of their goal and remaining timeline. This creates a personal record of direction and consistency without introducing pressure or judgment.

By presenting improvement as ranges and scenarios, rather than guarantees, the toolkit aims to preserve realistic hope while avoiding false promises. Runners can see whether their goal remains aligned, a stretch, or currently out of range — and understand that these states can change over time.

Because the outputs evolve meaningfully as race day approaches, the toolkit creates natural repeat-visit triggers throughout a marathon build. These moments encourage users to return, reflect, and share experiences within the community. The tools provide context, while the community provides lived experience, reinforcing each other.

From a platform perspective, the goal is to increase retention during long training cycles, reduce anxiety-driven churn, and position the site as a trusted orientation resource rather than a prescriptive training authority.


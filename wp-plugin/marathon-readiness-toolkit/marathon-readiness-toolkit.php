<?php
/*
Plugin Name: Marathon Readiness Toolkit
Description: Reusable Marathon Readiness tools (Race Time Estimator, Goal Pace Converter, Timeline Check)
Version: 1.0.0
Author: Jason
*/

/* ======================================================
   RACE TIME ESTIMATOR
====================================================== */

function mrt_enqueue_rte_assets() {
    wp_enqueue_style(
        'mrt-rte-style',
        plugins_url('modules/race-time-estimator/style.css', __FILE__)
    );

    wp_enqueue_script(
        'mrt-rte-script',
        plugins_url('modules/race-time-estimator/app.js', __FILE__),
        [],
        null,
        true
    );
}
add_action('wp_enqueue_scripts', 'mrt_enqueue_rte_assets');

function mrt_race_time_estimator_shortcode() {
    ob_start();
    include plugin_dir_path(__FILE__) . 'modules/race-time-estimator/index.html';
    return ob_get_clean();
}
add_shortcode('race_time_estimator', 'mrt_race_time_estimator_shortcode');


/* ======================================================
   GOAL PACE CONVERTER
====================================================== */

function mrt_enqueue_gpc_assets() {
    wp_enqueue_style(
        'mrt-gpc-style',
        plugins_url('modules/goal-pace-converter/style.css', __FILE__)
    );

    wp_enqueue_script(
        'mrt-gpc-script',
        plugins_url('modules/goal-pace-converter/app.js', __FILE__),
        [],
        null,
        true
    );
}
add_action('wp_enqueue_scripts', 'mrt_enqueue_gpc_assets');

function mrt_goal_pace_converter_shortcode() {
    ob_start();
    include plugin_dir_path(__FILE__) . 'modules/goal-pace-converter/index.html';
    return ob_get_clean();
}
add_shortcode('goal_pace_converter', 'mrt_goal_pace_converter_shortcode');


/* ======================================================
   TIMELINE CHECK
====================================================== */

function mrt_enqueue_tc_assets() {
    wp_enqueue_style(
        'mrt-tc-style',
        plugins_url('modules/timeline-check/style.css', __FILE__)
    );

    wp_enqueue_script(
        'mrt-tc-script',
        plugins_url('modules/timeline-check/app.js', __FILE__),
        [],
        null,
        true
    );
}
add_action('wp_enqueue_scripts', 'mrt_enqueue_tc_assets');

function mrt_timeline_check_shortcode() {
    ob_start();
    include plugin_dir_path(__FILE__) . 'modules/timeline-check/index.html';
    return ob_get_clean();
}
add_shortcode('timeline_check', 'mrt_timeline_check_shortcode');

/* ======================================================
   Tool Kit Page
====================================================== */

add_shortcode('mrt_toolkit_page', function () {
    ob_start();
    include plugin_dir_path(__FILE__) . 'templates/toolkit-page.php';
    return ob_get_clean();
});

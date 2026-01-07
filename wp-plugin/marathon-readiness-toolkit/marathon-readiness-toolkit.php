<?php
/**
 * Plugin Name: Marathon Readiness Toolkit (Setup Test)
 * Description: Setup test to verify GitHub → WordPress shortcode + JS/CSS workflow.
 * Version: 0.0.1
 */

if (!defined('ABSPATH')) exit;

/**
 * Enqueue setup test assets (CSS + JS).
 * For the setup test we load globally; later we can load only when shortcode is present.
 */
add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style(
    'mrt-setup-test-css',
    plugin_dir_url(__FILE__) . 'assets/setup-test.css',
    [],
    '0.0.1'
  );

  wp_enqueue_script(
    'mrt-setup-test-js',
    plugin_dir_url(__FILE__) . 'assets/setup-test.js',
    [],
    '0.0.1',
    true
  );
});

/**
 * Shortcode: [mrt_setup_test]
 */
add_shortcode('mrt_setup_test', function () {
  return '
    <div id="mrt-setup-test" class="mrt-setup-test">
      <h3>Marathon Readiness Toolkit — Setup Test</h3>
      <p>If this box is styled and the button increments, the WordPress pipeline works ✅</p>
      <button type="button" id="mrt-setup-test-btn">Click me</button>
      <div id="mrt-setup-test-output">Clicks: 0</div>
    </div>
  ';
});

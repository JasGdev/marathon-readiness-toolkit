<?php
/*
Plugin Name: Marathon Readiness Toolkit
Description: Reusable Marathon Readiness tools (Race Time Estimator, Goal Pace Converter, Timeline Check, Progress Trendline)
Version: 1.1.0
Author: Jason
*/

if (!defined('ABSPATH')) exit;

/* ======================================================
   Helpers
====================================================== */

function mrt_plugin_url($path = '') {
    return plugins_url(ltrim($path, '/'), __FILE__);
}

function mrt_plugin_path($path = '') {
    return plugin_dir_path(__FILE__) . ltrim($path, '/');
}

/**
 * Enqueue module assets only when needed (called inside shortcode).
 */
function mrt_enqueue_module_assets($slug, $handle_prefix, $is_module_script = false) {
    $style_handle  = "mrt-{$handle_prefix}-style";
    $script_handle = "mrt-{$handle_prefix}-script";

    wp_enqueue_style(
        $style_handle,
        mrt_plugin_url("modules/{$slug}/style.css"),
        [],
        null
    );

    wp_enqueue_script(
        $script_handle,
        mrt_plugin_url("modules/{$slug}/app.js"),
        [],
        null,
        true
    );

    if ($is_module_script) {
    add_filter('script_loader_tag', function ($tag, $handle, $src) use ($script_handle) {
        if ($handle !== $script_handle) return $tag;

        // keep any existing attributes WP may add, but force type=module
        return '<script type="module" src="' . esc_url($src) . '"></script>';
    }, 10, 3);
}

    return $script_handle; // so caller can add inline config if needed
}

/* ======================================================
   Shortcodes (enqueue inside shortcode)
====================================================== */

add_shortcode('race_time_estimator', function () {
    mrt_enqueue_module_assets('race-time-estimator', 'rte', false);

    ob_start();
    include mrt_plugin_path('modules/race-time-estimator/index.html');
    return ob_get_clean();
});

add_shortcode('goal_pace_converter', function () {
    mrt_enqueue_module_assets('goal-pace-converter', 'gpc', false);

    ob_start();
    include mrt_plugin_path('modules/goal-pace-converter/index.html');
    return ob_get_clean();
});

add_shortcode('timeline_check', function () {
    mrt_enqueue_module_assets('timeline-check', 'tc', false);

    ob_start();
    include mrt_plugin_path('modules/timeline-check/index.html');
    return ob_get_clean();
});

/* ======================================================
   PROGRESS TRENDLINE (Module 4)
   - type="module"
   - inline MRT config for REST
====================================================== */

add_shortcode('progress_trendline', function () {
    // enqueue assets (module script)
    mrt_enqueue_module_assets('progress-trendline', 'pt', true);

    ob_start();

    // ✅ print config right here in the page HTML (guaranteed to exist)
    ?>
    <script>
      window.MRT = window.MRT || {};
      window.MRT.restUrl = "<?php echo esc_url_raw(rest_url()); ?>";
      window.MRT.nonce = "<?php echo esc_js(wp_create_nonce('wp_rest')); ?>";
      window.MRT.isLoggedIn = <?php echo is_user_logged_in() ? 'true' : 'false'; ?>;
    </script>
    <?php

    include mrt_plugin_path('modules/progress-trendline/index.wp.html');
    return ob_get_clean();
});

/* ======================================================
   Progress Trendline Persistence — WP REST API + user_meta
   Endpoints:
   - GET  /wp-json/mrt/v1/progress-trendline
   - POST /wp-json/mrt/v1/progress-trendline
====================================================== */

define('MRT_PT_META_KEY', 'mrt_pt_v1');
define('MRT_PT_VERSION', 1);

function mrt_pt_can_access_get() {
    return is_user_logged_in();
}

function mrt_pt_can_access_post(WP_REST_Request $req) {
    if (!is_user_logged_in()) return false;

    $nonce = $req->get_header('x-wp-nonce');
    if (!$nonce) $nonce = $req->get_header('X-WP-Nonce');
    if (!$nonce) $nonce = $req->get_header('x_wp_nonce');

    return $nonce && wp_verify_nonce($nonce, 'wp_rest');
}
add_action('rest_api_init', function () {
    register_rest_route('mrt/v1', '/progress-trendline', [
        [
            'methods'  => 'GET',
            'callback' => 'mrt_pt_get_state',
            'permission_callback' => 'mrt_pt_can_access_get',
        ],
        [
            'methods'  => 'POST',
            'callback' => 'mrt_pt_save_state',
            'permission_callback' => 'mrt_pt_can_access_post',
        ],
    ]);
});

function mrt_pt_get_state(WP_REST_Request $req) {
    $user_id = get_current_user_id();
    $raw = get_user_meta($user_id, MRT_PT_META_KEY, true);

    if (!$raw) {
        return new WP_REST_Response([
            'version' => MRT_PT_VERSION,
            'state' => ['config' => null, 'checkins' => []],
            'updatedAt' => 0,
        ], 200);
    }

    $data = is_string($raw) ? json_decode($raw, true) : $raw;

    if (!is_array($data) || !isset($data['state']) || !is_array($data['state'])) {
        return new WP_REST_Response([
            'version' => MRT_PT_VERSION,
            'state' => ['config' => null, 'checkins' => []],
            'updatedAt' => 0,
        ], 200);
    }

    return new WP_REST_Response($data, 200);
}

function mrt_pt_save_state(WP_REST_Request $req) {
    $user_id = get_current_user_id();
    $body = $req->get_json_params();

    if (!is_array($body)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Invalid JSON body'], 400);
    }

    $state = $body['state'] ?? null;
    if (!is_array($state)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Missing state'], 400);
    }

    $config = $state['config'] ?? null;
    $checkins = $state['checkins'] ?? [];

    if (!is_null($config) && !is_array($config)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Invalid config'], 400);
    }

    if (!is_array($checkins)) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Invalid checkins'], 400);
    }

    // Anti-abuse guard
    if (count($checkins) > 400) {
        return new WP_REST_Response(['ok' => false, 'error' => 'Too many checkins'], 400);
    }

    $updatedAt = isset($body['updatedAt']) ? intval($body['updatedAt']) : time();

    $payload = [
        'version' => MRT_PT_VERSION,
        'state' => [
            'config' => $config,
            'checkins' => $checkins,
        ],
        'updatedAt' => $updatedAt,
    ];

    update_user_meta($user_id, MRT_PT_META_KEY, wp_json_encode($payload));

    return new WP_REST_Response(['ok' => true, 'savedAt' => time()], 200);
}

/* ======================================================
   Tool Kit Page
====================================================== */

add_shortcode('mrt_toolkit_page', function () {
    ob_start();
    include mrt_plugin_path('templates/toolkit-page.php');
    return ob_get_clean();
});

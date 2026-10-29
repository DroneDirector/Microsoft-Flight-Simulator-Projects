<?php
/**
 * Plugin Name: Airline Manager Pro Website
 * Description: The Airline Manager Pro website for Elementor: a showcase home page with a live route map, the app on Android and Windows, downloads that follow the newest release, and the full feature list. Every section is an Elementor widget.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Requires Plugins: elementor
 * Author: Airline Manager Pro
 * License: GPL-2.0-or-later
 * Text Domain: airline-manager-site
 */

if (!defined('ABSPATH')) exit;

define('AMS_VERSION', '1.0.0');
define('AMS_FILE', __FILE__);
define('AMS_DIR', plugin_dir_path(__FILE__));
define('AMS_URL', plugin_dir_url(__FILE__));
define('AMS_REPO', 'DroneDirector/Microsoft-Flight-Simulator-Projects');
define('AMS_TAG', 'airline-manager-pro-v');

require_once AMS_DIR . 'includes/settings.php';
require_once AMS_DIR . 'includes/pages.php';

/* ------------------------------------------------------------------ helpers */

/** Plugin settings (Settings → Airline Manager Pro website), with defaults. */
function ams_opt($key = null) {
    $defaults = [
        'facebook'  => '',
        'youtube'   => '',
        'instagram' => '',
        'tiktok'    => '',
        'android'   => '',   // empty = the newest Android download from GitHub
        'windows'   => '',   // empty = the newest Windows download from GitHub
        'play_url'  => '',   // Google Play listing, shown as an extra button when set
        'holder'    => 'Airline Manager Pro',
        'live'      => '1',  // follow the newest release on GitHub
    ];
    $o = wp_parse_args((array) get_option('ams_settings', []), $defaults);
    return $key === null ? $o : ($o[$key] ?? '');
}

/** Link of one of the plugin's pages ('home', 'features'). */
function ams_page_url($key) {
    $ids = (array) get_option('ams_pages', []);
    if (!empty($ids[$key]) && get_post_status($ids[$key])) return get_permalink($ids[$key]);
    return $key === 'home' ? home_url('/') : '#';
}

/** The releases page on GitHub (every version, for both platforms). */
function ams_releases_url() { return 'https://github.com/' . AMS_REPO . '/releases'; }

/**
 * The newest release: version and the two download links. Asked from GitHub at most every three
 * hours and kept in between, so the page never waits for GitHub; the page's script refreshes it too.
 */
function ams_release() {
    $r = get_transient('ams_release');
    if ($r === false && ams_opt('live') === '1') {
        $r = ['version' => '', 'android' => '', 'windows' => '', 'date' => ''];
        $res = wp_remote_get('https://api.github.com/repos/' . AMS_REPO . '/releases?per_page=30', ['timeout' => 4, 'headers' => ['Accept' => 'application/vnd.github+json', 'User-Agent' => 'airline-manager-site']]);
        if (!is_wp_error($res) && wp_remote_retrieve_response_code($res) === 200) {
            foreach ((array) json_decode(wp_remote_retrieve_body($res), true) as $rel) {
                if (empty($rel['tag_name']) || strpos($rel['tag_name'], AMS_TAG) !== 0 || !empty($rel['draft'])) continue;
                $r['version'] = substr($rel['tag_name'], strlen(AMS_TAG));
                $r['date'] = substr((string) ($rel['published_at'] ?? ''), 0, 10);
                foreach ((array) ($rel['assets'] ?? []) as $a) {
                    if (preg_match('/\.apk$/i', $a['name'])) $r['android'] = $a['browser_download_url'];
                    if (preg_match('/PC.*\.zip$/i', $a['name'])) $r['windows'] = $a['browser_download_url'];
                }
                break;
            }
        }
        set_transient('ams_release', $r, $r['version'] ? 3 * HOUR_IN_SECONDS : 20 * MINUTE_IN_SECONDS);
    }
    $r = is_array($r) ? $r : ['version' => '', 'android' => '', 'windows' => '', 'date' => ''];
    if (ams_opt('android')) $r['android'] = ams_opt('android');
    if (ams_opt('windows')) $r['windows'] = ams_opt('windows');
    if (!$r['android']) $r['android'] = ams_releases_url();
    if (!$r['windows']) $r['windows'] = ams_releases_url();
    return $r;
}

/** Inline SVG for a social / share icon (Simple Icons, CC0) or one of our own. */
function ams_icon($name) {
    static $icons = null;
    if ($icons === null) $icons = json_decode((string) file_get_contents(AMS_DIR . 'data/icons.json'), true) ?: [];
    $own = [
        'linkedin' => 'M4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2.3 8.6h3.4V21H2.3zM9 8.6h3.2v1.7h.1c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.4V21h-3.4v-6.2c0-1.5 0-3.4-2-3.4s-2.3 1.6-2.3 3.3V21H9z',
        'mail'     => 'M2 5h20v14H2zm2 2v.3l8 5.2 8-5.2V7zm16 2.7-8 5.2-8-5.2V17h16z',
        'link'     => 'M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0zM8 21a5 5 0 0 1-3.5-8.5l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1a3 3 0 0 0 4.2 4.2l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1A5 5 0 0 1 8 21zm9.4-7.6a1 1 0 0 1-.7-1.7l2.1-2.1a3 3 0 0 0-4.2-4.2l-2.1 2.1a1 1 0 1 1-1.4-1.4l2.1-2.1a5 5 0 0 1 7.1 7.1l-2.1 2.1a1 1 0 0 1-.8.2z',
        'share'    => 'M18 16a3 3 0 0 0-2.4 1.2l-6.8-3.4a3 3 0 0 0 0-1.6l6.8-3.4A3 3 0 1 0 15 7l-6.8 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z',
    ];
    $d = $own[$name] ?? ($icons[$name] ?? '');
    return '<svg class="ams-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' . esc_attr($d) . '"/></svg>';
}

/* ------------------------------------------------------------------ copyright year */

/** [airline_manager_year] → the current year, worked out on every page load. */
add_shortcode('airline_manager_year', function () { return esc_html(wp_date('Y')); });

/* ------------------------------------------------------------------ assets */

add_action('wp_enqueue_scripts', function () {
    wp_register_style('ams-site', AMS_URL . 'assets/css/site.css', [], AMS_VERSION);
    wp_register_script('ams-site', AMS_URL . 'assets/js/site.js', [], AMS_VERSION, true);
    wp_localize_script('ams-site', 'AMS', [
        'repo'    => AMS_REPO,
        'tag'     => AMS_TAG,
        'live'    => ams_opt('live') === '1',
        'fixed'   => ['android' => ams_opt('android'), 'windows' => ams_opt('windows')],
        'copied'  => __('Link copied', 'airline-manager-site'),
    ]);
    if (ams_is_site_page()) { wp_enqueue_style('ams-site'); wp_enqueue_script('ams-site'); }
});

/** True on the plugin's own pages (they get the night look and the scroll-to-top button). */
function ams_is_site_page() {
    if (!is_singular()) return false;
    return (bool) get_post_meta(get_queried_object_id(), '_ams_page', true);
}

add_filter('body_class', function ($c) { if (ams_is_site_page()) $c[] = 'ams-page'; return $c; });

/** The pages are dark already: browsers' own dark modes must not recolour them. Fonts load early. */
add_action('wp_head', function () {
    if (!ams_is_site_page()) return;
    echo '<meta name="color-scheme" content="light dark">' . "\n";
    echo '<meta name="supported-color-schemes" content="dark">' . "\n";
    echo '<meta name="darkreader-lock">' . "\n";
    echo '<meta name="theme-color" content="#06111F">' . "\n";
    foreach (['InterDisplay-Bold', 'Inter-Regular'] as $f) echo '<link rel="preload" href="' . esc_url(AMS_URL . 'assets/fonts/' . $f . '.woff') . '" as="font" type="font/woff" crossorigin>' . "\n";
}, 1);

/** Scroll-to-top button on every plugin page. */
add_action('wp_footer', function () {
    if (!ams_is_site_page()) return;
    echo '<button class="ams-top" type="button" aria-label="' . esc_attr__('Scroll to the top', 'airline-manager-site') . '">'
        . '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l-7 7h4.5v7h5v-7H19z"/></svg></button>';
});

/* ------------------------------------------------------------------ Elementor */

add_action('elementor/elements/categories_registered', function ($em) {
    $em->add_category('airline-manager', ['title' => 'Airline Manager Pro', 'icon' => 'eicon-globe']);
});

add_action('elementor/widgets/register', function ($wm) {
    require_once AMS_DIR . 'includes/widgets.php';
    foreach (ams_widget_classes() as $cls) $wm->register(new $cls());
});

/** Elementor's editor preview also needs the styles and the script. */
add_action('elementor/preview/enqueue_styles', function () {
    wp_enqueue_style('ams-site', AMS_URL . 'assets/css/site.css', [], AMS_VERSION);
});

add_action('admin_notices', function () {
    if (did_action('elementor/loaded') || !current_user_can('activate_plugins')) return;
    echo '<div class="notice notice-warning"><p><strong>Airline Manager Pro website</strong> needs the free <strong>Elementor</strong> plugin. Install and activate Elementor, then open Settings → Airline Manager Pro website and press “Create the pages”.</p></div>';
});

register_activation_hook(__FILE__, function () {
    ams_create_pages(false);
});

<?php
/** The two pages and how they are built from the Airline Manager Pro widgets. */
if (!defined('ABSPATH')) exit;

require_once AMS_DIR . 'includes/content.php';

/** Each page: title, slug and its widgets in order (widget name => settings; empty settings = the widget's defaults). */
function ams_page_defs() {
    $c = ams_content();
    $show = function ($k) use ($c) { return ['ams-show', $c['show'][$k]]; };
    $tail = [['ams-share', []], ['ams-footer', []]];
    return [
        'home' => ['title' => 'Airline Manager Pro', 'slug' => 'airline-manager-pro', 'widgets' => array_merge([
            ['ams-nav', []], ['ams-hero', []], ['ams-stats', []], ['ams-link', []],
            $show('ops'), $show('pilots'), $show('money'), $show('fleet'), $show('crew'), $show('ranking'),
            ['ams-windows', []], ['ams-cards', []], ['ams-download', []], ['ams-faq', []],
        ], $tail)],
        'features' => ['title' => 'All features', 'slug' => 'airline-manager-pro-features', 'widgets' => array_merge([
            ['ams-nav', ['solid' => 'yes']], ['ams-features', []], ['ams-download', ['compact' => 'yes']],
        ], $tail)],
    ];
}

function ams_eid() { return substr(md5(uniqid('', true) . wp_rand()), 0, 7); }

/** Elementor data for a page: one full-width container per widget, no padding or gaps. */
function ams_elementor_data($widgets) {
    $out = [];
    foreach ($widgets as $w) {
        list($type, $settings) = $w;
        // Repeaters need an _id per row.
        foreach ($settings as $k => $v) {
            if (is_array($v) && isset($v[0]) && is_array($v[0])) {
                foreach ($settings[$k] as $i => $row) $settings[$k][$i]['_id'] = ams_eid();
            }
        }
        $zero = ['unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true];
        $out[] = [
            'id' => ams_eid(), 'elType' => 'container', 'isInner' => false,
            'settings' => ['content_width' => 'full', 'padding' => $zero, 'margin' => $zero,
                'flex_gap' => ['column' => '0', 'row' => '0', 'isLinked' => true, 'unit' => 'px', 'size' => 0]],
            'elements' => [[
                'id' => ams_eid(), 'elType' => 'widget', 'widgetType' => $type, 'settings' => (object) $settings, 'elements' => [],
            ]],
        ];
    }
    return $out;
}

/**
 * Creates the pages (or only the missing ones). With $replace, existing pages get fresh content.
 * The home page becomes the site's front page if the site still shows the latest posts there.
 */
function ams_create_pages($replace) {
    $ids = (array) get_option('ams_pages', []);
    foreach (ams_page_defs() as $key => $def) {
        $id = $ids[$key] ?? 0;
        $exists = $id && get_post_status($id) && get_post_status($id) !== 'trash';
        if ($exists && !$replace) continue;
        if (!$exists) {
            $id = wp_insert_post(['post_type' => 'page', 'post_status' => 'publish', 'post_title' => $def['title'], 'post_name' => $def['slug'], 'post_content' => '']);
            if (is_wp_error($id) || !$id) continue;
            $ids[$key] = $id;
        }
        update_post_meta($id, '_elementor_edit_mode', 'builder');
        update_post_meta($id, '_elementor_template_type', 'wp-page');
        if (defined('ELEMENTOR_VERSION')) update_post_meta($id, '_elementor_version', ELEMENTOR_VERSION);
        update_post_meta($id, '_wp_page_template', 'elementor_canvas');
        update_post_meta($id, '_elementor_data', wp_slash(wp_json_encode(ams_elementor_data($def['widgets']))));
        update_post_meta($id, '_ams_page', $key);
        delete_post_meta($id, '_elementor_css');
    }
    update_option('ams_pages', $ids);
    if (get_option('show_on_front') === 'posts' && !empty($ids['home'])) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $ids['home']);
    }
    if (class_exists('\Elementor\Plugin')) {
        try { \Elementor\Plugin::$instance->files_manager->clear_cache(); } catch (\Throwable $e) {}
    }
}

<?php
/** Settings → Airline Manager Pro website: social links, download links, copyright name. */
if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_options_page('Airline Manager Pro website', 'Airline Manager Pro website', 'manage_options', 'airline-manager-site', 'ams_settings_page');
});

add_action('admin_init', function () {
    register_setting('ams', 'ams_settings', [
        'type' => 'array',
        'sanitize_callback' => function ($in) {
            $out = [];
            foreach (['facebook', 'youtube', 'instagram', 'tiktok', 'android', 'windows', 'play_url'] as $k) $out[$k] = esc_url_raw(trim($in[$k] ?? ''));
            $out['holder'] = sanitize_text_field($in['holder'] ?? 'Airline Manager Pro');
            $out['live'] = empty($in['live']) ? '0' : '1';
            delete_transient('ams_release');
            return $out;
        },
    ]);
    if (isset($_POST['ams_create']) && check_admin_referer('ams_create') && current_user_can('manage_options')) {
        ams_create_pages(!empty($_POST['ams_replace']));
        wp_safe_redirect(admin_url('options-general.php?page=airline-manager-site&created=1'));
        exit;
    }
});

function ams_settings_page() {
    $o = ams_opt();
    $f = function ($k, $label, $help = '') use ($o) {
        printf('<tr><th scope="row"><label for="ams_%1$s">%2$s</label></th><td><input class="regular-text" type="url" id="ams_%1$s" name="ams_settings[%1$s]" value="%3$s" placeholder="https://">%4$s</td></tr>',
            esc_attr($k), esc_html($label), esc_attr($o[$k]), $help ? '<p class="description">' . esc_html($help) . '</p>' : '');
    };
    $rel = ams_release();
    echo '<div class="wrap"><h1>Airline Manager Pro website</h1>';
    if (!empty($_GET['created'])) echo '<div class="notice notice-success"><p>The pages are ready — see the list below.</p></div>';
    echo '<form method="post" action="options.php">';
    settings_fields('ams');
    echo '<h2>Downloads</h2><table class="form-table">';
    printf('<tr><th scope="row">Newest release</th><td><label><input type="checkbox" name="ams_settings[live]" value="1" %s> Follow the newest release on GitHub automatically</label><p class="description">%s</p></td></tr>',
        checked($o['live'], '1', false), $rel['version'] ? esc_html('Now showing version ' . $rel['version'] . ($rel['date'] ? ' (' . $rel['date'] . ')' : '') . '.') : 'No release found yet: the buttons open the releases page.');
    $f('android', 'Android download', 'Empty = the newest .apk from GitHub.');
    $f('windows', 'Windows download', 'Empty = the newest PC app from GitHub.');
    $f('play_url', 'Google Play listing', 'When the app is on Google Play, add the link here and a Google Play button appears next to the downloads.');
    echo '</table><h2>Social</h2><p>Leave a link empty for now: the icon still shows, and works as soon as you add the link here.</p><table class="form-table">';
    $f('facebook', 'Facebook page');
    $f('youtube', 'YouTube channel');
    $f('instagram', 'Instagram');
    $f('tiktok', 'TikTok');
    printf('<tr><th scope="row"><label for="ams_holder">Copyright name</label></th><td><input class="regular-text" id="ams_holder" name="ams_settings[holder]" value="%s"><p class="description">Footer: © (current year, updated automatically) followed by this name.</p></td></tr>', esc_attr($o['holder']));
    echo '</table>';
    submit_button();
    echo '</form><hr><h2>Pages</h2><ul>';
    $ids = (array) get_option('ams_pages', []);
    foreach (ams_page_defs() as $key => $def) {
        $id = $ids[$key] ?? 0;
        if ($id && get_post_status($id)) printf('<li><strong>%s</strong> — <a href="%s">view</a> · <a href="%s">edit with Elementor</a></li>', esc_html($def['title']), esc_url(get_permalink($id)), esc_url(admin_url('post.php?post=' . $id . '&action=elementor')));
        else printf('<li><strong>%s</strong> — not created yet</li>', esc_html($def['title']));
    }
    echo '</ul><form method="post">';
    wp_nonce_field('ams_create');
    echo '<p><label><input type="checkbox" name="ams_replace" value="1"> Replace the existing pages with fresh copies (your changes in Elementor on them are lost)</label></p>';
    echo '<p><button class="button button-secondary" name="ams_create" value="1">Create the pages</button></p></form></div>';
}

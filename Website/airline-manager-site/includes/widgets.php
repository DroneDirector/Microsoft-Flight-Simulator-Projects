<?php
/** The Airline Manager Pro Elementor widgets: every text, picture and link is editable in Elementor's panel. */
if (!defined('ABSPATH')) exit;

use Elementor\Controls_Manager;
use Elementor\Repeater;
use Elementor\Widget_Base;

require_once AMS_DIR . 'includes/content.php';

function ams_widget_classes() {
    return ['AMS_Nav', 'AMS_Hero', 'AMS_Stats', 'AMS_Link', 'AMS_Show', 'AMS_Windows', 'AMS_Cards', 'AMS_Download', 'AMS_Faq', 'AMS_Share', 'AMS_Footer', 'AMS_Features'];
}

/* ------------------------------------------------------------------ small helpers */

/** Rich text that may hold <em>, <strong>, <br>, <p> and links. */
function ams_rich($s) { return wp_kses_post((string) $s); }

/** Line icons (own drawings, in the app's style). */
function ams_line_icon($k) {
    $p = [
        'plane'   => '<path d="M21 15.5v-1.8l-8-5V3.6a1.5 1.5 0 0 0-3 0v5.1l-8 5v1.8l8-2.5v5l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z"/>',
        'route'   => '<circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="6" r="2.2"/><path d="M7 17c6-1 3-8 10-10"/>',
        'radio'   => '<path d="M5 9a9 9 0 0 1 14 0M8 12a5 5 0 0 1 8 0"/><circle cx="12" cy="15" r="1.4"/><path d="M12 16.5V21"/>',
        'scale'   => '<path d="M12 4v16M5 20h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
        'wallet'  => '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2M6 6l9-3 1 3"/>',
        'map'     => '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20"/>',
        'shield'  => '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/>',
        'bell'    => '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
        'layers'  => '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
        'update'  => '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5"/><path d="M12 8v4.5l3 1.8"/>',
        'phone'   => '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M18 10.5v3"/>',
        'monitor' => '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',
        'sim'     => '<path d="M4 17.5h16M7 17.5l2-6.5h6l2 6.5M12 11V6M9.5 6h5"/><circle cx="12" cy="4.5" r="1.4"/>',
        'wifi'    => '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1.2"/>',
        'download'=> '<path d="M12 3v12M7 10.5l5 5 5-5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
        'arrow'   => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'check'   => '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        'search'  => '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
        'menu'    => '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'play'    => '<path d="M8 5.5v13l11-6.5z"/>',
        'store'   => '<path d="M5 3.5 18.5 12 5 20.5z"/>',
        'list'    => '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
        'tag'     => '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.4"/>',
    ][$k] ?? '';
    return '<svg class="ams-li" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' . $p . '</svg>';
}

/** The app's mark: a compass star in a ring. */
function ams_mark() {
    return '<svg class="ams-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5"/><path d="M16 4.5 18 14 27.5 16 18 18 16 27.5 14 18 4.5 16 14 14Z" fill="currentColor"/></svg>';
}
function ams_logo() { return ams_mark() . '<span class="ams-logo__name">Airline Manager<b> Pro</b></span>'; }

/** Picture URL plus the smaller copy for phones when the plugin has one ("-800" next to it). */
function ams_srcset($url) {
    if (strpos($url, AMS_URL . 'assets/img/') !== 0) return '';
    $small = preg_replace('/\.jpg$/', '-800.jpg', $url);
    $file = AMS_DIR . substr($small, strlen(AMS_URL));
    return file_exists($file) ? esc_url($small) . ' 800w, ' . esc_url($url) . ' 1600w' : '';
}

/** A tablet (or a monitor) drawn in CSS around a screenshot. */
function ams_device($img, $kind = 'tablet', $cls = '', $alt = '', $lazy = true) {
    $url = is_array($img) ? ($img['url'] ?? '') : (string) $img;
    $id = is_array($img) ? (int) ($img['id'] ?? 0) : 0;
    if ($id && !$alt) $alt = (string) get_post_meta($id, '_wp_attachment_image_alt', true);
    $set = ams_srcset($url);
    $sizes = $kind === 'monitor' ? '(max-width: 900px) 94vw, 1100px' : '(max-width: 760px) 86vw, (max-width: 1400px) 66vw, 900px';
    return '<div class="ams-device ams-device--' . esc_attr($kind) . ' ' . esc_attr($cls) . '"><div class="ams-device__screen">'
        . '<img src="' . esc_url($url) . '"' . ($set ? ' srcset="' . $set . '" sizes="' . $sizes . '"' : '') . ' width="1600" height="900" alt="' . esc_attr($alt ?: 'Airline Manager Pro screenshot') . '"'
        . ($lazy ? ' loading="lazy"' : ' fetchpriority="high"') . ' decoding="async"></div><span class="ams-device__glare"></span></div>';
}

/** The two download buttons (they follow the newest release; the page's script keeps them current). */
function ams_download_buttons($cls = '') {
    $r = ams_release();
    $h = '<div class="ams-dl-buttons ' . esc_attr($cls) . '">';
    $h .= '<a class="ams-btn ams-btn--primary" data-ams-dl="android" href="' . esc_url($r['android']) . '">' . ams_line_icon('phone') . '<span><small>Download for</small>Android</span></a>';
    $h .= '<a class="ams-btn ams-btn--primary ams-btn--alt" data-ams-dl="windows" href="' . esc_url($r['windows']) . '">' . ams_line_icon('monitor') . '<span><small>Download for</small>Windows</span></a>';
    if (ams_opt('play_url')) $h .= '<a class="ams-btn ams-btn--ghost" href="' . esc_url(ams_opt('play_url')) . '">' . ams_line_icon('store') . '<span><small>Get it on</small>Google Play</span></a>';
    return $h . '</div>';
}

/** "Version 0.5.3" pill (filled in from GitHub when the page has no version yet). */
function ams_version_pill() {
    $r = ams_release();
    return '<a class="ams-version" href="' . esc_url(ams_releases_url()) . '" data-ams-version' . ($r['version'] ? '' : ' hidden') . '><i></i><span>Version <b>' . esc_html($r['version']) . '</b></span><small>Release notes</small></a>';
}

/** Title with <em>…</em> glowing parts and line breaks. */
function ams_title($s) { return wp_kses((string) $s, ['em' => [], 'br' => [], 'strong' => []]); }

/* ------------------------------------------------------------------ base widget */

abstract class AMS_Base extends Widget_Base {
    public function get_categories() { return ['airline-manager']; }
    public function get_style_depends() { return ['ams-site']; }
    public function get_script_depends() { return ['ams-site']; }
    public function get_icon() { return 'eicon-star'; }
    public function get_keywords() { return ['airline', 'manager', 'flight', 'app']; }

    /** Content fields: id => [type, label, default]. Types: text, textarea, rich, media, url, switch, select:<a|b>. */
    protected function fields() { return []; }
    /** Repeaters: id => [label, [field id => [type, label, default]], default rows, title field]. */
    protected function repeaters() { return []; }

    protected function add_field($id, $f, $target = null) {
        list($type, $label, $def) = $f;
        $map = ['text' => Controls_Manager::TEXT, 'textarea' => Controls_Manager::TEXTAREA, 'rich' => Controls_Manager::WYSIWYG,
            'media' => Controls_Manager::MEDIA, 'url' => Controls_Manager::TEXT, 'switch' => Controls_Manager::SWITCHER];
        $args = ['label' => $label, 'default' => $def, 'label_block' => true];
        if (strpos($type, 'select:') === 0) {
            $opts = [];
            foreach (explode('|', substr($type, 7)) as $o) $opts[$o] = ucfirst($o);
            $args['type'] = Controls_Manager::SELECT; $args['options'] = $opts; $args['label_block'] = false;
        } else {
            $args['type'] = $map[$type];
            if ($type === 'switch') { $args['return_value'] = 'yes'; $args['label_block'] = false; }
            if ($type === 'media') $args['dynamic'] = ['active' => true];
        }
        ($target ?: $this)->add_control($id, $args);
    }

    protected function register_controls() {
        $this->start_controls_section('ams_content', ['label' => 'Content', 'tab' => Controls_Manager::TAB_CONTENT]);
        foreach ($this->fields() as $id => $f) $this->add_field($id, $f);
        foreach ($this->repeaters() as $id => $r) {
            list($label, $rf, $rows, $title) = $r;
            $rep = new Repeater();
            foreach ($rf as $fid => $f) $this->add_field($fid, $f, $rep);
            $this->add_control($id, ['label' => $label, 'type' => Controls_Manager::REPEATER, 'fields' => $rep->get_controls(), 'default' => $rows, 'title_field' => '{{{ ' . $title . ' }}}']);
        }
        $this->end_controls_section();
    }

    protected function s() { return $this->get_settings_for_display(); }

    /** Section heading: eyebrow, title and optional lead text. */
    protected function head($s, $lead = true, $cls = '') {
        echo '<div class="ams-head ' . esc_attr($cls) . '"><p class="ams-eyebrow" data-reveal>' . esc_html($s['eyebrow']) . '</p><h2 class="ams-h2" data-reveal>' . ams_title($s['title']) . '</h2>';
        if ($lead && !empty($s['text'])) echo '<p class="ams-lead" data-reveal>' . ams_rich($s['text']) . '</p>';
        echo '</div>';
    }
}

/* ------------------------------------------------------------------ widgets */

class AMS_Nav extends AMS_Base {
    public function get_name() { return 'ams-nav'; }
    public function get_title() { return 'Airline Manager: Top bar'; }
    public function get_icon() { return 'eicon-nav-menu'; }
    protected function fields() { return ['solid' => ['switch', 'Solid background from the start', '']]; }
    protected function render() {
        $s = $this->s();
        $home = ams_page_url('home');
        $here = get_post_meta(get_the_ID(), '_ams_page', true);
        $a = function ($hash) use ($home, $here) { return $here === 'home' ? $hash : $home . $hash; };
        $links = [['Operations', $a('#operations')], ['Economy', $a('#economy')], ['Crew', $a('#crew')], ['Windows', $a('#windows')], ['Features', ams_page_url('features')]];
        echo '<header class="ams ams-nav' . ($s['solid'] === 'yes' ? ' is-solid' : '') . '"><div class="ams-wrap ams-nav__in">';
        echo '<a class="ams-logo" href="' . esc_url($home) . '">' . ams_logo() . '</a>';
        echo '<nav class="ams-nav__links" id="ams-menu" aria-label="Main">';
        foreach ($links as $l) echo '<a href="' . esc_url($l[1]) . '"' . ($here === 'features' && $l[0] === 'Features' ? ' aria-current="page"' : '') . '>' . esc_html($l[0]) . '</a>';
        echo '<a class="ams-nav__cta" href="' . esc_url($a('#download')) . '">' . ams_line_icon('download') . 'Download</a></nav>';
        echo '<button class="ams-nav__menu" type="button" aria-label="Menu" aria-expanded="false" aria-controls="ams-menu"><i></i><i></i><i></i></button>';
        echo '</div><div class="ams-progress" aria-hidden="true"><i></i></div></header>';
    }
}

class AMS_Hero extends AMS_Base {
    public function get_name() { return 'ams-hero'; }
    public function get_title() { return 'Airline Manager: Hero'; }
    public function get_icon() { return 'eicon-banner'; }
    protected function fields() {
        $c = ams_content()['hero'];
        return [
            'eyebrow' => ['text', 'Small line above the title', $c['eyebrow']],
            'title'   => ['textarea', 'Title (use <em>…</em> for the glowing part, <br> for a new line)', $c['title']],
            'text'    => ['textarea', 'Text', $c['text']],
            'film'    => ['text', 'Second button (scrolls to the tour)', $c['film']],
            'chips'   => ['textarea', 'Badges (one per line)', $c['chips']],
            'shot_a'  => ['media', 'Screenshot left', $c['shot_a']['image']],
            'cap_a'   => ['text', 'Caption left', $c['shot_a']['caption']],
            'shot_b'  => ['media', 'Screenshot middle (shown first)', $c['shot_b']['image']],
            'cap_b'   => ['text', 'Caption middle', $c['shot_b']['caption']],
            'shot_c'  => ['media', 'Screenshot right', $c['shot_c']['image']],
            'cap_c'   => ['text', 'Caption right', $c['shot_c']['caption']],
        ];
    }
    protected function repeaters() {
        return ['more' => ['More screenshots (they take turns in the carousel)', ['image' => ['media', 'Screenshot', ams_img('shot-ops.jpg')], 'caption' => ['text', 'Caption', '']], ams_content()['hero']['more'], 'caption']];
    }
    protected function render() {
        $s = $this->s();
        echo '<section class="ams ams-hero"><canvas class="ams-routes" aria-hidden="true"></canvas><div class="ams-hero__glow" aria-hidden="true"><i></i><i></i></div>';
        echo '<div class="ams-wrap ams-hero__in"><div class="ams-hero__copy">';
        echo ams_version_pill();
        echo '<p class="ams-eyebrow" data-reveal>' . esc_html($s['eyebrow']) . '</p>';
        echo '<h1 class="ams-h1" data-reveal>' . ams_title($s['title']) . '</h1>';
        echo '<p class="ams-lead" data-reveal>' . ams_rich($s['text']) . '</p>';
        echo '<div class="ams-hero__cta" data-reveal>' . ams_download_buttons() . '<a class="ams-btn ams-btn--ghost" href="#operations">' . ams_line_icon('play') . '<span>' . esc_html($s['film']) . '</span></a></div>';
        echo '<ul class="ams-chips" data-reveal>';
        foreach (array_filter(array_map('trim', explode("\n", (string) $s['chips']))) as $b) echo '<li>' . esc_html($b) . '</li>';
        echo '</ul></div>';
        echo '<div class="ams-hero__stage" data-tilt aria-hidden="true">';
        echo ams_device($s['shot_a'], 'tablet', 'ams-hero__p ams-hero__p--a', $s['cap_a'], false);
        echo ams_device($s['shot_b'], 'tablet', 'ams-hero__p ams-hero__p--b', $s['cap_b'], false);
        echo ams_device($s['shot_c'], 'tablet', 'ams-hero__p ams-hero__p--c', $s['cap_c'], false);
        foreach ((array) ($s['more'] ?? []) as $it) {
            if (!empty($it['image']['url'])) echo ams_device($it['image'], 'tablet', 'ams-hero__p ams-hero__p--off', $it['caption'] ?? '');
        }
        echo '<div class="ams-hero__ring"></div>';
        echo '<div class="ams-flight" aria-hidden="true"><div class="ams-flight__top"><b>ATN201</b><span class="ams-flight__phase">Climb</span></div>'
            . '<div class="ams-flight__route"><b>EKVG</b><span class="ams-flight__line"><i></i><svg viewBox="0 0 24 24">' . '<path d="M21 15.5v-1.8l-8-5V3.6a1.5 1.5 0 0 0-3 0v5.1l-8 5v1.8l8-2.5v5l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z"/></svg></span><b>EKCH</b></div>'
            . '<div class="ams-flight__data"><span><small>Altitude</small><b data-f="alt">FL120</b></span><span><small>To go</small><b data-f="nm">390 nm</b></span><span><small>Gate in</small><b data-f="eta">1:58</b></span></div></div>';
        echo '<div class="ams-landed" aria-hidden="true"><span>' . ams_line_icon('check') . '</span><div><b>ATN201 at the gate in Copenhagen</b><small>Income and expenses: <em>+$35,280</em></small></div></div>';
        echo '</div><p class="ams-hero__caption" aria-live="polite"></p></div>';
        echo '<a class="ams-scrollhint" href="#ams-stats" aria-label="Scroll down"><span></span></a></section>';
    }
}

class AMS_Stats extends AMS_Base {
    public function get_name() { return 'ams-stats'; }
    public function get_title() { return 'Airline Manager: Numbers'; }
    public function get_icon() { return 'eicon-counter'; }
    protected function repeaters() {
        return ['items' => ['Numbers', ['num' => ['text', 'Number', ''], 'label' => ['text', 'Label', '']], ams_content()['stats'], 'num']];
    }
    protected function render() {
        echo '<section class="ams ams-stats" id="ams-stats"><div class="ams-wrap ams-stats__in">';
        foreach ((array) $this->s()['items'] as $i => $it) {
            echo '<div class="ams-stat" data-reveal style="--d:' . (int) $i . '"><b data-count>' . esc_html($it['num']) . '</b><span>' . esc_html($it['label']) . '</span></div>';
        }
        echo '</div></section>';
    }
}

class AMS_Link extends AMS_Base {
    public function get_name() { return 'ams-link'; }
    public function get_title() { return 'Airline Manager: How it connects'; }
    public function get_icon() { return 'eicon-flow'; }
    protected function fields() {
        $c = ams_content()['link'];
        return ['eyebrow' => ['text', 'Small line above the title', $c['eyebrow']], 'title' => ['textarea', 'Title', $c['title']], 'text' => ['textarea', 'Text', $c['text']]];
    }
    protected function repeaters() {
        return ['nodes' => ['The three steps', ['title' => ['text', 'Title', ''], 'text' => ['textarea', 'Text', '']], ams_content()['link']['nodes'], 'title']];
    }
    protected function render() {
        $s = $this->s();
        $icons = ['sim', 'monitor', 'phone'];
        echo '<section class="ams ams-link" id="connect"><div class="ams-wrap">';
        $this->head($s);
        echo '<div class="ams-flow">';
        foreach ((array) $s['nodes'] as $i => $n) {
            if ($i) echo '<div class="ams-flow__wire" data-reveal style="--d:' . (int) $i . '" aria-hidden="true"><i></i><i></i><i></i>' . ($i === 2 ? '<span>' . ams_line_icon('wifi') . 'Wi-Fi or hotspot</span>' : '<span>SimConnect</span>') . '</div>';
            echo '<div class="ams-card ams-flow__node" data-reveal data-glow style="--d:' . (int) $i . '"><span class="ams-flow__ic">' . ams_line_icon($icons[$i % 3]) . '</span><h3>' . esc_html($n['title']) . '</h3><p>' . esc_html($n['text']) . '</p></div>';
        }
        echo '</div></div></section>';
    }
}

class AMS_Show extends AMS_Base {
    public function get_name() { return 'ams-show'; }
    public function get_title() { return 'Airline Manager: Feature with screenshot'; }
    public function get_icon() { return 'eicon-image-box'; }
    protected function fields() {
        $c = ams_content()['show']['ops'];
        return [
            'anchor'  => ['text', 'Section id (for links like #operations)', $c['anchor']],
            'eyebrow' => ['text', 'Small line above the title', $c['eyebrow']],
            'title'   => ['textarea', 'Title', $c['title']],
            'text'    => ['textarea', 'Text', $c['text']],
            'shot'    => ['media', 'Screenshot', $c['shot']],
            'flip'    => ['switch', 'Picture on the right', $c['flip']],
        ];
    }
    protected function repeaters() {
        $c = ams_content()['show']['ops'];
        return ['points' => ['Points', ['title' => ['text', 'Title', ''], 'text' => ['textarea', 'Text', '']], $c['points'], 'title']];
    }
    protected function render() {
        $s = $this->s();
        echo '<section class="ams ams-show' . ($s['flip'] === 'yes' ? ' is-flip' : '') . '" id="' . esc_attr($s['anchor']) . '"><div class="ams-wrap ams-show__in">';
        echo '<div class="ams-show__media" data-reveal data-tilt>' . ams_device($s['shot'], 'tablet', 'ams-show__dev', wp_strip_all_tags($s['eyebrow'])) . '<span class="ams-show__orb" aria-hidden="true"></span></div>';
        echo '<div class="ams-show__copy"><p class="ams-eyebrow" data-reveal>' . esc_html($s['eyebrow']) . '</p><h2 class="ams-h2" data-reveal>' . ams_title($s['title']) . '</h2><p class="ams-lead" data-reveal>' . esc_html($s['text']) . '</p><ul class="ams-points">';
        foreach ((array) $s['points'] as $i => $r) {
            echo '<li data-reveal style="--d:' . (int) $i . '"><span class="ams-points__ic">' . ams_line_icon('check') . '</span><div><h3>' . esc_html($r['title']) . '</h3><p>' . esc_html($r['text']) . '</p></div></li>';
        }
        echo '</ul></div></div></section>';
    }
}

class AMS_Windows extends AMS_Base {
    public function get_name() { return 'ams-windows'; }
    public function get_title() { return 'Airline Manager: On Windows'; }
    public function get_icon() { return 'eicon-device-desktop'; }
    protected function fields() {
        $c = ams_content()['windows'];
        return [
            'eyebrow' => ['text', 'Small line above the title', $c['eyebrow']],
            'title'   => ['textarea', 'Title', $c['title']],
            'text'    => ['textarea', 'Text', $c['text']],
            'points'  => ['textarea', 'Points (one per line)', $c['points']],
            'shot'    => ['media', 'Screenshot', $c['shot']],
        ];
    }
    protected function render() {
        $s = $this->s();
        echo '<section class="ams ams-windows" id="windows"><div class="ams-wrap">';
        $this->head($s);
        echo '<div class="ams-windows__in"><div class="ams-monitor" data-reveal data-tilt>' . ams_device($s['shot'], 'monitor', '', 'Airline Manager Pro on Windows') . '<span class="ams-monitor__neck"></span><span class="ams-monitor__foot"></span></div>';
        echo '<ul class="ams-ticks">';
        foreach (array_filter(array_map('trim', explode("\n", (string) $s['points']))) as $i => $p) echo '<li data-reveal style="--d:' . (int) $i . '">' . ams_line_icon('check') . '<span>' . esc_html($p) . '</span></li>';
        echo '</ul></div></div></section>';
    }
}

class AMS_Cards extends AMS_Base {
    public function get_name() { return 'ams-cards'; }
    public function get_title() { return 'Airline Manager: Feature cards'; }
    public function get_icon() { return 'eicon-info-box'; }
    protected function fields() {
        $c = ams_content()['cards'];
        return ['eyebrow' => ['text', 'Small line above the title', $c['eyebrow']], 'title' => ['textarea', 'Title', $c['title']], 'more' => ['text', 'Link to all features', 'See all features']];
    }
    protected function repeaters() {
        return ['items' => ['Cards', ['icon' => ['select:route|radio|scale|wallet|map|shield|bell|layers|update|plane|wifi|monitor|phone', 'Icon', 'route'], 'title' => ['text', 'Title', ''], 'text' => ['textarea', 'Text', '']], ams_content()['cards']['items'], 'title']];
    }
    protected function render() {
        $s = $this->s();
        echo '<section class="ams ams-cards"><div class="ams-wrap">';
        $this->head($s, false);
        echo '<div class="ams-cards__grid">';
        foreach ((array) $s['items'] as $i => $it) {
            echo '<div class="ams-card" data-reveal data-glow style="--d:' . (int) ($i % 3) . '"><span class="ams-card__ic">' . ams_line_icon($it['icon']) . '</span><h3>' . esc_html($it['title']) . '</h3><p>' . esc_html($it['text']) . '</p></div>';
        }
        echo '</div><p class="ams-center" data-reveal><a class="ams-much" href="' . esc_url(ams_page_url('features')) . '"><span>' . esc_html($s['more']) . '</span>' . ams_line_icon('arrow') . '</a></p></div></section>';
    }
}

class AMS_Download extends AMS_Base {
    public function get_name() { return 'ams-download'; }
    public function get_title() { return 'Airline Manager: Download'; }
    public function get_icon() { return 'eicon-download-button'; }
    protected function fields() {
        $c = ams_content()['download'];
        return [
            'eyebrow' => ['text', 'Small line above the title', $c['eyebrow']],
            'title'   => ['textarea', 'Title', $c['title']],
            'text'    => ['textarea', 'Text', $c['text']],
            'android' => ['textarea', 'Android: what you need (one per line)', $c['android']],
            'windows' => ['textarea', 'Windows: what you need (one per line)', $c['windows']],
            'note'    => ['text', 'Small note', $c['note']],
            'compact' => ['switch', 'Compact (no texts, only the two downloads)', ''],
        ];
    }
    protected function render() {
        $s = $this->s();
        $r = ams_release();
        $compact = $s['compact'] === 'yes';
        echo '<section class="ams ams-download' . ($compact ? ' is-compact' : '') . '" id="download"><div class="ams-wrap">';
        if (!$compact) $this->head($s);
        echo '<div class="ams-dl">';
        foreach ([['android', 'Android', 'phone', 'Phones and tablets', $r['android'], '.apk'], ['windows', 'Windows', 'monitor', 'PC app and the full app on Windows', $r['windows'], '.zip']] as $i => $p) {
            echo '<div class="ams-card ams-dl__card" data-reveal data-glow style="--d:' . $i . '"><span class="ams-dl__ic">' . ams_line_icon($p[2]) . '</span><div class="ams-dl__t"><h3>' . esc_html($p[1]) . '</h3><small>' . esc_html($p[3]) . '</small></div>';
            if (!$compact) {
                echo '<ul>';
                foreach (array_filter(array_map('trim', explode("\n", (string) $s[$p[0]]))) as $l) echo '<li>' . ams_line_icon('check') . esc_html($l) . '</li>';
                echo '</ul>';
            }
            echo '<a class="ams-btn ams-btn--primary' . ($i ? ' ams-btn--alt' : '') . '" data-ams-dl="' . $p[0] . '" href="' . esc_url($p[4]) . '">' . ams_line_icon('download') . '<span><small>Download ' . $p[5] . '</small>' . esc_html($p[1]) . ' <em data-ams-v>' . esc_html($r['version']) . '</em></span></a></div>';
        }
        echo '</div>';
        if (ams_opt('play_url')) echo '<p class="ams-center"><a class="ams-btn ams-btn--ghost" href="' . esc_url(ams_opt('play_url')) . '">' . ams_line_icon('store') . '<span><small>Also on</small>Google Play</span></a></p>';
        echo '<p class="ams-dl__note" data-reveal>' . esc_html($s['note']) . ' <a href="' . esc_url(ams_releases_url()) . '">All versions and release notes ' . ams_line_icon('arrow') . '</a></p>';
        echo '</div></section>';
    }
}

class AMS_Faq extends AMS_Base {
    public function get_name() { return 'ams-faq'; }
    public function get_title() { return 'Airline Manager: Questions'; }
    public function get_icon() { return 'eicon-accordion'; }
    protected function fields() {
        $c = ams_content()['faq'];
        return ['eyebrow' => ['text', 'Small line above the title', $c['eyebrow']], 'title' => ['textarea', 'Title', $c['title']]];
    }
    protected function repeaters() {
        return ['items' => ['Questions', ['q' => ['text', 'Question', ''], 'a' => ['textarea', 'Answer', '']], ams_content()['faq']['items'], 'q']];
    }
    protected function render() {
        $s = $this->s();
        echo '<section class="ams ams-faq" id="faq"><div class="ams-wrap ams-faq__in">';
        $this->head($s, false);
        echo '<div class="ams-faq__list">';
        foreach ((array) $s['items'] as $i => $it) {
            echo '<details class="ams-faq__item" data-reveal style="--d:' . (int) ($i % 4) . '"><summary><span>' . esc_html($it['q']) . '</span><i aria-hidden="true"></i></summary><div class="ams-faq__a"><p>' . esc_html($it['a']) . '</p></div></details>';
        }
        echo '</div></div></section>';
    }
}

class AMS_Share extends AMS_Base {
    public function get_name() { return 'ams-share'; }
    public function get_title() { return 'Airline Manager: Share this page'; }
    public function get_icon() { return 'eicon-share'; }
    protected function fields() { return ['title' => ['text', 'Title', ams_content()['share']['title']]]; }
    protected function render() {
        $s = $this->s();
        $nets = [
            'facebook' => ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u={u}'],
            'x'        => ['X', 'https://x.com/intent/post?url={u}&text={t}'],
            'whatsapp' => ['WhatsApp', 'https://wa.me/?text={t}%20{u}'],
            'linkedin' => ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url={u}'],
            'reddit'   => ['Reddit', 'https://www.reddit.com/submit?url={u}&title={t}'],
            'threads'  => ['Threads', 'https://www.threads.net/intent/post?text={t}%20{u}'],
            'mail'     => ['Email', 'mailto:?subject={t}&body={u}'],
        ];
        echo '<section class="ams ams-share"><div class="ams-wrap ams-share__in"><h2>' . esc_html($s['title']) . '</h2><div class="ams-share__row">';
        echo '<button type="button" class="ams-share__btn ams-share__native" hidden>' . ams_icon('share') . '<span>Share…</span></button>';
        foreach ($nets as $k => $n) echo '<a class="ams-share__btn" data-share="' . esc_attr($n[1]) . '" href="#" target="_blank" rel="noopener" aria-label="Share on ' . esc_attr($n[0]) . '" title="' . esc_attr($n[0]) . '">' . ams_icon($k) . '</a>';
        echo '<button type="button" class="ams-share__btn ams-share__copy" aria-label="Copy link" title="Copy link">' . ams_icon('link') . '<span>Copy link</span></button>';
        echo '</div></div></section>';
    }
}

class AMS_Footer extends AMS_Base {
    public function get_name() { return 'ams-footer'; }
    public function get_title() { return 'Airline Manager: Footer'; }
    public function get_icon() { return 'eicon-footer'; }
    protected function fields() {
        $c = ams_content()['footer'];
        return ['tagline' => ['text', 'Tagline', $c['tagline']], 'legal' => ['textarea', 'Trademark note', $c['legal']]];
    }
    protected function render() {
        $s = $this->s();
        $home = ams_page_url('home');
        $soc = ['facebook' => 'Facebook', 'youtube' => 'YouTube', 'instagram' => 'Instagram', 'tiktok' => 'TikTok'];
        echo '<footer class="ams ams-footer"><div class="ams-wrap"><div class="ams-footer__top">';
        echo '<div class="ams-footer__brand"><a class="ams-logo" href="' . esc_url($home) . '">' . ams_logo() . '</a><p>' . esc_html($s['tagline']) . '</p></div>';
        echo '<nav class="ams-footer__links" aria-label="Footer"><a href="' . esc_url(ams_page_url('features')) . '">All features</a><a href="' . esc_url($home . '#download') . '">Download</a><a href="' . esc_url(ams_releases_url()) . '">Release notes</a><a href="' . esc_url($home . '#faq') . '">Questions</a></nav>';
        echo '<div class="ams-social">';
        foreach ($soc as $k => $label) {
            $u = ams_opt($k);
            echo '<a class="ams-social__a" href="' . esc_url($u ?: '#') . '"' . ($u ? ' target="_blank" rel="noopener"' : ' aria-disabled="true"') . ' aria-label="' . esc_attr($label) . '" title="' . esc_attr($label) . '">' . ams_icon($k) . '</a>';
        }
        echo '</div></div><p class="ams-footer__legal">' . esc_html($s['legal']) . '</p>';
        echo '<div class="ams-footer__bottom"><span>© ' . do_shortcode('[airline_manager_year]') . ' ' . esc_html(ams_opt('holder')) . '. All rights reserved.</span><span>Made for pilots, on Android and Windows.</span></div></div></footer>';
    }
}

class AMS_Features extends AMS_Base {
    public function get_name() { return 'ams-features'; }
    public function get_title() { return 'Airline Manager: Full feature list'; }
    public function get_icon() { return 'eicon-bullet-list'; }
    protected function fields() {
        return [
            'title' => ['text', 'Title (empty = the standard title)', ''],
            'text'  => ['textarea', 'Text (empty = the standard text)', ''],
        ];
    }
    protected function render() {
        $s = $this->s();
        $c = ams_content()['features'];
        $groups = json_decode((string) file_get_contents(AMS_DIR . 'data/features.json'), true) ?: [];
        $n = 0; foreach ($groups as $g) $n += count($g['items']);
        echo '<section class="ams ams-features"><canvas class="ams-routes ams-routes--soft" aria-hidden="true"></canvas><div class="ams-wrap">';
        echo '<a class="ams-back" href="' . esc_url(ams_page_url('home')) . '">← Back to the overview</a>';
        echo '<div class="ams-features__head"><p class="ams-eyebrow" data-reveal>' . ams_line_icon('list') . ' ' . (int) $n . ' features</p>';
        echo '<h1 class="ams-h2" data-reveal>' . esc_html($s['title'] ?: $c['title']) . '</h1><p class="ams-lead" data-reveal>' . esc_html($s['text'] ?: $c['text']) . '</p></div>';
        echo '<div class="ams-features__tools" data-reveal><label class="ams-search">' . ams_line_icon('search') . '<input type="search" placeholder="Search ' . (int) $n . ' features…" aria-label="Search features"></label>';
        echo '<div class="ams-jump">';
        foreach ($groups as $i => $g) echo '<a href="#g-' . $i . '">' . esc_html($g['title']) . '</a>';
        echo '</div><p class="ams-features__count" aria-live="polite"></p></div>';
        echo '<div class="ams-groups">';
        foreach ($groups as $i => $g) {
            echo '<section class="ams-group" id="g-' . $i . '" data-reveal><h2><span>' . esc_html($g['title']) . '</span><small>' . count($g['items']) . '</small></h2><ul>';
            foreach ($g['items'] as $it) {
                echo '<li>' . wp_kses($it['t'], ['strong' => [], 'code' => [], 'em' => []]) . ($it['n'] ? ' <span class="ams-tag">' . esc_html($it['n']) . '</span>' : '') . '</li>';
            }
            echo '</ul></section>';
        }
        echo '</div><p class="ams-features__empty" hidden>No feature matches that search.</p></div></section>';
    }
}

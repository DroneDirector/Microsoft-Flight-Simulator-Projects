package __PACKAGE__;

import android.content.SharedPreferences;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.view.View;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Full-screen (immersive) activity.
 * - The status bar and navigation bar are hidden. A swipe from the edge only shows them
 *   briefly over the app, so a stray touch near the edge doesn't open the notification
 *   shade or system buttons straight away.
 * - The left and right edges are excluded from the system back gesture where Android allows it,
 *   and the back gesture itself is handled inside the app (it never quits by accident).
 * - When Android shuts down the app's web view in the background to free memory, the app is
 *   brought back instead of closing; everything is saved, so it opens where it was.
 * - Full screen can be switched off in the app's settings; the choice is kept on the phone.
 * - Game Booster (off unless switched on, kept on the phone): the screen stays on, and on phones that
 *   offer it the processor is held at a steady, sustained speed instead of slowing down when warm.
 *   Up to Android 13 it also closes other apps running in the background, and keeps doing so every
 *   30 seconds while the app is open, so they don't stay running; Android 14 and later no longer let an
 *   app close other apps.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LanLinkPlugin.class);
        registerPlugin(AppToolsPlugin.class);
        registerPlugin(VoicePlugin.class);
        registerPlugin(LapBrowserPlugin.class);
        keepCrashReports();
        super.onCreate(savedInstanceState);
        if (getBridge() != null) getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                runOnUiThread(() -> recreate());
                return true;   // handled: don't close the app
            }
        });
        enterImmersive();
        protectEdges();
        applyBoost();
        fastScreen();
        // after a swipe from the edge the system bars show over the app for a moment: hide them again
        // soon after (the notification shade can still be pulled down while they show)
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
            if (fullScreen() && insets.isVisible(WindowInsetsCompat.Type.systemBars())) {
                hideLater.removeCallbacksAndMessages(null);
                hideLater.postDelayed(() -> { if (hasWindowFocus()) enterImmersive(); }, 2500);
            }
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
    }

    private final Handler hideLater = new Handler(Looper.getMainLooper());
    SharedPreferences prefs() { return getSharedPreferences("amp_display", MODE_PRIVATE); }
    boolean fullScreen() { return prefs().getBoolean("fullscreen", true); }
    boolean boost() { return prefs().getBoolean("boost", false); }

    /** Called by the app's settings (AppTools). */
    void setFullScreen(boolean on) { prefs().edit().putBoolean("fullscreen", on).apply(); runOnUiThread(this::enterImmersive); }
    void setBoost(boolean on) { prefs().edit().putBoolean("boost", on).apply(); runOnUiThread(this::applyBoost); }

    /* What the booster closed since the app started (shown in the booster's charts). */
    static int closeRounds = 0, closeAsked = 0; static long freedMb = 0, lastFreedMb = 0;
    static boolean canCloseOthers() { return Build.VERSION.SDK_INT < 34; }
    private final Handler closer = new Handler(Looper.getMainLooper());
    private final Runnable closeRound = new Runnable() { public void run() { closeOthers(); closer.postDelayed(this, 30000); } };

    /** Ask Android to end the other apps' background processes (Android 13 and older; never the app in front). */
    void closeOthers() {
        if (!boost() || !canCloseOthers()) return;
        final android.content.Context ctx = getApplicationContext();
        new Thread(() -> {
            try {
                android.app.ActivityManager am = (android.app.ActivityManager) ctx.getSystemService(ACTIVITY_SERVICE);
                android.app.ActivityManager.MemoryInfo m0 = new android.app.ActivityManager.MemoryInfo(); am.getMemoryInfo(m0);
                android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_MAIN); i.addCategory(android.content.Intent.CATEGORY_LAUNCHER);
                java.util.HashSet<String> pk = new java.util.HashSet<>();
                for (android.content.pm.ResolveInfo ri : ctx.getPackageManager().queryIntentActivities(i, 0)) pk.add(ri.activityInfo.packageName);
                pk.remove(ctx.getPackageName());
                int n = 0; for (String p : pk) { try { am.killBackgroundProcesses(p); n++; } catch (Exception ignored) { } }
                Thread.sleep(1500);
                android.app.ActivityManager.MemoryInfo m1 = new android.app.ActivityManager.MemoryInfo(); am.getMemoryInfo(m1);
                long freed = Math.max(0, (m1.availMem - m0.availMem) / 1048576);
                closeRounds++; closeAsked = n; lastFreedMb = freed; freedMb += freed;
            } catch (Exception ignored) { }
        }).start();
    }

    @Override
    public void onPause() { super.onPause(); closer.removeCallbacksAndMessages(null); }

    /** Game Booster: keep the screen on and, where the phone supports it, hold the processor at a steady speed. */
    void applyBoost() {
        boolean on = boost();
        if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // while the app is open with the booster on, other apps are closed now and every 30 seconds
        closer.removeCallbacksAndMessages(null);
        if (on && canCloseOthers()) closer.post(closeRound);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (pm != null && pm.isSustainedPerformanceModeSupported()) getWindow().setSustainedPerformanceMode(on);
            }
        } catch (Exception ignored) { }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersive();
    }

    @Override
    public void onResume() {
        super.onResume();
        enterImmersive();
        applyBoost();
        fastScreen();
    }

    /** The screen's fastest refresh rate (90, 120 Hz…) at its own resolution, and the 3D drawing kept at a high
     *  priority while the app is in front (Android lowers it again when the app is not seen). The phone still
     *  slows down by itself when it is warm or saving battery. */
    void fastScreen() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.view.Display d = getWindowManager().getDefaultDisplay();
                android.view.Display.Mode cur = d.getMode(), best = cur;
                for (android.view.Display.Mode m : d.getSupportedModes()) {
                    if (m.getPhysicalWidth() == cur.getPhysicalWidth() && m.getPhysicalHeight() == cur.getPhysicalHeight() && m.getRefreshRate() > best.getRefreshRate() + 0.5f) best = m;
                }
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                if (lp.preferredDisplayModeId != best.getModeId()) { lp.preferredDisplayModeId = best.getModeId(); getWindow().setAttributes(lp); }
            }
        } catch (Exception ignored) { }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && getBridge() != null && getBridge().getWebView() != null)
                getBridge().getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        } catch (Exception ignored) { }
    }

    private void enterImmersive() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (!fullScreen()) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
            c.show(WindowInsetsCompat.Type.systemBars());
            return;
        }
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }

    /** If the app crashes, the details are saved and shown in the error log on the next start. */
    private void keepCrashReports() {
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        final File file = new File(getFilesDir(), AppToolsPlugin.CRASH_FILE);
        Thread.setDefaultUncaughtExceptionHandler((thread, error) -> {
            try (PrintWriter w = new PrintWriter(new FileWriter(file, false))) {
                w.println("Time: " + new Date());
                w.println("Android " + Build.VERSION.RELEASE + " (SDK " + Build.VERSION.SDK_INT + "), " + Build.MANUFACTURER + " " + Build.MODEL);
                w.println("Thread: " + thread.getName());
                error.printStackTrace(w);
            } catch (Exception ignored) { }
            if (previous != null) previous.uncaughtException(thread, error);
        });
    }

    private void protectEdges() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        final View root = getWindow().getDecorView();
        root.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> {
            int w = r - l, h = b - t;
            float d = getResources().getDisplayMetrics().density;
            int edge = Math.round(32 * d);
            int span = Math.min(h, Math.round(200 * d)); // Android allows up to 200 dp per edge
            int top = (h - span) / 2;
            List<Rect> rects = new ArrayList<>();
            rects.add(new Rect(0, top, edge, top + span));
            rects.add(new Rect(w - edge, top, w, top + span));
            v.setSystemGestureExclusionRects(rects);
        });
    }
}

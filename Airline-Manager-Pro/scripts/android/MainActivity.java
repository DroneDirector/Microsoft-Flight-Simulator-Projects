package __PACKAGE__;

import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

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
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LanLinkPlugin.class);
        registerPlugin(AppToolsPlugin.class);
        keepCrashReports();
        super.onCreate(savedInstanceState);
        enterImmersive();
        protectEdges();
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
    }

    private void enterImmersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
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

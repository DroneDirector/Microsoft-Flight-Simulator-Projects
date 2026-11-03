package __PACKAGE__;

import android.app.ActivityManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.StatFs;
import android.view.View;
import android.widget.RemoteViews;

import java.io.File;

/**
 * Home screen widget. Your airline: the balance, today's profit and its chart, the jet fuel price and its chart,
 * the fleet (flying, ready, in maintenance), the next flight and what needs you. Your tablet: memory in use of the
 * total with its chart, the processor's speed and temperature with a chart, graphics (the graphics chip's load where
 * the tablet lets apps read it, otherwise the game's own frame rate) with a chart, and storage. Buttons free memory
 * (closing other apps' background processes, where Android allows it), clean space (the app's own caches, then
 * Android's own Free up space screen) and refresh. The bigger the widget is made, the more it shows and the bigger
 * its charts. The app writes its figures (AppTools.widget); the tablet's are read each time the widget is drawn.
 */
public class StatusWidget extends AppWidgetProvider {
    static final String PREFS = "amp_widget";
    static final String A_REFRESH = "amp.widget.REFRESH", A_FREE = "amp.widget.FREE", A_CLEAN = "amp.widget.CLEAN", A_TRACK = "amp.widget.TRACK", A_TICK = "amp.widget.TICK";
    static final int HIST = 40;
    /** The widgets to choose from: one that adapts to its size, and a small, a medium and a large one. */
    @SuppressWarnings("rawtypes") static final Class[] KINDS = { StatusWidget.class, StatusWidgetSmall.class, StatusWidgetMedium.class, StatusWidgetLarge.class };
    int kind() { return 0; }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) { if (anyTracking(ctx)) sample(ctx); for (int id : ids) draw(ctx, mgr, id, kind()); schedule(ctx); }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o) { draw(ctx, mgr, id, kind()); }

    @Override
    public void onDisabled(Context ctx) { schedule(ctx); }

    @Override
    public void onReceive(Context ctx, Intent i) {
        super.onReceive(ctx, i);
        String a = i == null ? null : i.getAction();
        if (A_REFRESH.equals(a)) { sample(ctx); refresh(ctx); }
        else if (A_FREE.equals(a)) freeMemory(ctx);
        else if (A_CLEAN.equals(a)) cleanSpace(ctx);
        else if (A_TICK.equals(a)) { if (anyTracking(ctx)) { sample(ctx); refresh(ctx); } schedule(ctx); }
        else if (A_TRACK.equals(a)) {
            // the same button turns this widget's tracking off, and on again (the game itself always goes on)
            int wid = i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1); if (wid < 0) return;
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE); boolean off = !p.getBoolean("off_" + wid, false);
            p.edit().putBoolean("off_" + wid, off).apply();
            if (!off) sample(ctx);
            refresh(ctx); schedule(ctx);
        }
    }

    static int[] idsOf(Context ctx, AppWidgetManager mgr, int k) { return mgr.getAppWidgetIds(new ComponentName(ctx, KINDS[k])); }
    static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (int k = 0; k < KINDS.length; k++) for (int id : idsOf(ctx, mgr, k)) draw(ctx, mgr, id, k);
    }
    static boolean anyTracking(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx); SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        for (int k = 0; k < KINDS.length; k++) for (int id : idsOf(ctx, mgr, k)) if (!p.getBoolean("off_" + id, false)) return true;
        return false;
    }
    /** While any widget is tracking, its readings are taken every 15 minutes, only while the tablet is awake anyway
     *  (it is never woken up for it), so it costs next to no battery; the game updates the widget whenever it is open. */
    static void schedule(Context ctx) {
        try {
            android.app.AlarmManager am = (android.app.AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 99, new Intent(ctx, StatusWidget.class).setAction(A_TICK), flags);
            am.cancel(pi);
            if (anyTracking(ctx)) am.setInexactRepeating(android.app.AlarmManager.ELAPSED_REALTIME, android.os.SystemClock.elapsedRealtime() + 15 * 60000L, android.app.AlarmManager.INTERVAL_FIFTEEN_MINUTES, pi);
        } catch (Exception ignored) { }
    }

    /* ---------- the tablet's readings ---------- */
    static long readNum(String f) {
        try (java.io.BufferedReader in = new java.io.BufferedReader(new java.io.FileReader(f))) { String l = in.readLine(); if (l == null) return -1; l = l.trim().split("\\s+")[0].replace("%", ""); return Long.parseLong(l); } catch (Exception e) { return -1; }
    }
    static String readLine(String f) {
        try (java.io.BufferedReader in = new java.io.BufferedReader(new java.io.FileReader(f))) { String l = in.readLine(); return l == null ? "" : l.trim(); } catch (Exception e) { return ""; }
    }
    /** The graphics chip's load in percent, where the tablet lets apps read it (-1 when it doesn't). */
    static int gpuLoad() {
        long v = readNum("/sys/class/kgsl/kgsl-3d0/gpu_busy_percentage"); if (v >= 0 && v <= 100) return (int) v;
        String b = readLine("/sys/class/kgsl/kgsl-3d0/gpubusy");
        if (!b.isEmpty()) { try { String[] p = b.split("\\s+"); long busy = Long.parseLong(p[0]), tot = Long.parseLong(p[1]); if (tot > 0) return (int) Math.min(100, busy * 100 / tot); } catch (Exception ignored) { } }
        for (String f : new String[] { "/sys/kernel/gpu/gpu_busy", "/sys/class/misc/mali0/device/utilization", "/sys/devices/platform/mali.0/utilization" }) { v = readNum(f); if (v >= 0 && v <= 100) return (int) v; }
        return -1;
    }
    /** The processor's cores against their top speed, in percent (-1 when the tablet doesn't let apps read it). */
    static int cpuSpeed() {
        double sum = 0; int n = 0, cores = Runtime.getRuntime().availableProcessors();
        for (int i = 0; i < Math.max(cores, 8); i++) {
            long cur = readNum("/sys/devices/system/cpu/cpu" + i + "/cpufreq/scaling_cur_freq"), max = readNum("/sys/devices/system/cpu/cpu" + i + "/cpufreq/cpuinfo_max_freq");
            if (cur > 0 && max > 0) { sum += Math.min(1.0, (double) cur / max); n++; }
        }
        return n > 0 ? (int) Math.round(sum / n * 100) : -1;
    }
    /** Take the tablet's readings now and add them to the charts' history. */
    static void sample(Context ctx) {
        try {
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo(); am.getMemoryInfo(mi);
            long tot = mi.totalMem / 1048576, used = (mi.totalMem - mi.availMem) / 1048576;
            int cpu = cpuSpeed(), gpu = gpuLoad();
            if (gpu < 0) { String f = p.getString("fps", ""); try { gpu = f.isEmpty() ? -1 : Math.min(100, Integer.parseInt(f) * 100 / 60); } catch (Exception e) { gpu = -1; } }
            StatFs st = new StatFs(Environment.getDataDirectory().getPath());
            long sTot = st.getTotalBytes() / 1048576, sFree = st.getAvailableBytes() / 1048576;
            float temp = 0; Intent b = ctx.getApplicationContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (b != null) temp = b.getIntExtra(android.os.BatteryManager.EXTRA_TEMPERATURE, 0) / 10f;
            p.edit().putLong("memTot", tot).putLong("memUsed", used).putInt("cpu", cpu).putInt("gpu", gpu).putLong("stTot", sTot).putLong("stFree", sFree).putFloat("temp", temp)
                .putString("hRam", push(p.getString("hRam", ""), tot > 0 ? used * 100f / tot : 0))
                .putString("hCpu", push(p.getString("hCpu", ""), Math.max(0, cpu)))
                .putString("hGpu", push(p.getString("hGpu", ""), Math.max(0, gpu))).apply();
        } catch (Exception ignored) { }
    }
    static String push(String h, float v) {
        StringBuilder s = new StringBuilder(h == null ? "" : h); if (s.length() > 0) s.append(','); s.append(Math.round(v * 10) / 10f);
        String[] a = s.toString().split(","); if (a.length <= HIST) return s.toString();
        StringBuilder o = new StringBuilder(); for (int i = a.length - HIST; i < a.length; i++) { if (o.length() > 0) o.append(','); o.append(a[i]); } return o.toString();
    }
    static float[] series(String h) {
        if (h == null || h.isEmpty()) return new float[0];
        String[] a = h.split(","); float[] o = new float[a.length]; for (int i = 0; i < a.length; i++) { try { o[i] = Float.parseFloat(a[i]); } catch (Exception e) { o[i] = 0; } } return o;
    }

    /* ---------- optimising the tablet ---------- */
    static void freeMemory(Context ctx) {
        final Context c = ctx.getApplicationContext();
        new Thread(() -> {
            SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            try {
                ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
                ActivityManager.MemoryInfo m0 = new ActivityManager.MemoryInfo(); am.getMemoryInfo(m0);
                if (Build.VERSION.SDK_INT >= 34) {
                    p.edit().putString("note", "Android 14 and later don't let apps close other apps. The tablet's own Device care or Game Booster can.").apply();
                } else {
                    Intent i = new Intent(Intent.ACTION_MAIN); i.addCategory(Intent.CATEGORY_LAUNCHER);
                    java.util.HashSet<String> pk = new java.util.HashSet<>();
                    for (android.content.pm.ResolveInfo ri : c.getPackageManager().queryIntentActivities(i, 0)) pk.add(ri.activityInfo.packageName);
                    pk.remove(c.getPackageName());
                    for (String s : pk) { try { am.killBackgroundProcesses(s); } catch (Exception ignored) { } }
                    Thread.sleep(1500);
                    ActivityManager.MemoryInfo m1 = new ActivityManager.MemoryInfo(); am.getMemoryInfo(m1);
                    long freed = Math.max(0, (m1.availMem - m0.availMem) / 1048576);
                    p.edit().putString("note", "Closed " + pk.size() + " apps' background work: " + freed + " MB freed.").apply();
                }
            } catch (Exception e) { p.edit().putString("note", "Memory could not be freed.").apply(); }
            sample(c); refresh(c);
        }).start();
    }
    static long sizeOf(File f) { if (f == null || !f.exists()) return 0; if (f.isFile()) return f.length(); long s = 0; File[] k = f.listFiles(); if (k != null) for (File x : k) s += sizeOf(x); return s; }
    static void wipe(File f) { if (f == null || !f.exists()) return; File[] k = f.listFiles(); if (k != null) for (File x : k) { if (x.isDirectory()) wipe(x); x.delete(); } }
    static void cleanSpace(Context ctx) {
        Context c = ctx.getApplicationContext(); SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long before = sizeOf(c.getCacheDir()) + sizeOf(c.getExternalCacheDir()) + sizeOf(c.getCodeCacheDir());
        wipe(c.getCacheDir()); wipe(c.getExternalCacheDir());
        long after = sizeOf(c.getCacheDir()) + sizeOf(c.getExternalCacheDir()) + sizeOf(c.getCodeCacheDir());
        p.edit().putString("note", "Cleared " + Math.max(0, (before - after) / 1048576) + " MB of the game's caches. Tap here for Android's Free up space, for the rest of the tablet.").apply();
        sample(c); refresh(c);
    }

    /* ---------- drawing ---------- */
    static int id(Context c, String n) { return c.getResources().getIdentifier(n, "id", c.getPackageName()); }
    static String mb(long m) { return m >= 1024 ? String.format(java.util.Locale.US, "%.1f GB", m / 1024f) : m + " MB"; }

    /** A chart as a picture: a smooth line over a soft fill, the latest value marked. w × h pixels (kept small, so
     *  the widget's update stays within what Android sends at once). */
    static Bitmap chart(float[] v, int w, int h, int col, float top) {
        w = Math.max(40, w); h = Math.max(24, h);
        Bitmap bm = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888); Canvas cv = new Canvas(bm);
        Paint grid = new Paint(Paint.ANTI_ALIAS_FLAG); grid.setColor(0x22FFFFFF); grid.setStrokeWidth(Math.max(1, h / 90f));
        for (int k = 1; k < 4; k++) cv.drawLine(0, h * k / 4f, w, h * k / 4f, grid);
        if (v.length < 2) { Paint t = new Paint(Paint.ANTI_ALIAS_FLAG); t.setColor(0x88FFFFFF); t.setTextSize(h * 0.22f); cv.drawText("Collecting…", w * 0.04f, h * 0.6f, t); return bm; }
        float mx = top > 0 ? top : 0, mn = 0; if (top <= 0) { mx = -1e9f; mn = 1e9f; for (float x : v) { mx = Math.max(mx, x); mn = Math.min(mn, x); } float pad = Math.max(1e-3f, (mx - mn) * 0.15f); mx += pad; mn -= pad; }
        float pd = h * 0.08f; Path line = new Path(), area = new Path();
        for (int i = 0; i < v.length; i++) {
            float x = i * (w - 1f) / (v.length - 1), y = h - pd - (v[i] - mn) / Math.max(1e-6f, mx - mn) * (h - 2 * pd);
            if (i == 0) { line.moveTo(x, y); area.moveTo(x, h); area.lineTo(x, y); } else { line.lineTo(x, y); area.lineTo(x, y); }
        }
        area.lineTo(w - 1, h); area.close();
        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG); fill.setShader(new LinearGradient(0, 0, 0, h, (col & 0x00FFFFFF) | 0x66000000, (col & 0x00FFFFFF) | 0x05000000, Shader.TileMode.CLAMP)); cv.drawPath(area, fill);
        Paint ln = new Paint(Paint.ANTI_ALIAS_FLAG); ln.setStyle(Paint.Style.STROKE); ln.setStrokeWidth(Math.max(2, h / 40f)); ln.setStrokeJoin(Paint.Join.ROUND); ln.setColor(col); cv.drawPath(line, ln);
        float lx = w - 1, ly = h - pd - (v[v.length - 1] - mn) / Math.max(1e-6f, mx - mn) * (h - 2 * pd);
        Paint dot = new Paint(Paint.ANTI_ALIAS_FLAG); dot.setColor(col); cv.drawCircle(Math.min(lx, w - h / 18f), ly, Math.max(3, h / 18f), dot);
        return bm;
    }

    static void draw(Context ctx, AppWidgetManager mgr, int wid, int kind) {
        String pkg = ctx.getPackageName();
        int layout = ctx.getResources().getIdentifier("amp_widget", "layout", pkg);
        if (layout == 0) return;
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.contains("memTot")) sample(ctx);   // the first time: something to show at once
        RemoteViews v = new RemoteViews(pkg, layout);
        // the widget's size (dp), and what fits: the bigger it is made, the more it shows, the bigger its charts
        Bundle o = mgr.getAppWidgetOptions(wid);
        int wDp = Math.max(180, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 320)), hDp = Math.max(110, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 200));
        float den = ctx.getResources().getDisplayMetrics().density;
        boolean game = hDp >= 150, dev = hDp >= 260, wide = wDp >= 400, xwide = wDp >= 560;
        // the small, medium and large widgets show their set amount (charts still fill the space they have)
        if (kind == 1) { game = false; dev = false; }
        else if (kind == 2) { game = true; dev = false; wide = true; xwide = true; }
        else if (kind == 3) { game = true; dev = true; wide = true; xwide = true; }
        boolean on = !p.getBoolean("off_" + wid, false);
        v.setTextViewText(id(ctx, "w_track"), on ? "Tracking on" : "Tracking off");
        v.setTextColor(id(ctx, "w_track"), on ? 0xFF3FE08A : 0xFF93A9C1);
        v.setViewVisibility(id(ctx, "w_buttons"), kind == 1 ? View.GONE : View.VISIBLE);
        v.setViewVisibility(id(ctx, "w_free"), dev ? View.VISIBLE : View.GONE);
        v.setViewVisibility(id(ctx, "w_clean"), dev ? View.VISIBLE : View.GONE);
        // the airline
        v.setTextViewText(id(ctx, "w_title"), p.getString("title", "Airline Manager Pro"));
        v.setTextViewText(id(ctx, "w_balance"), p.getString("balance", "Open the app"));
        v.setTextViewText(id(ctx, "w_profit"), p.getString("profit", ""));
        v.setTextColor(id(ctx, "w_profit"), p.getString("profit", "").startsWith("-") ? 0xFFFF6B6B : 0xFF3FE08A);
        v.setTextViewText(id(ctx, "w_next"), p.getString("next", ""));
        v.setTextViewText(id(ctx, "w_flying"), p.getString("flying", ""));
        v.setTextViewText(id(ctx, "w_fleet"), p.getString("fleet", ""));
        v.setTextViewText(id(ctx, "w_alerts"), p.getString("alerts", ""));
        v.setViewVisibility(id(ctx, "w_alerts"), p.getString("alerts", "").isEmpty() ? View.GONE : View.VISIBLE);
        v.setTextViewText(id(ctx, "w_fuel"), p.getString("fuel", ""));
        v.setViewVisibility(id(ctx, "w_row_game"), game ? View.VISIBLE : View.GONE);
        v.setViewVisibility(id(ctx, "w_tile_fuel"), wide ? View.VISIBLE : View.GONE);
        v.setViewVisibility(id(ctx, "w_tile_fleet"), xwide || !wide ? View.VISIBLE : View.GONE);
        // the tablet
        long mt = p.getLong("memTot", 0), mu = p.getLong("memUsed", 0), st = p.getLong("stTot", 0), sf = p.getLong("stFree", 0);
        int cpu = p.getInt("cpu", -1), gpu = p.getInt("gpu", -1); float temp = p.getFloat("temp", 0);
        v.setTextViewText(id(ctx, "w_ram"), mt > 0 ? mb(mu) + " of " + mb(mt) : "–");
        v.setProgressBar(id(ctx, "w_ram_bar"), 100, mt > 0 ? (int) (mu * 100 / mt) : 0, false);
        v.setTextViewText(id(ctx, "w_cpu"), (cpu >= 0 ? cpu + "% speed" : "Speed not shown") + (temp > 0 ? String.format(java.util.Locale.US, " · %.0f°C", temp) : ""));
        boolean fps = gpuLoad() < 0;
        v.setTextViewText(id(ctx, "w_gpu"), gpu >= 0 ? (fps ? "Game: " + p.getString("fps", "–") + " fps" : gpu + "% load") : "Not shown by this tablet");
        v.setTextViewText(id(ctx, "w_store"), st > 0 ? mb(st - sf) + " of " + mb(st) + " · " + mb(sf) + " free" : "–");
        v.setProgressBar(id(ctx, "w_store_bar"), 100, st > 0 ? (int) ((st - sf) * 100 / st) : 0, false);
        v.setTextViewText(id(ctx, "w_note"), p.getString("note", ""));
        v.setViewVisibility(id(ctx, "w_note"), p.getString("note", "").isEmpty() ? View.GONE : View.VISIBLE);
        v.setViewVisibility(id(ctx, "w_row_dev"), dev ? View.VISIBLE : View.GONE);
        v.setViewVisibility(id(ctx, "w_tile_gpu"), wide ? View.VISIBLE : View.GONE);
        v.setViewVisibility(id(ctx, "w_tile_store"), xwide ? View.VISIBLE : View.GONE);
        // the charts: drawn for their space (each tile's share of the width, the row's share of the height),
        // within a budget of pixels for the whole widget
        int rows = 1 + (game ? 1 : 0) + (dev ? 1 : 0);
        int gTiles = 1 + (wide ? 1 : 0) + ((xwide || !wide) ? 1 : 0), dTiles = 2 + (wide ? 1 : 0) + (xwide ? 1 : 0);
        float chartH = Math.max(28, (hDp - 64 - 40) / (float) Math.max(1, rows - 1) - 46);
        float budget = 150000f,   // pixels for all the charts together: a widget update must stay under 1 MB
        scale = Math.min(den, (float) Math.sqrt(budget / Math.max(1f, wDp * chartH * (rows - 1))));
        int gw = (int) (wDp / gTiles * scale), dw = (int) (wDp / dTiles * scale), ch = (int) (chartH * scale);
        if (game) {
            v.setImageViewBitmap(id(ctx, "w_ch_profit"), chart(series(p.getString("hProfit", "")), gw, ch, 0xFF3FE08A, 0));
            if (wide) v.setImageViewBitmap(id(ctx, "w_ch_fuel"), chart(series(p.getString("hFuel", "")), gw, ch, 0xFFF2B544, 0));
            if (xwide || !wide) v.setImageViewBitmap(id(ctx, "w_ch_fleet"), chart(series(p.getString("hFlying", "")), gw, ch, 0xFF3FD0E8, 0));
        }
        if (dev) {
            v.setImageViewBitmap(id(ctx, "w_ch_ram"), chart(series(p.getString("hRam", "")), dw, ch, 0xFF7C8CF0, 100));
            v.setImageViewBitmap(id(ctx, "w_ch_cpu"), chart(series(p.getString("hCpu", "")), dw, ch, 0xFFF06A6A, 100));
            if (wide) v.setImageViewBitmap(id(ctx, "w_ch_gpu"), chart(series(p.getString("hGpu", "")), dw, ch, 0xFF2FBF8F, 100));
        }
        // taps: the widget opens the game; the buttons optimise the tablet or refresh
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(id(ctx, "w_head"), PendingIntent.getActivity(ctx, 0, open, flags));
        v.setOnClickPendingIntent(id(ctx, "w_open"), PendingIntent.getActivity(ctx, 1, open, flags));
        v.setOnClickPendingIntent(id(ctx, "w_free"), PendingIntent.getBroadcast(ctx, 2, new Intent(ctx, StatusWidget.class).setAction(A_FREE), flags));
        v.setOnClickPendingIntent(id(ctx, "w_clean"), PendingIntent.getBroadcast(ctx, 3, new Intent(ctx, StatusWidget.class).setAction(A_CLEAN), flags));
        // the note: after cleaning, a tap opens Android's own Free up space (other apps' files are Android's to clear)
        Intent store = new Intent(Build.VERSION.SDK_INT >= 25 ? "android.os.storage.action.MANAGE_STORAGE" : android.provider.Settings.ACTION_INTERNAL_STORAGE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(id(ctx, "w_note"), PendingIntent.getActivity(ctx, 5, store, flags));
        v.setOnClickPendingIntent(id(ctx, "w_refresh"), PendingIntent.getBroadcast(ctx, 4, new Intent(ctx, StatusWidget.class).setAction(A_REFRESH), flags));
        v.setOnClickPendingIntent(id(ctx, "w_track"), PendingIntent.getBroadcast(ctx, 1000 + wid, new Intent(ctx, StatusWidget.class).setAction(A_TRACK).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, wid), flags));
        mgr.updateAppWidget(wid, v);
    }
}

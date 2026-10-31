package __PACKAGE__;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.ContentResolver;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.database.Cursor;
import android.provider.DocumentsContract;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.activity.result.ActivityResult;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * App tools: copy and share text, device details for error reports, the last crash report,
 * and installing app updates with the exact reason Android gives when an install fails.
 */
@CapacitorPlugin(name = "AppTools")
public class AppToolsPlugin extends Plugin {

    static final String CRASH_FILE = "last-crash.txt";
    private static final String ACTION_STATUS = ".INSTALL_STATUS";
    private BroadcastReceiver statusReceiver;
    private volatile boolean busy = false;

    /* ---------- Battery ---------- */

    /** Charge level, whether it is charging, and how: cable (AC or USB), wireless or not plugged in. */
    @PluginMethod
    public void battery(PluginCall call) {
        try {
            Intent b = getContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            JSObject r = new JSObject();
            if (b == null) { r.put("present", false); call.resolve(r); return; }
            int level = b.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1), scale = b.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, 100);
            int status = b.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1), plugged = b.getIntExtra(android.os.BatteryManager.EXTRA_PLUGGED, 0);
            r.put("present", b.getBooleanExtra(android.os.BatteryManager.EXTRA_PRESENT, true));
            r.put("level", level >= 0 && scale > 0 ? level * 100 / scale : -1);
            r.put("charging", status == android.os.BatteryManager.BATTERY_STATUS_CHARGING || status == android.os.BatteryManager.BATTERY_STATUS_FULL);
            r.put("full", status == android.os.BatteryManager.BATTERY_STATUS_FULL);
            r.put("plugged", plugged == android.os.BatteryManager.BATTERY_PLUGGED_WIRELESS ? "wireless" : plugged == android.os.BatteryManager.BATTERY_PLUGGED_USB ? "usb" : plugged == android.os.BatteryManager.BATTERY_PLUGGED_AC ? "ac" : plugged != 0 ? "other" : "none");
            call.resolve(r);
        } catch (Exception e) { call.reject(describe(e)); }
    }

    /* ---------- This device (for registration) ---------- */

    /** Android's ID for this app on this phone: the same after updates and reinstalls, new after a factory reset. */
    @PluginMethod
    public void deviceId(PluginCall call) {
        try {
            String id = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
            JSObject r = new JSObject();
            r.put("id", id == null ? "" : id);
            r.put("name", Build.MANUFACTURER + " " + Build.MODEL);
            call.resolve(r);
        } catch (Exception e) { call.reject(describe(e)); }
    }

    /* ---------- Copy and share ---------- */

    @PluginMethod
    public void copy(PluginCall call) {
        String text = call.getString("text", "");
        getActivity().runOnUiThread(() -> {
            try {
                ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText(call.getString("label", "Error log"), text));
                call.resolve();
            } catch (Exception e) { call.reject(describe(e)); }
        });
    }

    @PluginMethod
    public void share(PluginCall call) {
        try {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, call.getString("title", "Error log"));
            send.putExtra(Intent.EXTRA_TEXT, call.getString("text", ""));
            Intent chooser = Intent.createChooser(send, call.getString("title", "Share"));
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) { call.reject(describe(e)); }
    }

    /* ---------- Device details and crash report ---------- */

    @PluginMethod
    public void deviceInfo(PluginCall call) {
        JSObject r = new JSObject();
        Context ctx = getContext();
        r.put("android", Build.VERSION.RELEASE);
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("device", Build.MANUFACTURER + " " + Build.MODEL);
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            r.put("versionName", pi.versionName);
            r.put("versionCode", Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode);
        } catch (Exception ignored) { }
        try {
            String inst = Build.VERSION.SDK_INT >= 30
                ? ctx.getPackageManager().getInstallSourceInfo(ctx.getPackageName()).getInstallingPackageName()
                : ctx.getPackageManager().getInstallerPackageName(ctx.getPackageName());
            r.put("installer", inst == null ? "" : inst);
        } catch (Exception ignored) { }
        r.put("canInstall", canInstall());
        call.resolve(r);
    }

    @PluginMethod
    public void lastCrash(PluginCall call) {
        JSObject r = new JSObject();
        File f = new File(getContext().getFilesDir(), CRASH_FILE);
        if (f.exists()) {
            try (InputStream in = new FileInputStream(f)) {
                byte[] b = new byte[(int) Math.min(f.length(), 64 * 1024)];
                int n = in.read(b);
                r.put("text", new String(b, 0, Math.max(0, n), StandardCharsets.UTF_8));
            } catch (Exception e) { r.put("text", "Crash report could not be read: " + describe(e)); }
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
        call.resolve(r);
    }

    /* ---------- Save backup ---------- */
    // A second copy of the saved airline in the app's own files, used if the web storage is ever emptied.

    static final String BACKUP_FILE = "save-backup.json";

    @PluginMethod
    public void backupWrite(PluginCall call) {
        String data = call.getString("data", "");
        File dir = getContext().getFilesDir(), tmp = new File(dir, BACKUP_FILE + ".tmp"), dst = new File(dir, BACKUP_FILE);
        try (OutputStream out = new FileOutputStream(tmp)) {
            out.write(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) { call.reject("Backup could not be written: " + describe(e)); return; }
        if (!tmp.renameTo(dst)) { call.reject("Backup could not be stored"); return; }
        call.resolve();
    }

    @PluginMethod
    public void backupRead(PluginCall call) {
        JSObject r = new JSObject();
        File f = new File(getContext().getFilesDir(), BACKUP_FILE);
        if (f.exists()) {
            try (InputStream in = new FileInputStream(f)) {
                java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
                byte[] b = new byte[64 * 1024]; int n;
                while ((n = in.read(b)) > 0) buf.write(b, 0, n);
                r.put("data", new String(buf.toByteArray(), StandardCharsets.UTF_8));
            } catch (Exception e) { r.put("data", ""); }
        }
        call.resolve(r);
    }

    /* ---------- Backup folder and backup files ----------
       The airline is copied to a folder the user picks (for example Documents, or a Google Drive folder),
       outside the app's own storage, so it survives clearing the app's data, uninstalling and moving to
       a new phone. After a reinstall the user picks the same folder again and everything comes back. */

    static final String BACKUP_NAME = "AirlineManagerPro-backup.json";
    private SharedPreferences prefs() { return getContext().getSharedPreferences("amp-backup", Context.MODE_PRIVATE); }

    private Uri backupTree() {
        String u = prefs().getString("tree", null);
        if (u == null) return null;
        Uri tree = Uri.parse(u);
        for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions())
            if (p.getUri().equals(tree) && p.isWritePermission()) return tree;
        return null;
    }

    private String displayName(Uri doc) {
        try (Cursor c = getContext().getContentResolver().query(doc, new String[] { DocumentsContract.Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception e) { /* unknown */ }
        return "";
    }

    /** The backup file inside the picked folder, created if asked. Returns null when it isn't there. */
    private Uri backupFile(Uri tree, boolean create) throws Exception {
        ContentResolver cr = getContext().getContentResolver();
        String parentId = DocumentsContract.getTreeDocumentId(tree);
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId);
        try (Cursor c = cr.query(children, new String[] { DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME }, null, null, null)) {
            while (c != null && c.moveToNext()) if (BACKUP_NAME.equals(c.getString(1))) return DocumentsContract.buildDocumentUriUsingTree(tree, c.getString(0));
        }
        if (!create) return null;
        return DocumentsContract.createDocument(cr, DocumentsContract.buildDocumentUriUsingTree(tree, parentId), "application/json", BACKUP_NAME);
    }

    private void writeText(Uri doc, String text) throws Exception {
        try (OutputStream out = getContext().getContentResolver().openOutputStream(doc, "wt")) {
            if (out == null) throw new Exception("The file couldn't be opened for writing");
            out.write(text.getBytes(StandardCharsets.UTF_8));
        }
    }
    private String readText(Uri doc) throws Exception {
        try (InputStream in = getContext().getContentResolver().openInputStream(doc)) {
            if (in == null) throw new Exception("The file couldn't be opened");
            java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
            byte[] b = new byte[64 * 1024]; int n;
            while ((n = in.read(b)) > 0) buf.write(b, 0, n);
            return new String(buf.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    @PluginMethod
    public void backupFolderInfo(PluginCall call) {
        JSObject r = new JSObject(); Uri tree = backupTree();
        r.put("set", tree != null);
        if (tree != null) r.put("name", displayName(DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))));
        r.put("lastWrite", prefs().getLong("lastWrite", 0));
        call.resolve(r);
    }

    @PluginMethod
    public void backupFolderPick(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(call, i, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData();
        if (d == null || d.getData() == null) { JSObject r = new JSObject(); r.put("set", false); call.resolve(r); return; }
        Uri tree = d.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            prefs().edit().putString("tree", tree.toString()).apply();
            JSObject r = new JSObject();
            r.put("set", true);
            r.put("name", displayName(DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))));
            Uri f = backupFile(tree, false);
            r.put("hasBackup", f != null);
            call.resolve(r);
        } catch (Exception e) { call.reject("The folder couldn't be used: " + describe(e)); }
    }

    @PluginMethod
    public void backupFolderWrite(PluginCall call) {
        Uri tree = backupTree();
        if (tree == null) { call.reject("No backup folder chosen"); return; }
        try {
            writeText(backupFile(tree, true), call.getString("data", ""));
            prefs().edit().putLong("lastWrite", System.currentTimeMillis()).apply();
            call.resolve();
        } catch (Exception e) { call.reject("The backup couldn't be written: " + describe(e)); }
    }

    @PluginMethod
    public void backupFolderRead(PluginCall call) {
        Uri tree = backupTree(); JSObject r = new JSObject();
        if (tree == null) { r.put("data", ""); call.resolve(r); return; }
        try { Uri f = backupFile(tree, false); r.put("data", f == null ? "" : readText(f)); call.resolve(r); }
        catch (Exception e) { call.reject("The backup couldn't be read: " + describe(e)); }
    }

    @PluginMethod
    public void backupExport(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE); i.setType(call.getString("mime", "application/json"));
        i.putExtra(Intent.EXTRA_TITLE, call.getString("name", BACKUP_NAME));
        startActivityForResult(call, i, "exportPicked");
    }

    @ActivityCallback
    private void exportPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData();
        if (d == null || d.getData() == null) { JSObject r = new JSObject(); r.put("saved", false); call.resolve(r); return; }
        try { writeText(d.getData(), call.getString("data", "")); JSObject r = new JSObject(); r.put("saved", true); call.resolve(r); }
        catch (Exception e) { call.reject("The backup file couldn't be saved: " + describe(e)); }
    }

    @PluginMethod
    public void backupImport(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "application/json", "text/plain", "application/octet-stream" });
        startActivityForResult(call, i, "importPicked");
    }

    @ActivityCallback
    private void importPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData(); JSObject r = new JSObject();
        if (d == null || d.getData() == null) { r.put("data", ""); call.resolve(r); return; }
        try { r.put("data", readText(d.getData())); call.resolve(r); }
        catch (Exception e) { call.reject("The backup file couldn't be read: " + describe(e)); }
    }

    /* ---------- Updates ---------- */

    private boolean canInstall() {
        return Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
    }

    @PluginMethod
    public void openInstallPermission(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject(describe(e)); }
    }

    /**
     * Downloads the APK at "url" and hands it to Android's package installer.
     * Progress is sent as "updateProgress" {pct}; the outcome as "updateResult"
     * {ok, status, code, message}. When the install succeeds Android restarts the app.
     */
    @PluginMethod
    public void installUpdate(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) { call.reject("No download address"); return; }
        if (!canInstall()) {
            JSObject r = new JSObject();
            r.put("started", false);
            r.put("needsPermission", true);
            call.resolve(r);
            return;
        }
        if (busy) { call.reject("An update is already being installed"); return; }
        busy = true;
        JSObject r = new JSObject();
        r.put("started", true);
        call.resolve(r);
        new Thread(() -> {
            String step = "download";
            try {
                File apk = download(url);
                step = "install";
                install(apk);
            } catch (Exception e) {
                busy = false;
                result(false, -1, step.equals("download") ? "DOWNLOAD_FAILED" : "INSTALL_SESSION_FAILED", describe(e));
            }
        }).start();
    }

    private File download(String url) throws Exception {
        File out = new File(getContext().getCacheDir(), "update.apk");
        HttpURLConnection c = null;
        String u = url;
        for (int hop = 0; hop < 6; hop++) {
            c = (HttpURLConnection) new URL(u).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("Accept", "application/octet-stream");
            int code = c.getResponseCode();
            if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) {
                u = new URL(new URL(u), c.getHeaderField("Location")).toString();
                c.disconnect();
                continue;
            }
            if (code != 200) throw new Exception("Download failed: HTTP " + code + " from " + new URL(u).getHost());
            break;
        }
        long total = c.getContentLengthLong();
        try (InputStream in = c.getInputStream(); OutputStream os = new FileOutputStream(out)) {
            byte[] buf = new byte[64 * 1024];
            long got = 0; int n, lastPct = -1;
            while ((n = in.read(buf)) > 0) {
                os.write(buf, 0, n);
                got += n;
                int pct = total > 0 ? (int) (got * 100 / total) : -1;
                if (pct != lastPct) {
                    lastPct = pct;
                    JSObject p = new JSObject();
                    p.put("pct", pct);
                    p.put("bytes", got);
                    notifyListeners("updateProgress", p);
                }
            }
            if (total > 0 && got != total) throw new Exception("Download incomplete: " + got + " of " + total + " bytes");
        } finally { c.disconnect(); }
        return out;
    }

    private void install(File apk) throws Exception {
        Context ctx = getContext().getApplicationContext();
        PackageInstaller pi = ctx.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(ctx.getPackageName());
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        int id = pi.createSession(params);
        try (PackageInstaller.Session s = pi.openSession(id)) {
            try (InputStream in = new FileInputStream(apk); OutputStream os = s.openWrite("app.apk", 0, apk.length())) {
                byte[] buf = new byte[64 * 1024]; int n;
                while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                s.fsync(os);
            }
            String action = ctx.getPackageName() + ACTION_STATUS;
            registerStatusReceiver(action);
            Intent i = new Intent(action).setPackage(ctx.getPackageName());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
            PendingIntent pend = PendingIntent.getBroadcast(ctx, id, i, flags);
            s.commit(pend.getIntentSender());
        }
    }

    private void registerStatusReceiver(String action) {
        if (statusReceiver != null) return;
        statusReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent intent) {
                int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
                if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                    Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                    if (confirm != null) {
                        confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        try { getActivity().startActivity(confirm); }
                        catch (Exception e) { busy = false; result(false, status, "CONFIRM_FAILED", describe(e)); }
                    }
                    return;
                }
                busy = false;
                String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
                String other = intent.getStringExtra(PackageInstaller.EXTRA_OTHER_PACKAGE_NAME);
                if (other != null) msg = (msg == null ? "" : msg + " ") + "(conflicts with " + other + ")";
                result(status == PackageInstaller.STATUS_SUCCESS, status, statusName(status), msg == null ? "" : msg);
            }
        };
        ContextCompat.registerReceiver(getContext().getApplicationContext(), statusReceiver, new IntentFilter(action), ContextCompat.RECEIVER_EXPORTED);
    }

    private void result(boolean ok, int status, String code, String message) {
        JSObject r = new JSObject();
        r.put("ok", ok);
        r.put("status", status);
        r.put("code", code);
        r.put("message", message);
        notifyListeners("updateResult", r, true);
    }

    static String statusName(int s) {
        switch (s) {
            case PackageInstaller.STATUS_SUCCESS: return "SUCCESS";
            case PackageInstaller.STATUS_FAILURE_ABORTED: return "FAILURE_ABORTED";
            case PackageInstaller.STATUS_FAILURE_BLOCKED: return "FAILURE_BLOCKED";
            case PackageInstaller.STATUS_FAILURE_CONFLICT: return "FAILURE_CONFLICT";
            case PackageInstaller.STATUS_FAILURE_INCOMPATIBLE: return "FAILURE_INCOMPATIBLE";
            case PackageInstaller.STATUS_FAILURE_INVALID: return "FAILURE_INVALID";
            case PackageInstaller.STATUS_FAILURE_STORAGE: return "FAILURE_STORAGE";
            case 8: return "FAILURE_TIMEOUT";
            default: return "FAILURE";
        }
    }

    static String describe(Throwable e) {
        String m = e.getMessage();
        return e.getClass().getSimpleName() + (m == null ? "" : ": " + m);
    }

    @Override
    protected void handleOnDestroy() {
        if (statusReceiver != null) {
            try { getContext().getApplicationContext().unregisterReceiver(statusReceiver); } catch (Exception ignored) { }
            statusReceiver = null;
        }
    }

    /* ---------- Home screen widget ---------- */

    /** The figures for the home screen widget (balance, next flight, aircraft in the air). */
    @PluginMethod
    public void widget(PluginCall call) {
        try {
            Context ctx = getContext();
            ctx.getSharedPreferences(StatusWidget.PREFS, Context.MODE_PRIVATE).edit()
                .putString("title", call.getString("title", ""))
                .putString("balance", call.getString("balance", ""))
                .putString("next", call.getString("next", ""))
                .putString("flying", call.getString("flying", ""))
                .apply();
            StatusWidget.refresh(ctx);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }
}

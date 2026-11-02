package __PACKAGE__;

// The web browser on the laptop in your office: a real web view laid over the laptop's screen in the app (the app
// tells it where, in its own pixels), with its own address, back and forward, and full screen for videos (a video
// that goes full screen covers the whole phone, and comes back into the laptop when it leaves full screen).
// Cookies are kept, so you stay signed in to the sites you use.

import android.graphics.Bitmap;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LapBrowser")
public class LapBrowserPlugin extends Plugin {
    private WebView web;
    private View full;
    private WebChromeClient.CustomViewCallback fullDone;

    private FrameLayout host() {
        View v = getBridge().getWebView();
        return (FrameLayout) v.getParent();
    }

    private void place(PluginCall call) {
        if (web == null) return;
        float k = call.getDouble("dpr", (double) getContext().getResources().getDisplayMetrics().density).floatValue();
        int x = Math.round(call.getDouble("x", 0.0).floatValue() * k), y = Math.round(call.getDouble("y", 0.0).floatValue() * k);
        int w = Math.max(1, Math.round(call.getDouble("w", 300.0).floatValue() * k)), h = Math.max(1, Math.round(call.getDouble("h", 200.0).floatValue() * k));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(w, h);
        lp.leftMargin = x; lp.topMargin = y;
        web.setLayoutParams(lp);
    }

    private void state(boolean loading) {
        if (web == null) return;
        JSObject o = new JSObject();
        o.put("url", web.getUrl() == null ? "" : web.getUrl());
        o.put("title", web.getTitle() == null ? "" : web.getTitle());
        o.put("canBack", web.canGoBack());
        o.put("canForward", web.canGoForward());
        o.put("loading", loading);
        o.put("progress", web.getProgress());
        notifyListeners("state", o);
    }

    @PluginMethod
    public void open(PluginCall call) {
        final String url = call.getString("url", "https://www.youtube.com");
        getActivity().runOnUiThread(() -> {
            if (web == null) {
                web = new WebView(getContext());
                web.setBackgroundColor(Color.WHITE);
                WebSettings s = web.getSettings();
                s.setJavaScriptEnabled(true);
                s.setDomStorageEnabled(true);
                s.setMediaPlaybackRequiresUserGesture(false);
                s.setLoadWithOverviewMode(true);
                s.setUseWideViewPort(true);
                s.setSupportZoom(true);
                s.setBuiltInZoomControls(true);
                s.setDisplayZoomControls(false);
                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
                web.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                        String u = r.getUrl().toString();
                        return !(u.startsWith("http://") || u.startsWith("https://"));   // only web pages, never other apps or files
                    }
                    @Override public void onPageStarted(WebView v, String u, Bitmap f) { state(true); }
                    @Override public void onPageFinished(WebView v, String u) { state(false); CookieManager.getInstance().flush(); }
                });
                web.setWebChromeClient(new WebChromeClient() {
                    @Override public void onProgressChanged(WebView v, int p) { state(p < 100); }
                    @Override public void onReceivedTitle(WebView v, String t) { state(v.getProgress() < 100); }
                    // a video in full screen: over the whole phone, until it leaves full screen
                    @Override public void onShowCustomView(View view, CustomViewCallback cb) {
                        if (full != null) { cb.onCustomViewHidden(); return; }
                        full = view; fullDone = cb;
                        ((ViewGroup) getActivity().getWindow().getDecorView()).addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                        JSObject o = new JSObject(); o.put("on", true); notifyListeners("fullscreen", o);
                    }
                    @Override public void onHideCustomView() { leaveFull(); }
                });
                host().addView(web);
            }
            place(call);
            web.setVisibility(View.VISIBLE);
            web.loadUrl(url);
            call.resolve();
        });
    }

    private void leaveFull() {
        if (full == null) return;
        ((ViewGroup) getActivity().getWindow().getDecorView()).removeView(full);
        full = null;
        if (fullDone != null) { fullDone.onCustomViewHidden(); fullDone = null; }
        JSObject o = new JSObject(); o.put("on", false); notifyListeners("fullscreen", o);
    }

    @PluginMethod
    public void setRect(PluginCall call) { getActivity().runOnUiThread(() -> { place(call); call.resolve(); }); }

    @PluginMethod
    public void go(PluginCall call) {
        final String url = call.getString("url", "");
        getActivity().runOnUiThread(() -> { if (web != null && (url.startsWith("http://") || url.startsWith("https://"))) web.loadUrl(url); call.resolve(); });
    }

    @PluginMethod
    public void back(PluginCall call) { getActivity().runOnUiThread(() -> { if (web != null && web.canGoBack()) web.goBack(); call.resolve(); }); }

    @PluginMethod
    public void forward(PluginCall call) { getActivity().runOnUiThread(() -> { if (web != null && web.canGoForward()) web.goForward(); call.resolve(); }); }

    @PluginMethod
    public void reload(PluginCall call) { getActivity().runOnUiThread(() -> { if (web != null) web.reload(); call.resolve(); }); }

    /** Out of sight while another app on the laptop is open (the page keeps its place). */
    @PluginMethod
    public void hide(PluginCall call) { getActivity().runOnUiThread(() -> { leaveFull(); if (web != null) { web.onPause(); web.setVisibility(View.GONE); } call.resolve(); }); }

    @PluginMethod
    public void show(PluginCall call) { getActivity().runOnUiThread(() -> { if (web != null) { web.onResume(); place(call); web.setVisibility(View.VISIBLE); } call.resolve(); }); }

    /** The laptop is closed: the page goes (signed-in sites stay signed in). */
    @PluginMethod
    public void close(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            leaveFull();
            if (web != null) { CookieManager.getInstance().flush(); host().removeView(web); web.destroy(); web = null; }
            call.resolve();
        });
    }
}

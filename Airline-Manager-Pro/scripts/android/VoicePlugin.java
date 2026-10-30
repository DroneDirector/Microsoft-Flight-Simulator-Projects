package __PACKAGE__;

// Voices for the people in the app. Downloads the voice pack once into the app's own files, and runs the
// voice model (Kokoro-82M, Apache License 2.0) with ONNX Runtime (MIT License) on the phone's processor
// cores, fully on the phone. Also speaks with the phone's own text-to-speech voice when the pack isn't
// there (yet).

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.LongBuffer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

@CapacitorPlugin(name = "Voice")
public class VoicePlugin extends Plugin {
    private final ExecutorService net = Executors.newSingleThreadExecutor();
    private final ExecutorService run = Executors.newSingleThreadExecutor();
    private volatile boolean cancel = false;
    private OrtEnvironment env;
    private OrtSession session;
    private final Map<String, float[]> voices = new HashMap<>();
    private TextToSpeech tts;
    private boolean ttsReady = false;

    private File dir() { File d = new File(getContext().getFilesDir(), "voice"); d.mkdirs(); return d; }

    /** What is downloaded: every file and its size, and where the folder is. */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject(), files = new JSObject();
        File[] l = dir().listFiles();
        if (l != null) for (File f : l) if (!f.getName().endsWith(".part")) files.put(f.getName(), f.length());
        r.put("dir", dir().getAbsolutePath());
        r.put("files", files);
        r.put("loaded", session != null);
        call.resolve(r);
    }

    /** Download the files that are missing or incomplete: [[name, size], ...] from base + name. */
    @PluginMethod
    public void download(PluginCall call) {
        final String base = call.getString("base", "");
        final JSArray list = call.getArray("files");
        cancel = false;
        call.setKeepAlive(true);
        net.execute(() -> {
            try {
                long total = 0, done = 0;
                for (int i = 0; i < list.length(); i++) total += Math.max(0, list.getJSONArray(i).getLong(1));
                for (int i = 0; i < list.length() && !cancel; i++) {
                    String name = list.getJSONArray(i).getString(0);
                    long size = list.getJSONArray(i).getLong(1);
                    if (name.contains("/") || name.contains("..")) continue;
                    File f = new File(dir(), name);
                    if (size >= 0 && f.exists() && f.length() == size) { done += size; progress(done, total, name); continue; }
                    File part = new File(dir(), name + ".part");
                    HttpURLConnection c = open(base + name, 0);
                    try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(part)) {
                        byte[] buf = new byte[1 << 16]; int n; long last = 0;
                        while ((n = in.read(buf)) > 0) {
                            if (cancel) break;
                            out.write(buf, 0, n); done += n;
                            if (done - last > 512 * 1024) { last = done; progress(done, total, name); }
                        }
                    } finally { c.disconnect(); }
                    if (cancel) { part.delete(); break; }
                    if (size >= 0 && part.length() != size) { part.delete(); throw new Exception(name + " was cut off (" + part.length() + " of " + size + " bytes)"); }
                    if (f.exists()) f.delete();
                    if (!part.renameTo(f)) throw new Exception("couldn't save " + name);
                    progress(done, total, name);
                }
                JSObject r = new JSObject(); r.put("done", !cancel); call.resolve(r);
            } catch (Exception e) {
                call.reject("The voices couldn't be downloaded: " + e.getMessage());
            } finally { call.setKeepAlive(false); }
        });
    }

    /** Follows redirects (GitHub hands downloads on to its file servers). */
    private HttpURLConnection open(String url, int hops) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(20000); c.setReadTimeout(60000);
        c.setRequestProperty("User-Agent", "AirlineManagerPro");
        int code = c.getResponseCode();
        if (code >= 300 && code < 400 && hops < 5) { String loc = c.getHeaderField("Location"); c.disconnect(); return open(new URL(new URL(url), loc).toString(), hops + 1); }
        if (code != 200) { c.disconnect(); throw new Exception("the server answered " + code + " for " + url.replaceAll("\\?.*", "")); }
        return c;
    }

    private void progress(long done, long total, String file) {
        JSObject p = new JSObject(); p.put("done", done); p.put("total", total); p.put("file", file);
        notifyListeners("progress", p);
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) { cancel = true; call.resolve(); }

    @PluginMethod
    public void remove(PluginCall call) {
        run.execute(() -> {
            try { if (session != null) session.close(); } catch (Exception e) { /* closed */ }
            session = null; voices.clear();
            File[] l = dir().listFiles(); if (l != null) for (File f : l) f.delete();
            call.resolve();
        });
    }

    /** Load the voice model (a second or two). */
    @PluginMethod
    public void load(PluginCall call) {
        final String model = call.getString("model", "kokoro-v1.0-q8.onnx");
        run.execute(() -> {
            try {
                if (session == null) {
                    env = OrtEnvironment.getEnvironment();
                    OrtSession.SessionOptions o = new OrtSession.SessionOptions();
                    int cores = Runtime.getRuntime().availableProcessors();
                    o.setIntraOpNumThreads(Math.max(1, Math.min(4, cores - 1)));
                    o.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
                    session = env.createSession(new File(dir(), model).getAbsolutePath(), o);
                }
                JSObject r = new JSObject(); r.put("ok", true); call.resolve(r);
            } catch (Throwable e) { call.reject("The voice model couldn't be loaded: " + e.getMessage()); }
        });
    }

    private float[] voice(String name) throws Exception {
        float[] v = voices.get(name);
        if (v != null) return v;
        File f = new File(dir(), "voice-" + name + ".bin");
        byte[] b = new byte[(int) f.length()];
        try (FileInputStream in = new FileInputStream(f)) { int off = 0, n; while (off < b.length && (n = in.read(b, off, b.length - off)) > 0) off += n; }
        v = new float[b.length / 4];
        ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer().get(v);
        voices.put(name, v);
        return v;
    }

    /** Speak one sentence: the sound ids in, 24 kHz 16-bit audio out (base64). */
    @PluginMethod
    public void synth(PluginCall call) {
        final JSArray ids = call.getArray("ids");
        final String name = call.getString("voice", "bm_george");
        final float speed = call.getFloat("speed", 1f);
        run.execute(() -> {
            try {
                if (session == null) throw new Exception("the voice model isn't loaded");
                int n = Math.min(ids.length(), 509);
                long[] tok = new long[n + 2];
                for (int i = 0; i < n; i++) tok[i + 1] = ids.getLong(i);
                float[] v = voice(name), style = new float[256];
                System.arraycopy(v, n * 256, style, 0, 256);
                long t0 = System.currentTimeMillis();
                float[] audio;
                try (OnnxTensor a = OnnxTensor.createTensor(env, LongBuffer.wrap(tok), new long[]{1, tok.length});
                     OnnxTensor s = OnnxTensor.createTensor(env, FloatBuffer.wrap(style), new long[]{1, 256});
                     OnnxTensor sp = OnnxTensor.createTensor(env, FloatBuffer.wrap(new float[]{speed}), new long[]{1})) {
                    Map<String, OnnxTensor> in = new HashMap<>();
                    in.put("tokens", a); in.put("style", s); in.put("speed", sp);
                    try (OrtSession.Result r = session.run(in)) {
                        Object o = r.get(0).getValue();
                        audio = o instanceof float[] ? (float[]) o : ((float[][]) o)[0];
                    }
                }
                ByteBuffer pcm = ByteBuffer.allocate(audio.length * 2).order(ByteOrder.LITTLE_ENDIAN);
                for (float x : audio) pcm.putShort((short) Math.max(-32767, Math.min(32767, Math.round(x * 32767))));
                JSObject r = new JSObject();
                r.put("pcm", Base64.encodeToString(pcm.array(), Base64.NO_WRAP));
                r.put("rate", 24000);
                r.put("ms", System.currentTimeMillis() - t0);
                call.resolve(r);
            } catch (Throwable e) { call.reject("The voice couldn't speak: " + e.getMessage()); }
        });
    }

    /* ---------- the phone's own voice, until the voice pack is downloaded ---------- */
    @PluginMethod
    public void speakDevice(PluginCall call) {
        final String text = call.getString("text", "");
        final float pitch = call.getFloat("pitch", 1f), rate = call.getFloat("rate", 1f);
        final String lang = call.getString("lang", "en-GB");
        Runnable go = () -> {
            tts.setLanguage(Locale.forLanguageTag(lang));
            tts.setPitch(pitch); tts.setSpeechRate(rate);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { notifyListeners("deviceDone", new JSObject()); }
                @Override public void onError(String id) { notifyListeners("deviceDone", new JSObject()); }
            });
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "amp");
            call.resolve();
        };
        if (tts != null && ttsReady) { go.run(); return; }
        tts = new TextToSpeech(getContext(), st -> {
            ttsReady = st == TextToSpeech.SUCCESS;
            if (ttsReady) go.run(); else call.reject("The phone has no voice for speech");
        });
    }

    @PluginMethod
    public void stopDevice(PluginCall call) { if (tts != null) tts.stop(); call.resolve(); }
}

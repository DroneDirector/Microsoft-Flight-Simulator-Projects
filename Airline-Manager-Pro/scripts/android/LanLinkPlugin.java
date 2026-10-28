package __PACKAGE__;

import android.Manifest;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.DhcpInfo;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * Local Wi-Fi helpers for linking to the Airline Manager Pro PC app:
 * the Wi-Fi network name, signal and this phone's address, and UDP discovery of PCs on the network.
 */
@CapacitorPlugin(
    name = "LanLink",
    permissions = { @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }) }
)
public class LanLinkPlugin extends Plugin {

    private static final int DISCOVERY_PORT = 47611;

    @PluginMethod
    public void wifiInfo(PluginCall call) {
        if (call.getBoolean("askLocation", false) && getPermissionState("location") != PermissionState.GRANTED && !getActivity().isFinishing()) {
            requestPermissionForAlias("location", call, "wifiInfoAfterPermission");
            return;
        }
        call.resolve(readWifi());
    }

    @PermissionCallback
    private void wifiInfoAfterPermission(PluginCall call) {
        call.resolve(readWifi());
    }

    private JSObject readWifi() {
        JSObject r = new JSObject();
        Context ctx = getContext().getApplicationContext();
        boolean wifi = false, cellular = false;
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            for (Network n : cm.getAllNetworks()) {
                NetworkCapabilities c = cm.getNetworkCapabilities(n);
                if (c == null) continue;
                if (c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) wifi = true;
                if (c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) cellular = true;
            }
        } catch (Exception ignored) { }
        String ssid = "", ip = "";
        int level = 0;
        try {
            WifiManager wm = (WifiManager) ctx.getSystemService(Context.WIFI_SERVICE);
            WifiInfo wi = wm.getConnectionInfo();
            if (wi != null) {
                String s = wi.getSSID();
                if (s != null && !s.contains("unknown ssid")) ssid = s.replace("\"", "");
                level = WifiManager.calculateSignalLevel(wi.getRssi(), 5);
                ip = intToIp(wi.getIpAddress());
            }
        } catch (Exception ignored) { }
        r.put("wifi", wifi);
        r.put("cellular", cellular);
        r.put("ssid", ssid);
        r.put("ip", "0.0.0.0".equals(ip) ? "" : ip);
        r.put("level", level);
        return r;
    }

    @PluginMethod
    public void discover(PluginCall call) {
        final int timeout = call.getInt("timeout", 1800);
        new Thread(() -> {
            JSArray pcs = new JSArray();
            Set<String> seen = new HashSet<>();
            WifiManager.MulticastLock lock = null;
            DatagramSocket sock = null;
            try {
                WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                lock = wm.createMulticastLock("amp-discovery");
                lock.setReferenceCounted(false);
                lock.acquire();
                sock = new DatagramSocket();
                sock.setBroadcast(true);
                sock.setSoTimeout(250);
                byte[] ask = "AMP?".getBytes(StandardCharsets.UTF_8);
                Set<String> targets = new HashSet<>();
                targets.add("255.255.255.255");
                DhcpInfo d = wm.getDhcpInfo();
                if (d != null && d.netmask != 0) targets.add(intToIp((d.ipAddress & d.netmask) | ~d.netmask));
                long end = System.currentTimeMillis() + timeout;
                long nextSend = 0;
                byte[] buf = new byte[2048];
                while (System.currentTimeMillis() < end) {
                    if (System.currentTimeMillis() >= nextSend) {
                        for (String t : targets) {
                            try { sock.send(new DatagramPacket(ask, ask.length, InetAddress.getByName(t), DISCOVERY_PORT)); } catch (Exception ignored) { }
                        }
                        nextSend = System.currentTimeMillis() + 600;
                    }
                    try {
                        DatagramPacket p = new DatagramPacket(buf, buf.length);
                        sock.receive(p);
                        String msg = new String(p.getData(), 0, p.getLength(), StandardCharsets.UTF_8);
                        if (!msg.startsWith("AMP!")) continue;
                        JSONObject j = new JSONObject(msg.substring(4));
                        String from = p.getAddress().getHostAddress();
                        if (seen.contains(from)) continue;
                        seen.add(from);
                        JSObject pc = new JSObject();
                        pc.put("pcName", j.optString("pcName", from));
                        pc.put("ip", from);
                        pc.put("version", j.optString("version", ""));
                        pc.put("port", j.optInt("port", 47610));
                        pcs.put(pc);
                    } catch (SocketTimeoutException ignored) { }
                }
            } catch (Exception ignored) {
            } finally {
                if (sock != null) sock.close();
                if (lock != null && lock.isHeld()) lock.release();
            }
            JSObject r = new JSObject();
            r.put("pcs", pcs);
            call.resolve(r);
        }).start();
    }

    private static String intToIp(int i) {
        return (i & 0xFF) + "." + ((i >> 8) & 0xFF) + "." + ((i >> 16) & 0xFF) + "." + ((i >> 24) & 0xFF);
    }
}
